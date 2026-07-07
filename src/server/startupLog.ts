import { getLatestStartupLines } from './data/updateLogs';
import { createLogger } from './utils/logger';

const log = createLogger('startup');

export function printStartupLog(version: string): void {
    log.info(`tf2autobot-gui v${version} starting`);

    const lines = getLatestStartupLines();

    if (lines.length === 0) {
        log.info('No update notes recorded for this version.');
        return;
    }

    log.info(`What's new in v${version}:`);
    lines.forEach((line) => {
        log.info(`  • ${line}`);
    });
}
