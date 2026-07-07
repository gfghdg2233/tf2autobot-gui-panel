export interface UpdateLogEntry {
	version: string;
	date: string;
	title: string;
	changes: string[];
}

export const UPDATE_LOGS: UpdateLogEntry[] = [
	{
		version: '3.5.5',
		date: '2026-07-07',
		title: 'Sidebar theme picker pinned to viewport',
		changes: [
			'Theme selector and sidebar footer stay fixed at the bottom-left while scrolling long lists',
			'Desktop sidebar uses sticky viewport height so nav links scroll independently above the footer'
		]
	},
	{
		version: '3.5.4',
		date: '2026-07-07',
		title: 'SourceBans sidebar, bot IPC, and dual version checks',
		changes: [
			'Left sidebar navigation with SourceBans-style console theme',
			'Panel and bot GitHub version checks side by side on Updates page',
			'Bot update scripts (update-bot.ps1 / update-bot.sh) with PM2 restart',
			'IPC hardening, /health/bot endpoint, and Windows setup-bot.ps1',
			'Sidebar shows Panel/Bot version chips and IPC connection status'
		]
	},
	{
		version: '3.5.3',
		date: '2026-07-07',
		title: 'Panel self-update from GitHub',
		changes: [
			'Update Logs page: check for updates and install from GitHub with one click',
			'Auto-check and optional auto-install on a configurable schedule',
			'Sidebar version badge highlights when a newer release is available',
			'Uses git pull, npm install, build, and PM2 restart when configured'
		]
	},
	{
		version: '3.5.2',
		date: '2026-07-07',
		title: 'Pricelist, trades, and unlisted stock UI polish',
		changes: [
			'Removed Mann Co. approved footer; Add Item link in sidebar on pricelist',
			'Unlisted Stock: line-by-line table, hides actively listed pricelist items',
			'Pricelist rows show killstreak tier, sheen, and killstreaker when present',
			'Trades: partner Steam profile name with profile and trade history links',
			'Trades: fixed item prices — shows trade cost per item in compact rows'
		]
	},
	{
		version: '3.5.1',
		date: '2026-07-07',
		title: 'Unlisted Stock inventory IPC fix',
		changes: [
			'Fixed Unlisted Stock page with tf2autobot-pricedb inventory IPC format',
			'Panel accepts both new structured payload and legacy flat inventory dict',
			'Updated INVENTORY_IPC.md — pricedb fork includes native getInventory support'
		]
	},
	{
		version: '3.5.0',
		date: '2026-07-07',
		title: 'Unlisted Stock page',
		changes: [
			'New sidebar tab for tradable backpack items not yet on the pricelist',
			'Highlights recent trade pickups from the last 7 days',
			'List items for sale individually or bulk-add with autoprice',
			'Requires bot inventory IPC patch (see patches/tf2autobot/INVENTORY_IPC.md)'
		]
	},
	{
		version: '3.4.3',
		date: '2026-07-05',
		title: 'Vertical sidebar navigation',
		changes: [
			'Replaced top header nav with a fixed left sidebar (icon + label links)',
			'Active page highlights with orange accent, similar to backpack.tf-style panels',
			'Theme picker and Settings moved to the sidebar footer',
			'Mobile hamburger menu with slide-out drawer and overlay'
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
