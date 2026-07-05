export interface UpdateLogEntry {
	version: string;
	date: string;
	title: string;
	changes: string[];
}

export const UPDATE_LOGS: UpdateLogEntry[] = [
	{
		version: '3.4.2',
		date: '2026-07-05',
		title: 'Trade Discord webhook preview and docs',
		changes: [
			'Trades page shows a Discord-style preview matching tf2autobot-pricedb trade-summary embeds',
			'Documented bot trade webhook setup in patches/tf2autobot/DISCORD_WEBHOOKS.md',
			'Clarified difference between bot trade webhooks (Settings) and GUI version webhooks (.env)'
		]
	},
	{
		version: '3.4.1',
		date: '2026-07-05',
		title: 'Discord update webhook restored',
		changes: [
			'Restored Mann Co. styled Discord webhook embeds for GUI version updates',
			'Optional DISCORD_WEBHOOK_URL posts once per new version on panel startup',
			'npm run notify-discord command for manual release announcements',
			'Update Logs page now shows a Discord-style preview of the latest release embed'
		]
	},
	{
		version: '3.4.0',
		date: '2026-07-05',
		title: 'Theme selector and color palettes',
		changes: [
			'Added theme picker in the header with 11 color palettes',
			'Mann Co., BLU Base, RED Fortress, Australium, Neon Grid, and more',
			'Theme choice is saved in your browser via localStorage',
			'Header, navigation, panels, and accents adapt to each theme'
		]
	},
	{
		version: '3.3.3',
		date: '2026-07-05',
		title: 'Stability and settings fixes',
		changes: [
			'Fix settings save on webhook URLs',
			'Switch key price source to pricedb.io',
			'Add IPC response queue',
			'Release notes page for version history'
		]
	},
	{
		version: '3.3.0',
		date: '2026-07-05',
		title: 'TF2-themed UI redesign',
		changes: [
			'Mann Co. themed header, navigation, and panels',
			'Updated typography and page layouts',
			'Restyled pricelist, trades, settings, profit, and modals',
			'Version badge reads from package.json'
		]
	},
	{
		version: '3.2.1',
		date: '2026-07-05',
		title: 'Live prices and build fixes',
		changes: [
			'Live price refresh for visible items via pricedb.io',
			'Differs from backpack.tf pricing filter',
			'Reference price comparison in item list and edit modal',
			'TypeScript build compatibility on Node 22',
			'Improved start scripts and npm build targets'
		]
	}
];

export function getLatestStartupLines(limit = 5): string[] {
	const latest = UPDATE_LOGS[0];
	if (!latest) {
		return [];
	}

	return latest.changes.slice(0, limit);
}

export function getLatestUpdateLog(): UpdateLogEntry | undefined {
	return UPDATE_LOGS[0];
}
