<template>
    <div class="versions-dashboard">
        <div class="versions-dashboard-head">
            <div>
                <p class="eyebrow mb-1">Version control</p>
                <h2 class="mb-1">Panel &amp; bot updates</h2>
                <p class="versions-dashboard-sub">
                    Check GitHub for new releases and update both installs from one place.
                </p>
            </div>
            <button
                type="button"
                class="btn btn-tf2"
                :disabled="busyAll"
                @click="checkAll"
            >
                {{ busyAll ? 'Checking…' : 'Check all' }}
            </button>
        </div>

        <div class="versions-grid">
            <article class="panel-update-card glass-panel" :class="panelCardClass">
                <header class="panel-update-header">
                    <div>
                        <p class="eyebrow mb-1">GUI Panel</p>
                        <h3 class="mb-1">tf2autobot-gui-panel</h3>
                        <p class="panel-update-sub">Web panel on this machine.</p>
                    </div>
                    <div class="panel-update-versions">
                        <div>
                            <span>Installed</span>
                            <strong>v{{ panel.currentVersion }}</strong>
                        </div>
                        <div>
                            <span>Latest</span>
                            <strong>{{ panel.latestVersion ? `v${panel.latestVersion}` : '—' }}</strong>
                        </div>
                    </div>
                </header>

                <div class="panel-update-status" :class="panelStatusClass">
                    <span class="panel-update-dot"></span>
                    <span>{{ panelStatusMessage }}</span>
                </div>

                <div v-if="panel.git.isRepo" class="panel-update-git">
                    <span v-if="panel.git.branch">branch {{ panel.git.branch }}</span>
                    <span v-if="panel.git.commit">@ {{ panel.git.commit }}</span>
                    <span v-if="panel.git.behind !== null && panel.git.behind > 0">{{ panel.git.behind }} commit(s) behind</span>
                    <span v-if="panel.git.dirty" class="text-warning">local changes</span>
                </div>

                <div class="panel-update-actions">
                    <button type="button" class="btn btn-tf2" :disabled="busyPanel" @click="checkPanel">
                        {{ busyPanel && panelAction === 'check' ? 'Checking…' : 'Check' }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-tf2-accent"
                        :disabled="busyPanel || !panel.updateAvailable || panel.git.dirty || !panel.git.isRepo"
                        @click="applyPanel"
                    >
                        {{ busyPanel && panelAction === 'apply' ? 'Updating…' : 'Update panel' }}
                    </button>
                    <a v-if="panel.releaseUrl" :href="panel.releaseUrl" target="_blank" rel="noopener" class="btn btn-outline-light">Release</a>
                </div>

                <div class="panel-update-toggles">
                    <div class="form-check form-switch">
                        <input id="autoCheck" v-model="panelSettings.autoCheck" class="form-check-input" type="checkbox" @change="savePanelSettings" />
                        <label class="form-check-label" for="autoCheck">Auto-check</label>
                    </div>
                    <div class="form-check form-switch">
                        <input id="autoUpdate" v-model="panelSettings.autoUpdate" class="form-check-input" type="checkbox" @change="savePanelSettings" />
                        <label class="form-check-label" for="autoUpdate">Auto-install</label>
                    </div>
                </div>

                <div v-if="panelJobLog" class="panel-update-log">
                    <div class="panel-update-log-title">Panel update log</div>
                    <pre>{{ panelJobLog }}</pre>
                </div>
            </article>

            <article class="panel-update-card glass-panel" :class="botCardClass">
                <header class="panel-update-header">
                    <div>
                        <p class="eyebrow mb-1">Trading Bot</p>
                        <h3 class="mb-1">tf2autobot-pricedb</h3>
                        <p class="panel-update-sub">
                            <span v-if="bot.botFound">{{ bot.botDir }}</span>
                            <span v-else>Bot folder not found — set BOT_DIR in panel .env</span>
                        </p>
                    </div>
                    <div class="panel-update-versions">
                        <div>
                            <span>Installed</span>
                            <strong>{{ bot.currentVersion ? `v${bot.currentVersion}` : '—' }}</strong>
                        </div>
                        <div>
                            <span>Latest</span>
                            <strong>{{ bot.latestVersion ? `v${bot.latestVersion}` : '—' }}</strong>
                        </div>
                    </div>
                </header>

                <div class="panel-update-status" :class="botStatusClass">
                    <span class="panel-update-dot"></span>
                    <span>{{ botStatusMessage }}</span>
                </div>

                <div v-if="bot.git.isRepo" class="panel-update-git">
                    <span v-if="bot.git.branch">branch {{ bot.git.branch }}</span>
                    <span v-if="bot.git.commit">@ {{ bot.git.commit }}</span>
                    <span v-if="bot.git.behind !== null && bot.git.behind > 0">{{ bot.git.behind }} commit(s) behind</span>
                    <span v-if="bot.git.dirty" class="text-warning">local changes</span>
                </div>

                <p v-if="bot.updateMessage" class="bot-update-message">{{ bot.updateMessage }}</p>

                <div class="panel-update-actions">
                    <button type="button" class="btn btn-tf2" :disabled="busyBot" @click="checkBot">
                        {{ busyBot && botAction === 'check' ? 'Checking…' : 'Check' }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-tf2-accent"
                        :disabled="busyBot || !bot.updateAvailable || bot.git.dirty || !bot.git.isRepo || !bot.botFound"
                        @click="applyBot"
                    >
                        {{ busyBot && botAction === 'apply' ? 'Updating…' : 'Update bot' }}
                    </button>
                    <a v-if="bot.releaseUrl" :href="bot.releaseUrl" target="_blank" rel="noopener" class="btn btn-outline-light">Release</a>
                </div>

                <div v-if="botJobLog" class="panel-update-log">
                    <div class="panel-update-log-title">Bot update log</div>
                    <pre>{{ botJobLog }}</pre>
                </div>
            </article>
        </div>

        <p v-if="error" class="panel-update-error">{{ error }}</p>
    </div>
</template>

<script lang="ts">
interface GitInfo {
    isRepo: boolean;
    branch: string | null;
    commit: string | null;
    dirty: boolean;
    behind: number | null;
}

interface PanelStatus {
    currentVersion: string;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string | null;
    git: GitInfo;
    settings: {
        autoCheck: boolean;
        autoUpdate: boolean;
        checkIntervalHours: number;
    };
    updateInProgress: boolean;
    lastUpdateError: string | null;
}

interface BotStatus {
    currentVersion: string | null;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string | null;
    botDir: string;
    botFound: boolean;
    git: GitInfo;
    updateInProgress: boolean;
    lastUpdateError: string | null;
    updateMessage: string | null;
}

export default {
    name: 'versionsPanel',
    data() {
        return {
            panel: {
                currentVersion: '0.0.0',
                latestVersion: null,
                updateAvailable: false,
                releaseUrl: null,
                git: { isRepo: false, branch: null, commit: null, dirty: false, behind: null },
                settings: { autoCheck: false, autoUpdate: false, checkIntervalHours: 6 },
                updateInProgress: false,
                lastUpdateError: null
            } as PanelStatus,
            bot: {
                currentVersion: null,
                latestVersion: null,
                updateAvailable: false,
                releaseUrl: null,
                botDir: '',
                botFound: false,
                git: { isRepo: false, branch: null, commit: null, dirty: false, behind: null },
                updateInProgress: false,
                lastUpdateError: null,
                updateMessage: null
            } as BotStatus,
            panelSettings: {
                autoCheck: false,
                autoUpdate: false,
                checkIntervalHours: 6
            },
            busyPanel: false,
            busyBot: false,
            panelAction: '' as '' | 'check' | 'apply',
            botAction: '' as '' | 'check' | 'apply',
            error: '',
            panelJobLog: '',
            botJobLog: '',
            panelPollTimer: null as ReturnType<typeof setInterval> | null,
            botPollTimer: null as ReturnType<typeof setInterval> | null
        };
    },
    computed: {
        busyAll(): boolean {
            return this.busyPanel || this.busyBot;
        },
        panelCardClass(): string {
            return this.panel.updateAvailable ? 'has-update' : '';
        },
        botCardClass(): string {
            return this.bot.updateAvailable ? 'has-update' : '';
        },
        panelStatusClass(): string {
            if (this.panel.updateInProgress) return 'is-running';
            if (this.panel.updateAvailable) return 'is-available';
            return 'is-current';
        },
        botStatusClass(): string {
            if (this.bot.updateInProgress) return 'is-running';
            if (this.bot.updateAvailable) return 'is-available';
            return 'is-current';
        },
        panelStatusMessage(): string {
            if (this.panel.updateInProgress) return 'Panel update in progress…';
            if (this.panel.lastUpdateError) return `Last panel update failed: ${this.panel.lastUpdateError}`;
            if (!this.panel.git.isRepo) return 'Not a git install — update manually.';
            if (this.panel.git.dirty) return 'Local changes — stash before updating.';
            if (this.panel.updateAvailable) return `Panel update available: v${this.panel.latestVersion || 'newer'}`;
            return 'Panel is up to date.';
        },
        botStatusMessage(): string {
            if (!this.bot.botFound) return 'Bot directory not found on this machine.';
            if (this.bot.updateInProgress) return 'Bot update in progress…';
            if (this.bot.lastUpdateError) return `Last bot update failed: ${this.bot.lastUpdateError}`;
            if (!this.bot.git.isRepo) return 'Bot not a git install — update manually.';
            if (this.bot.git.dirty) return 'Bot has local changes — stash before updating.';
            if (this.bot.updateAvailable) return `Bot update available: v${this.bot.latestVersion || 'newer'}`;
            return 'Bot is up to date.';
        }
    },
    mounted() {
        void this.loadCombined();
    },
    beforeUnmount() {
        this.stopPanelPolling();
        this.stopBotPolling();
    },
    methods: {
        emitSidebarStatus(): void {
            document.dispatchEvent(new CustomEvent('panel-update-status', { detail: this.panel }));
            document.dispatchEvent(new CustomEvent('bot-update-status', { detail: this.bot }));
        },
        async loadCombined() {
            this.error = '';
            try {
                const res = await fetch('/updates/combined/status');
                if (!res.ok) {
                    throw new Error('Failed to load version status');
                }
                const data = await res.json() as { panel: PanelStatus; bot: BotStatus };
                this.panel = data.panel;
                this.bot = data.bot;
                this.panelSettings = { ...data.panel.settings };
                this.emitSidebarStatus();

                if (data.panel.updateInProgress) {
                    this.startPanelPolling();
                }
                if (data.bot.updateInProgress) {
                    this.startBotPolling();
                }
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            }
        },
        async checkAll() {
            await Promise.all([this.checkPanel(), this.checkBot()]);
        },
        async checkPanel() {
            this.busyPanel = true;
            this.panelAction = 'check';
            try {
                const res = await fetch('/updates/check', { method: 'POST' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({})) as { error?: string };
                    throw new Error(body.error || 'Panel check failed');
                }
                this.panel = await res.json() as PanelStatus;
                this.panelSettings = { ...this.panel.settings };
                this.emitSidebarStatus();
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busyPanel = false;
                this.panelAction = '';
            }
        },
        async checkBot() {
            this.busyBot = true;
            this.botAction = 'check';
            try {
                const res = await fetch('/updates/bot/check', { method: 'POST' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({})) as { error?: string };
                    throw new Error(body.error || 'Bot check failed');
                }
                this.bot = await res.json() as BotStatus;
                this.emitSidebarStatus();
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busyBot = false;
                this.botAction = '';
            }
        },
        async applyPanel() {
            this.busyPanel = true;
            this.panelAction = 'apply';
            try {
                const res = await fetch('/updates/apply', { method: 'POST' });
                const body = await res.json() as { started?: boolean; message?: string; error?: string };
                if (!res.ok || !body.started) {
                    throw new Error(body.error || body.message || 'Panel update failed to start');
                }
                this.panel.updateInProgress = true;
                this.startPanelPolling();
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busyPanel = false;
                this.panelAction = '';
            }
        },
        async applyBot() {
            this.busyBot = true;
            this.botAction = 'apply';
            try {
                const res = await fetch('/updates/bot/apply', { method: 'POST' });
                const body = await res.json() as { started?: boolean; message?: string; error?: string };
                if (!res.ok || !body.started) {
                    throw new Error(body.error || body.message || 'Bot update failed to start');
                }
                this.bot.updateInProgress = true;
                this.startBotPolling();
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busyBot = false;
                this.botAction = '';
            }
        },
        async savePanelSettings() {
            try {
                const res = await fetch('/updates/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.panelSettings)
                });
                if (!res.ok) {
                    throw new Error('Failed to save panel settings');
                }
                this.panelSettings = await res.json() as PanelStatus['settings'];
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            }
        },
        startPanelPolling() {
            if (this.panelPollTimer) return;
            void this.pollPanelJob();
            this.panelPollTimer = setInterval(() => { void this.pollPanelJob(); }, 3000);
        },
        stopPanelPolling() {
            if (this.panelPollTimer) {
                clearInterval(this.panelPollTimer);
                this.panelPollTimer = null;
            }
        },
        startBotPolling() {
            if (this.botPollTimer) return;
            void this.pollBotJob();
            this.botPollTimer = setInterval(() => { void this.pollBotJob(); }, 3000);
        },
        stopBotPolling() {
            if (this.botPollTimer) {
                clearInterval(this.botPollTimer);
                this.botPollTimer = null;
            }
        },
        async pollPanelJob() {
            try {
                const res = await fetch('/updates/job');
                if (!res.ok) return;
                const data = await res.json() as { job: { status: string; error?: string }; logTail: string };
                this.panelJobLog = data.logTail;
                if (data.job.status === 'running') {
                    this.panel.updateInProgress = true;
                    return;
                }
                this.stopPanelPolling();
                this.panel.updateInProgress = false;
                if (data.job.status === 'failed') {
                    this.panel.lastUpdateError = data.job.error || 'Update failed';
                }
                await this.loadCombined();
            } catch {
                // ignore
            }
        },
        async pollBotJob() {
            try {
                const res = await fetch('/updates/bot/job');
                if (!res.ok) return;
                const data = await res.json() as { job: { status: string; error?: string }; logTail: string };
                this.botJobLog = data.logTail;
                if (data.job.status === 'running') {
                    this.bot.updateInProgress = true;
                    return;
                }
                this.stopBotPolling();
                this.bot.updateInProgress = false;
                if (data.job.status === 'failed') {
                    this.bot.lastUpdateError = data.job.error || 'Update failed';
                }
                await this.loadCombined();
            } catch {
                // ignore
            }
        }
    }
};
</script>

<style scoped lang="scss">
.versions-dashboard {
    margin-bottom: 1.5rem;
}

.versions-dashboard-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.versions-dashboard-head h2 {
    font-size: 1.35rem;
    margin: 0;
    color: var(--tf2-cream);
}

.versions-dashboard-sub {
    margin: 0;
    color: var(--tf2-text-muted);
    max-width: 36rem;
}

.versions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.panel-update-card {
    padding: 1.15rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: border-color 150ms ease, box-shadow 150ms ease;
}

.panel-update-card.has-update {
    border-color: rgba(249, 115, 22, 0.45);
    box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.12);
}

.panel-update-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
}

.panel-update-header h3 {
    font-size: 1.05rem;
    margin: 0 0 0.25rem;
    color: var(--tf2-cream);
}

.panel-update-sub {
    color: var(--tf2-text-muted);
    font-size: 0.82rem;
    margin: 0;
    word-break: break-word;
}

.panel-update-versions {
    display: flex;
    gap: 1rem;

    div {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        text-align: right;
    }

    span {
        color: var(--tf2-text-muted);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    strong {
        color: var(--tf2-cream);
        font-size: 1rem;
    }
}

.panel-update-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border-radius: 0.45rem;
    margin-bottom: 0.75rem;
    font-size: 0.86rem;

    &.is-current {
        background: rgba(46, 204, 113, 0.12);
        color: #9be7b5;
    }

    &.is-available {
        background: rgba(249, 115, 22, 0.14);
        color: #ffd9a0;
    }

    &.is-running {
        background: rgba(33, 150, 243, 0.14);
        color: #b3d9ff;
    }
}

.panel-update-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
}

.panel-update-git {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    color: var(--tf2-text-muted);
    font-size: 0.78rem;
    margin-bottom: 0.75rem;
}

.bot-update-message {
    margin: 0 0 0.75rem;
    color: var(--tf2-text-muted);
    font-size: 0.82rem;
}

.panel-update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.panel-update-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-update-log {
    margin-top: 0.75rem;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.65rem;
    border-radius: 0.45rem;
}

.panel-update-log-title {
    color: var(--tf2-text-muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.35rem;
}

.panel-update-log pre {
    margin: 0;
    color: #d8d0c4;
    font-size: 0.72rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 10rem;
    overflow: auto;
}

.panel-update-error {
    margin-top: 0.75rem;
    color: #ffb4b4;
}

@media (max-width: 991px) {
    .versions-grid {
        grid-template-columns: 1fr;
    }
}
</style>
