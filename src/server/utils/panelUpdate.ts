import path from 'path';
import fs from 'fs-extra';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { apiRequest } from './apiRequest';
import { compareVersions } from './compareVersions';

const execFileAsync = promisify(execFile);

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'panel-update.json');
const JOB_PATH = path.join(DATA_DIR, 'panel-update-job.json');
const LOG_PATH = path.join(DATA_DIR, 'panel-update.log');

const DEFAULT_REPO = 'uwu6967/tf2autobot-gui-panel';
const DEFAULT_BRANCH = 'main';

export interface PanelUpdateSettings {
    autoCheck: boolean;
    autoUpdate: boolean;
    checkIntervalHours: number;
}

export interface GitStatus {
    isRepo: boolean;
    branch: string | null;
    commit: string | null;
    dirty: boolean;
    behind: number | null;
    error?: string;
}

export interface UpdateCheckResult {
    currentVersion: string;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string | null;
    releaseNotes: string | null;
    publishedAt: string | null;
    git: GitStatus;
    settings: PanelUpdateSettings;
    lastCheckAt: number | null;
    updateInProgress: boolean;
    lastUpdateError: string | null;
    lastUpdateFinishedAt: number | null;
}

interface GithubRelease {
    tag_name: string;
    html_url: string;
    body: string;
    published_at: string;
}

interface PanelUpdateState {
    settings: PanelUpdateSettings;
    lastCheckAt: number | null;
    lastCheckResult: Omit<UpdateCheckResult, 'settings' | 'lastCheckAt' | 'updateInProgress' | 'lastUpdateError' | 'lastUpdateFinishedAt'> | null;
    lastUpdateError: string | null;
    lastUpdateFinishedAt: number | null;
}

interface UpdateJob {
    status: 'idle' | 'running' | 'done' | 'failed';
    startedAt?: number;
    finishedAt?: number;
    error?: string;
}

const defaultSettings: PanelUpdateSettings = {
    autoCheck: process.env.PANEL_AUTO_CHECK === 'true',
    autoUpdate: process.env.PANEL_AUTO_UPDATE === 'true',
    checkIntervalHours: Number(process.env.PANEL_CHECK_INTERVAL_HOURS) || 6
};

let updateInProgress = false;

function getPackageVersion(): string {
    const pkg = require(path.join(process.cwd(), 'package.json'));
    return pkg.version as string;
}

function getGithubRepo(): string {
    return process.env.PANEL_GITHUB_REPO || DEFAULT_REPO;
}

function getGitBranch(): string {
    return process.env.PANEL_GIT_BRANCH || DEFAULT_BRANCH;
}

async function runGit(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
        cwd: process.cwd(),
        timeout: 120000,
        maxBuffer: 1024 * 1024
    });
    return stdout.trim();
}

async function getGitStatus(): Promise<GitStatus> {
    const gitDir = path.join(process.cwd(), '.git');
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
        const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
        const commit = await runGit(['rev-parse', '--short', 'HEAD']);
        const dirty = (await runGit(['status', '--porcelain'])).length > 0;

        let behind: number | null = null;
        try {
            await runGit(['fetch', 'origin', getGitBranch(), '--quiet']);
            const count = await runGit(['rev-list', '--count', `HEAD..origin/${getGitBranch()}`]);
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

async function fetchLatestRelease(): Promise<GithubRelease | null> {
    const repo = getGithubRepo();
    try {
        return await apiRequest<GithubRelease>(
            'GET',
            `https://api.github.com/repos/${repo}/releases/latest`,
            undefined,
            undefined,
            {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'TF2Autobot-Panel'
            }
        );
    } catch {
        return null;
    }
}

async function loadState(): Promise<PanelUpdateState> {
    await fs.ensureDir(DATA_DIR);

    if (!await fs.pathExists(SETTINGS_PATH)) {
        return {
            settings: { ...defaultSettings },
            lastCheckAt: null,
            lastCheckResult: null,
            lastUpdateError: null,
            lastUpdateFinishedAt: null
        };
    }

    const state = await fs.readJson(SETTINGS_PATH) as Partial<PanelUpdateState>;
    return {
        settings: {
            autoCheck: state.settings?.autoCheck ?? defaultSettings.autoCheck,
            autoUpdate: state.settings?.autoUpdate ?? defaultSettings.autoUpdate,
            checkIntervalHours: state.settings?.checkIntervalHours ?? defaultSettings.checkIntervalHours
        },
        lastCheckAt: state.lastCheckAt ?? null,
        lastCheckResult: state.lastCheckResult ?? null,
        lastUpdateError: state.lastUpdateError ?? null,
        lastUpdateFinishedAt: state.lastUpdateFinishedAt ?? null
    };
}

async function saveState(state: PanelUpdateState): Promise<void> {
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

export async function getPanelUpdateSettings(): Promise<PanelUpdateSettings> {
    const state = await loadState();
    return state.settings;
}

export async function savePanelUpdateSettings(settings: Partial<PanelUpdateSettings>): Promise<PanelUpdateSettings> {
    const state = await loadState();
    state.settings = {
        ...state.settings,
        ...settings,
        checkIntervalHours: Math.min(168, Math.max(1, settings.checkIntervalHours ?? state.settings.checkIntervalHours))
    };
    await saveState(state);
    return state.settings;
}

export async function checkForPanelUpdate(force = false): Promise<UpdateCheckResult> {
    const state = await loadState();
    const currentVersion = getPackageVersion();
    const git = await getGitStatus();
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

    const shouldFetch = force || !state.lastCheckAt || Date.now() - state.lastCheckAt > 5 * 60 * 1000;

    if (shouldFetch) {
        const release = await fetchLatestRelease();
        if (release) {
            latestVersion = normalizeTag(release.tag_name);
            releaseUrl = release.html_url;
            releaseNotes = release.body;
            publishedAt = release.published_at;
        }
    }

    const updateAvailable = latestVersion
        ? compareVersions(latestVersion, currentVersion) > 0 || (git.behind !== null && git.behind > 0)
        : git.behind !== null && git.behind > 0;

    const result: UpdateCheckResult = {
        currentVersion,
        latestVersion,
        updateAvailable,
        releaseUrl,
        releaseNotes,
        publishedAt,
        git,
        settings: state.settings,
        lastCheckAt: shouldFetch ? Date.now() : state.lastCheckAt,
        updateInProgress,
        lastUpdateError: state.lastUpdateError,
        lastUpdateFinishedAt: state.lastUpdateFinishedAt
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
            git: result.git
        };
        await saveState(state);
    }

    return result;
}

export async function getUpdateJobStatus(): Promise<{ job: UpdateJob; logTail: string }> {
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

export function isUpdateInProgress(): boolean {
    return updateInProgress;
}

export async function applyPanelUpdate(): Promise<{ started: boolean; message: string }> {
    if (updateInProgress) {
        return { started: false, message: 'An update is already running.' };
    }

    const status = await checkForPanelUpdate(true);
    if (!status.git.isRepo) {
        return { started: false, message: 'Panel is not installed from git — update manually.' };
    }

    if (status.git.dirty) {
        return { started: false, message: 'Working tree has local changes. Commit or stash them before updating.' };
    }

    if (!status.updateAvailable) {
        return { started: false, message: 'Panel is already up to date.' };
    }

    const isWin = process.platform === 'win32';
    const scriptName = isWin ? 'update-panel.ps1' : 'update-panel.sh';
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

    if (!await fs.pathExists(scriptPath)) {
        return { started: false, message: `Update script not found: scripts/${scriptName}` };
    }

    await fs.ensureDir(DATA_DIR);
    await fs.writeJson(JOB_PATH, {
        status: 'running',
        startedAt: Date.now()
    }, { spaces: 2 });
    await fs.writeFile(LOG_PATH, `[${new Date().toISOString()}] Update started\n`);

    updateInProgress = true;

    const child = isWin
        ? spawn(
            'powershell',
            ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
            { detached: true, stdio: 'ignore', cwd: process.cwd(), env: process.env }
        )
        : spawn(
            'bash',
            [scriptPath],
            { detached: true, stdio: 'ignore', cwd: process.cwd(), env: process.env }
        );

    child.unref();

    const state = await loadState();
    state.lastUpdateError = null;
    await saveState(state);

    return {
        started: true,
        message: 'Update started. The panel will restart automatically if PM2 is configured.'
    };
}
