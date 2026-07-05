import { getLatestStartupLines } from './data/updateLogs';

export function printStartupLog(version: string): void {
    console.log(`tf2autobot-gui v${version} is starting...`);
    console.log('What\'s new in this version:');

    const lines = getLatestStartupLines();

    if (lines.length === 0) {
        console.log('  • No update notes recorded yet.');
        return;
    }

    lines.forEach((line) => {
        console.log(`  • ${line}`);
    });
}
