import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { UPDATE_LOGS, UpdateLogEntry, getLatestUpdateLog } from '../data/updateLogs';
import { externalAxiosOptions } from './httpDefaults';

// Default from TF2Autobot v15 discordWebhook.embedColor
const DEFAULT_EMBED_COLOR = Number(process.env.DISCORD_EMBED_COLOR) || 9171753;
const REPO_URL = process.env.PANEL_GITHUB_REPO
	? `https://github.com/${process.env.PANEL_GITHUB_REPO}`
	: 'https://github.com/uwu6967/tf2autobot-gui-panel';
const BOT_REPO_URL = 'https://github.com/uwu6967/tf2autobot-pricedb';
const NOTIFY_FILE = path.join(process.cwd(), 'data', 'discord-notified.json');

interface NotifyState {
	version: string;
	sentAt: string;
}

export function getUpdateLogForVersion(version: string): UpdateLogEntry | undefined {
	return UPDATE_LOGS.find((entry) => entry.version === version);
}

function formatChangesList(changes: string[]): string {
	return changes.map((line) => `• ${line}`).join('\n');
}

export function buildDiscordUpdatePayload(version: string, log: UpdateLogEntry): Record<string, unknown> {
	const changesText = formatChangesList(log.changes);
	const trimmedChanges = changesText.length > 1024 ? `${changesText.slice(0, 1021)}...` : changesText;
	const displayName = process.env.DISCORD_WEBHOOK_NAME?.trim() || 'TF2Autobot GUI';
	const avatarUrl = process.env.DISCORD_WEBHOOK_AVATAR?.trim()
		|| 'https://wiki.teamfortress.com/w/images/3/36/150px-Heavyuberupdate.png';

	return {
		username: displayName,
		avatar_url: avatarUrl,
		embeds: [
			{
				color: DEFAULT_EMBED_COLOR,
				author: {
					name: displayName,
					icon_url: avatarUrl
				},
				title: `TF2Autobot GUI v${version}`,
				description: `**${log.title}**`,
				fields: [
					{
						name: '__What\'s New__',
						value: trimmedChanges || 'No changelog recorded.',
						inline: false
					},
					{
						name: '__Recommended Bot__',
						value: `[tf2autobot-pricedb](${BOT_REPO_URL})`,
						inline: true
					},
					{
						name: '__Panel Release__',
						value: `[View on GitHub](${REPO_URL}/releases/tag/v${version})`,
						inline: true
					}
				],
				footer: {
					text: `TF2Autobot GUI Panel • v${version}`
				},
				timestamp: new Date(`${log.date}T12:00:00.000Z`).toISOString()
			}
		]
	};
}

async function readNotifyState(): Promise<NotifyState | null> {
	try {
		if (!(await fs.pathExists(NOTIFY_FILE))) {
			return null;
		}

		return await fs.readJson(NOTIFY_FILE) as NotifyState;
	} catch {
		return null;
	}
}

async function writeNotifyState(version: string): Promise<void> {
	await fs.ensureDir(path.dirname(NOTIFY_FILE));
	await fs.writeJson(
		NOTIFY_FILE,
		{
			version,
			sentAt: new Date().toISOString()
		} as NotifyState,
		{ spaces: 2 }
	);
}

export async function notifyDiscordVersionUpdate(version: string, options: { force?: boolean } = {}): Promise<boolean> {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();

	if (!webhookUrl) {
		return false;
	}

	if (process.env.DISCORD_WEBHOOK_ENABLED === 'false') {
		return false;
	}

	const force = options.force === true;
	const always = process.env.DISCORD_WEBHOOK_ALWAYS === 'true';

	if (!force && !always) {
		const last = await readNotifyState();
		if (last?.version === version) {
			return false;
		}
	}

	const log = getUpdateLogForVersion(version) ?? getLatestUpdateLog();
	if (!log) {
		console.warn(`No update log found for v${version}; skipping Discord webhook.`);
		return false;
	}

	try {
		const payload = buildDiscordUpdatePayload(version, log);
		await axios.post(webhookUrl, payload, {
			timeout: 12000,
			headers: {
				'Content-Type': 'application/json'
			},
			...externalAxiosOptions()
		});

		await writeNotifyState(version);
		console.log(`Discord update webhook sent for v${version}.`);
		return true;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`Failed to send Discord update webhook: ${message}`);
		return false;
	}
}
