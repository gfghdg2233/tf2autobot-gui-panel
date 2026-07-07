import {
    applyPanelUpdate,
    checkForPanelUpdate,
    getPanelUpdateSettings,
    isUpdateInProgress
} from './panelUpdate';

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
                console.log('[panel-update] Auto-update: new version available, applying...');
                const apply = await applyPanelUpdate();
                console.log(`[panel-update] ${apply.message}`);
            } else {
                console.log('[panel-update] Auto-update skipped (not a clean git repo).');
            }
        } else if (result.updateAvailable) {
            console.log(`[panel-update] Update available: v${result.latestVersion} (current v${result.currentVersion})`);
        }
    } catch (err) {
        console.error('[panel-update] Scheduled check failed:', err);
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
