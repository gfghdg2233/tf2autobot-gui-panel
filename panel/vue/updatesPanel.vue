<template>
    <div class="panel-update-card glass-panel mb-4">
        <div class="panel-update-header">
            <div>
                <p class="eyebrow mb-1">Panel Update</p>
                <h2 class="mb-1">Check for updates</h2>
                <p class="panel-update-sub">
                    Pull the latest release from GitHub, rebuild, and restart (PM2 if configured).
                </p>
            </div>

            <div class="panel-update-versions">
                <div>
                    <span>Installed</span>
                    <strong>v{{ status.currentVersion }}</strong>
                </div>
                <div>
                    <span>Latest</span>
                    <strong>{{ status.latestVersion ? `v${status.latestVersion}` : '—' }}</strong>
                </div>
            </div>
        </div>

        <div class="panel-update-status" :class="statusClass">
            <span class="panel-update-dot"></span>
            <span>{{ statusMessage }}</span>
            <span v-if="status.lastCheckAt" class="panel-update-checked">
                · checked {{ formatTime(status.lastCheckAt) }}
            </span>
        </div>

        <div v-if="status.git.isRepo" class="panel-update-git">
            <span v-if="status.git.branch">branch {{ status.git.branch }}</span>
            <span v-if="status.git.commit">@ {{ status.git.commit }}</span>
            <span v-if="status.git.behind !== null && status.git.behind > 0">{{ status.git.behind }} commit(s) behind</span>
            <span v-if="status.git.dirty" class="text-warning">local changes present</span>
        </div>

        <div class="panel-update-actions">
            <button
                type="button"
                class="btn btn-tf2"
                :disabled="busy"
                @click="checkNow"
            >
                {{ busy && action === 'check' ? 'Checking…' : 'Check for updates' }}
            </button>

            <button
                type="button"
                class="btn btn-tf2-accent"
                :disabled="busy || !status.updateAvailable || status.git.dirty || !status.git.isRepo"
                @click="applyUpdate"
            >
                {{ busy && action === 'apply' ? 'Updating…' : 'Update now' }}
            </button>

            <a
                v-if="status.releaseUrl"
                :href="status.releaseUrl"
                target="_blank"
                rel="noopener"
                class="btn btn-outline-light"
            >
                View release
            </a>
        </div>

        <div class="panel-update-toggles">
            <div class="form-check form-switch">
                <input
                    id="autoCheck"
                    v-model="settings.autoCheck"
                    class="form-check-input"
                    type="checkbox"
                    @change="saveSettings"
                />
                <label class="form-check-label" for="autoCheck">Auto-check for updates</label>
            </div>

            <div class="form-check form-switch">
                <input
                    id="autoUpdate"
                    v-model="settings.autoUpdate"
                    class="form-check-input"
                    type="checkbox"
                    @change="saveSettings"
                />
                <label class="form-check-label" for="autoUpdate">Auto-install updates</label>
            </div>

            <div class="panel-update-interval">
                <label for="checkInterval">Check every</label>
                <select
                    id="checkInterval"
                    v-model.number="settings.checkIntervalHours"
                    class="form-select form-select-sm"
                    @change="saveSettings"
                >
                    <option :value="1">1 hour</option>
                    <option :value="3">3 hours</option>
                    <option :value="6">6 hours</option>
                    <option :value="12">12 hours</option>
                    <option :value="24">24 hours</option>
                </select>
            </div>
        </div>

        <div v-if="jobLog" class="panel-update-log">
            <div class="panel-update-log-title">Update log</div>
            <pre>{{ jobLog }}</pre>
        </div>

        <p v-if="error" class="panel-update-error">{{ error }}</p>
    </div>
</template>

<script lang="ts">
interface UpdateStatus {
    currentVersion: string;
    latestVersion: string | null;
    updateAvailable: boolean;
    releaseUrl: string | null;
    git: {
        isRepo: boolean;
        branch: string | null;
        commit: string | null;
        dirty: boolean;
        behind: number | null;
    };
    settings: {
        autoCheck: boolean;
        autoUpdate: boolean;
        checkIntervalHours: number;
    };
    lastCheckAt: number | null;
    updateInProgress: boolean;
    lastUpdateError: string | null;
}

export default {
    name: 'updatesPanel',
    data() {
        return {
            status: {
                currentVersion: '0.0.0',
                latestVersion: null,
                updateAvailable: false,
                releaseUrl: null,
                git: {
                    isRepo: false,
                    branch: null,
                    commit: null,
                    dirty: false,
                    behind: null
                },
                settings: {
                    autoCheck: false,
                    autoUpdate: false,
                    checkIntervalHours: 6
                },
                lastCheckAt: null,
                updateInProgress: false,
                lastUpdateError: null
            } as UpdateStatus,
            settings: {
                autoCheck: false,
                autoUpdate: false,
                checkIntervalHours: 6
            },
            busy: false,
            action: '' as '' | 'check' | 'apply',
            error: '',
            jobLog: '',
            pollTimer: null as ReturnType<typeof setInterval> | null
        };
    },
    computed: {
        statusClass(): string {
            if (this.status.updateInProgress) {
                return 'is-running';
            }
            if (this.status.updateAvailable) {
                return 'is-available';
            }
            return 'is-current';
        },
        statusMessage(): string {
            if (this.status.updateInProgress) {
                return 'Update in progress…';
            }
            if (this.status.lastUpdateError) {
                return `Last update failed: ${this.status.lastUpdateError}`;
            }
            if (!this.status.git.isRepo) {
                return 'Not a git install — update manually with git pull.';
            }
            if (this.status.git.dirty) {
                return 'Local changes detected — stash or commit before updating.';
            }
            if (this.status.updateAvailable) {
                return `Update available: v${this.status.latestVersion || 'newer'}`;
            }
            return 'Panel is up to date.';
        }
    },
    mounted() {
        void this.loadStatus();
    },
    beforeUnmount() {
        this.stopPolling();
    },
    methods: {
        async loadStatus() {
            try {
                const res = await fetch('/updates/status');
                if (!res.ok) {
                    throw new Error('Failed to load update status');
                }
                const data = await res.json() as UpdateStatus;
                this.status = data;
                this.settings = { ...data.settings };

                if (data.updateInProgress) {
                    this.startPolling();
                }
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            }
        },
        async checkNow() {
            this.busy = true;
            this.action = 'check';
            this.error = '';

            try {
                const res = await fetch('/updates/check', { method: 'POST' });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({})) as { error?: string };
                    throw new Error(body.error || 'Check failed');
                }
                const data = await res.json() as UpdateStatus;
                this.status = data;
                this.settings = { ...data.settings };
                document.dispatchEvent(new CustomEvent('panel-update-status', { detail: data }));
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busy = false;
                this.action = '';
            }
        },
        async applyUpdate() {
            this.busy = true;
            this.action = 'apply';
            this.error = '';

            try {
                const res = await fetch('/updates/apply', { method: 'POST' });
                const body = await res.json() as { started?: boolean; message?: string; error?: string };

                if (!res.ok) {
                    throw new Error(body.error || 'Update failed to start');
                }

                if (!body.started) {
                    this.error = body.message || 'Update could not start';
                    return;
                }

                this.status.updateInProgress = true;
                this.startPolling();
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            } finally {
                this.busy = false;
                this.action = '';
            }
        },
        async saveSettings() {
            this.error = '';
            try {
                const res = await fetch('/updates/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.settings)
                });
                if (!res.ok) {
                    throw new Error('Failed to save settings');
                }
                const data = await res.json() as UpdateStatus['settings'];
                this.settings = data;
                this.status.settings = data;
            } catch (err) {
                this.error = err instanceof Error ? err.message : String(err);
            }
        },
        startPolling() {
            if (this.pollTimer) {
                return;
            }

            void this.pollJob();
            this.pollTimer = setInterval(() => {
                void this.pollJob();
            }, 3000);
        },
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },
        async pollJob() {
            try {
                const res = await fetch('/updates/job');
                if (!res.ok) {
                    return;
                }

                const data = await res.json() as {
                    job: { status: string; error?: string };
                    logTail: string;
                };

                this.jobLog = data.logTail;

                if (data.job.status === 'running') {
                    this.status.updateInProgress = true;
                    return;
                }

                this.stopPolling();
                this.status.updateInProgress = false;

                if (data.job.status === 'failed') {
                    this.status.lastUpdateError = data.job.error || 'Update failed';
                }

                await this.loadStatus();
            } catch {
                // ignore transient poll errors
            }
        },
        formatTime(timestamp: number): string {
            return new Date(timestamp).toLocaleString();
        }
    }
};
</script>

<style scoped lang="scss">
.panel-update-card {
    padding: 1.25rem 1.35rem;
}

.panel-update-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.panel-update-header h2 {
    font-family: "Oswald", sans-serif;
    font-size: 1.35rem;
    color: #ffe8c0;
}

.panel-update-sub {
    color: #a89880;
    margin-bottom: 0;
    max-width: 36rem;
}

.panel-update-versions {
    display: flex;
    gap: 1.25rem;

    div {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        text-align: right;
    }

    span {
        color: #a89880;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    strong {
        color: #ffe8c0;
        font-family: "Oswald", sans-serif;
        font-size: 1.1rem;
    }
}

.panel-update-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    border-radius: 2px;
    margin-bottom: 0.85rem;
    font-size: 0.9rem;

    &.is-current {
        background: rgba(76, 175, 80, 0.12);
        color: #b8e0b8;
    }

    &.is-available {
        background: rgba(255, 152, 0, 0.14);
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
}

.panel-update-checked {
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.8rem;
}

.panel-update-git {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    color: #8f8170;
    font-size: 0.8rem;
    margin-bottom: 1rem;
}

.panel-update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-bottom: 1rem;
}

.panel-update-toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 1.5rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-update-interval {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #a89880;
    font-size: 0.85rem;

    select {
        width: auto;
        min-width: 7rem;
    }
}

.panel-update-log {
    margin-top: 1rem;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.75rem;
}

.panel-update-log-title {
    color: #a89880;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.5rem;
}

.panel-update-log pre {
    margin: 0;
    color: #d8d0c4;
    font-size: 0.75rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 12rem;
    overflow: auto;
}

.panel-update-error {
    margin: 0.75rem 0 0;
    color: #ffb4b4;
}
</style>
