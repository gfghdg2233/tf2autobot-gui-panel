import {
    applyPanelUpdate,
    checkForPanelUpdate,
    getPanelUpdateSettings,
    isUpdateInProgress
} from './panelUpdate';
import { createLogger } from './logger';

const log = createLogger('panel-update');

let timer: NodeJS.Timeout | null = null;

async function runScheduledCheck(): Promise<void> {
    try {
        const settings = await getPanelUpdateSettings();
        if (!settings.autoCheck) {
            return;
        }

        const result = await checkForPanelUpdate(false);

        if (settings.autoUpdate && result.updateAvailable && !isUpdateInProgress()) {
            if (result.git.isRepo && !result.git.dirty) {
                log.info('Auto-update: new version available, applying...');
                const apply = await applyPanelUpdate();
                log.info(apply.message);
            } else {
                log.info('Auto-update skipped (not a clean git repo).');
            }
        } else if (result.updateAvailable) {
            log.info(`Update available: v${result.latestVersion} (current v${result.currentVersion})`);
        }
    } catch (err) {
        log.error('Scheduled check failed:', err);
    }
}

export function startPanelUpdateScheduler(): void {
    if (timer) {
        return;
    }

    void runScheduledCheck();

    const tick = async (): Promise<void> => {
        await runScheduledCheck();
        const settings = await getPanelUpdateSettings();
        const hours = settings.checkIntervalHours || 6;
        timer = setTimeout(() => {
            void tick();
        }, hours * 60 * 60 * 1000);
    };

    void getPanelUpdateSettings().then(settings => {
        const hours = settings.checkIntervalHours || 6;
        timer = setTimeout(() => {
            void tick();
        }, hours * 60 * 60 * 1000);
    });
}
