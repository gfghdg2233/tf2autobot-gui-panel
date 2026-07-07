import path from 'path';
import fs from 'fs-extra';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { apiRequest } from './apiRequest';
import { compareVersions } from './compareVersions';
import type { GitStatus } from './panelUpdate';

const execFileAsync = promisify(execFile);

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'bot-update.json');
const JOB_PATH = path.join(DATA_DIR, 'bot-update-job.json');
const LOG_PATH = path.join(DATA_DIR, 'bot-update.log');

const DEFAULT_REPO = 'uwu6967/tf2autobot-pricedb';
const DEFAULT_BRANCH = 'master';

export interface BotUpdateCheckResult {
    currentVersion: string | null;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string | null;
    releaseNotes: string | null;
    publishedAt: string | null;
    botDir: string;
    botFound: boolean;
    git: GitStatus;
    lastCheckAt: number | null;
    updateInProgress: boolean;
    lastUpdateError: string | null;
    lastUpdateFinishedAt: number | null;
    updateMessage: string | null;
}

interface GithubRelease {
    tag_name: string;
    html_url: string;
    body: string;
    published_at: string;
}

interface BotPackageJson {
    version?: string;
    updateMessage?: string;
}

interface BotUpdateState {
    lastCheckAt: number | null;
    lastCheckResult: Omit<BotUpdateCheckResult, 'lastCheckAt' | 'updateInProgress' | 'lastUpdateError' | 'lastUpdateFinishedAt'> | null;
    lastUpdateError: string | null;
    lastUpdateFinishedAt: number | null;
}

interface UpdateJob {
    status: 'idle' | 'running' | 'done' | 'failed';
    startedAt?: number;
    finishedAt?: number;
    error?: string;
}

let updateInProgress = false;

export function getBotDir(): string {
    if (process.env.BOT_DIR) {
        return path.resolve(process.env.BOT_DIR);
    }

    return path.resolve(process.cwd(), '..', 'tf2autobot');
}

function getGithubRepo(): string {
    return process.env.BOT_GITHUB_REPO || DEFAULT_REPO;
}

function getGitBranch(): string {
    return process.env.BOT_GIT_BRANCH || DEFAULT_BRANCH;
}

function getPm2Name(): string {
    return process.env.BOT_PM2_NAME || 'thebot';
}

async function runGit(args: string[], cwd: string): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
        cwd,
        timeout: 120000,
        maxBuffer: 1024 * 1024
    });
    return stdout.trim();
}

async function getBotGitStatus(botDir: string): Promise<GitStatus> {
    const gitDir = path.join(botDir, '.git');
    if (!await fs.pathExists(gitDir)) {
        return {
            isRepo: false,
            branch: null,
            commit: null,
            dirty: false,
            behind: null,
            error: 'Not a git repository'
        };
    }

    try {
        const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], botDir);
        const commit = await runGit(['rev-parse', '--short', 'HEAD'], botDir);
        const dirty = (await runGit(['status', '--porcelain'], botDir)).length > 0;

        let behind: number | null = null;
        try {
            await runGit(['fetch', 'origin', getGitBranch(), '--quiet'], botDir);
            const count = await runGit(['rev-list', '--count', `HEAD..origin/${getGitBranch()}`], botDir);
            behind = Number(count);
            if (Number.isNaN(behind)) {
                behind = null;
            }
        } catch {
            behind = null;
        }

        return { isRepo: true, branch, commit, dirty, behind };
    } catch (err) {
        return {
            isRepo: true,
            branch: null,
            commit: null,
            dirty: false,
            behind: null,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

async function readBotPackageVersion(botDir: string): Promise<string | null> {
    const pkgPath = path.join(botDir, 'package.json');
    if (!await fs.pathExists(pkgPath)) {
        return null;
    }

    try {
        const pkg = await fs.readJson(pkgPath) as BotPackageJson;
        return pkg.version ?? null;
    } catch {
        return null;
    }
}

async function fetchLatestBotRelease(): Promise<{ release: GithubRelease | null; updateMessage: string | null }> {
    const repo = getGithubRepo();

    try {
        const remotePkg = await apiRequest<BotPackageJson>(
            'GET',
            `https://raw.githubusercontent.com/${repo}/${getGitBranch()}/package.json`,
            undefined,
            undefined,
            { 'User-Agent': 'TF2Autobot-Panel' }
        );

        const release = await apiRequest<GithubRelease>(
            'GET',
            `https://api.github.com/repos/${repo}/releases/latest`,
            undefined,
            undefined,
            {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'TF2Autobot-Panel'
            }
        ).catch(() => null);

        if (release) {
            return { release, updateMessage: remotePkg.updateMessage ?? null };
        }

        if (remotePkg.version) {
            return {
                release: {
                    tag_name: `v${remotePkg.version}`,
                    html_url: `https://github.com/${repo}/releases`,
                    body: remotePkg.updateMessage ?? '',
                    published_at: ''
                },
                updateMessage: remotePkg.updateMessage ?? null
            };
        }
    } catch {
        // fall through
    }

    return { release: null, updateMessage: null };
}

async function loadState(): Promise<BotUpdateState> {
    await fs.ensureDir(DATA_DIR);

    if (!await fs.pathExists(SETTINGS_PATH)) {
        return {
            lastCheckAt: null,
            lastCheckResult: null,
            lastUpdateError: null,
            lastUpdateFinishedAt: null
        };
    }

    try {
        return await fs.readJson(SETTINGS_PATH) as BotUpdateState;
    } catch {
        return {
            lastCheckAt: null,
            lastCheckResult: null,
            lastUpdateError: null,
            lastUpdateFinishedAt: null
        };
    }
}

async function saveState(state: BotUpdateState): Promise<void> {
    await fs.ensureDir(DATA_DIR);
    await fs.writeJson(SETTINGS_PATH, state, { spaces: 2 });
}

async function readJob(): Promise<UpdateJob> {
    if (!await fs.pathExists(JOB_PATH)) {
        return { status: 'idle' };
    }

    try {
        return await fs.readJson(JOB_PATH) as UpdateJob;
    } catch {
        return { status: 'idle' };
    }
}

function normalizeTag(tag: string): string {
    return tag.replace(/^v/i, '');
}

export async function checkForBotUpdate(force = false): Promise<BotUpdateCheckResult> {
    const state = await loadState();
    const botDir = getBotDir();
    const botFound = await fs.pathExists(botDir);
    const currentVersion = botFound ? await readBotPackageVersion(botDir) : null;
    const git = botFound ? await getBotGitStatus(botDir) : {
        isRepo: false,
        branch: null,
        commit: null,
        dirty: false,
        behind: null,
        error: 'Bot directory not found'
    };
    const job = await readJob();

    if (job.status === 'running') {
        updateInProgress = true;
    } else if (job.status === 'failed') {
        updateInProgress = false;
        state.lastUpdateError = job.error || 'Update failed';
        state.lastUpdateFinishedAt = job.finishedAt ?? Date.now();
    } else if (job.status === 'done') {
        updateInProgress = false;
        state.lastUpdateError = null;
        state.lastUpdateFinishedAt = job.finishedAt ?? Date.now();
    }

    let latestVersion: string | null = state.lastCheckResult?.latestVersion ?? null;
    let releaseUrl: string | null = state.lastCheckResult?.releaseUrl ?? null;
    let releaseNotes: string | null = state.lastCheckResult?.releaseNotes ?? null;
    let publishedAt: string | null = state.lastCheckResult?.publishedAt ?? null;
    let updateMessage: string | null = state.lastCheckResult?.updateMessage ?? null;

    const shouldFetch = force || !state.lastCheckAt || Date.now() - state.lastCheckAt > 5 * 60 * 1000;

    if (shouldFetch && botFound) {
        const { release, updateMessage: remoteMessage } = await fetchLatestBotRelease();
        updateMessage = remoteMessage;
        if (release) {
            latestVersion = normalizeTag(release.tag_name);
            releaseUrl = release.html_url;
            releaseNotes = release.body;
            publishedAt = release.published_at || null;
        }
    }

    const updateAvailable = currentVersion && latestVersion
        ? compareVersions(latestVersion, currentVersion) > 0 || (git.behind !== null && git.behind > 0)
        : git.behind !== null && git.behind > 0;

    const result: BotUpdateCheckResult = {
        currentVersion,
        latestVersion,
        updateAvailable,
        releaseUrl,
        releaseNotes,
        publishedAt,
        botDir,
        botFound,
        git,
        lastCheckAt: shouldFetch ? Date.now() : state.lastCheckAt,
        updateInProgress,
        lastUpdateError: state.lastUpdateError,
        lastUpdateFinishedAt: state.lastUpdateFinishedAt,
        updateMessage
    };

    if (shouldFetch) {
        state.lastCheckAt = result.lastCheckAt;
        state.lastCheckResult = {
            currentVersion: result.currentVersion,
            latestVersion: result.latestVersion,
            updateAvailable: result.updateAvailable,
            releaseUrl: result.releaseUrl,
            releaseNotes: result.releaseNotes,
            publishedAt: result.publishedAt,
            botDir: result.botDir,
            botFound: result.botFound,
            git: result.git,
            updateMessage: result.updateMessage
        };
        await saveState(state);
    }

    return result;
}

export async function getBotUpdateJobStatus(): Promise<{ job: UpdateJob; logTail: string }> {
    const job = await readJob();
    let logTail = '';

    if (await fs.pathExists(LOG_PATH)) {
        const log = await fs.readFile(LOG_PATH, 'utf8');
        logTail = log.split('\n').slice(-40).join('\n').trim();
    }

    if (job.status === 'running' || job.status === 'done' || job.status === 'failed') {
        updateInProgress = job.status === 'running';
    }

    return { job, logTail };
}

export function isBotUpdateInProgress(): boolean {
    return updateInProgress;
}

export async function applyBotUpdate(): Promise<{ started: boolean; message: string }> {
    if (updateInProgress) {
        return { started: false, message: 'A bot update is already running.' };
    }

    const status = await checkForBotUpdate(true);
    if (!status.botFound) {
        return { started: false, message: `Bot directory not found: ${status.botDir}` };
    }

    if (!status.git.isRepo) {
        return { started: false, message: 'Bot is not installed from git — update manually.' };
    }

    if (status.git.dirty) {
        return { started: false, message: 'Bot working tree has local changes. Commit or stash them before updating.' };
    }

    if (!status.updateAvailable) {
        return { started: false, message: 'Bot is already up to date.' };
    }

    const isWin = process.platform === 'win32';
    const scriptName = isWin ? 'update-bot.ps1' : 'update-bot.sh';
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

    if (!await fs.pathExists(scriptPath)) {
        return { started: false, message: `Update script not found: scripts/${scriptName}` };
    }

    await fs.ensureDir(DATA_DIR);
    await fs.writeJson(JOB_PATH, {
        status: 'running',
        startedAt: Date.now()
    }, { spaces: 2 });
    await fs.writeFile(LOG_PATH, `[${new Date().toISOString()}] Bot update started\n`);

    updateInProgress = true;

    const child = isWin
        ? spawn(
            'powershell',
            ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
            {
                detached: true,
                stdio: 'ignore',
                cwd: process.cwd(),
                env: { ...process.env, BOT_DIR: status.botDir, BOT_PM2_NAME: getPm2Name() }
            }
        )
        : spawn(
            'bash',
            [scriptPath],
            {
                detached: true,
                stdio: 'ignore',
                cwd: process.cwd(),
                env: { ...process.env, BOT_DIR: status.botDir, BOT_PM2_NAME: getPm2Name() }
            }
        );

    child.unref();

    const state = await loadState();
    state.lastUpdateError = null;
    await saveState(state);

    return {
        started: true,
        message: 'Bot update started. Restart the bot manually if PM2 is not configured.'
    };
}
