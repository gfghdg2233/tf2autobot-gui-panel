<template>
    <div class="container page-shell settings-page">
        <div class="page-hero settings-hero">
            <div>
                <p class="text-uppercase small mb-1 eyebrow">Bot Configuration</p>
                <h1 class="mb-1">Settings</h1>
                <p>Search and update the selected bot's options from the Mann Co. terminal.</p>
            </div>

            <div class="settings-hero-meta">
                <span>{{ optionGroupCount }} groups</span>
                <span>{{ totalOptionCount }} editable values</span>
            </div>
        </div>

        <div class="stat-grid mb-4 settings-summary">
            <div class="stat-card">
                <span>Groups</span>
                <strong>{{ optionGroupCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Values</span>
                <strong>{{ totalOptionCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Shown</span>
                <strong>{{ filteredGroupCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Status</span>
                <strong>{{ loading ? 'Loading' : 'Ready' }}</strong>
            </div>
        </div>

        <div class="glass-panel settings-panel">
            <div v-if="saveError" class="alert alert-danger settings-alert" role="alert">
                {{ saveError }}
            </div>

            <div v-else-if="saveSuccess" class="alert alert-success settings-alert" role="alert">
                Settings saved. Discord webhook URLs and other bot options were updated.
            </div>

            <div class="settings-toolbar">
                <div>
                    <label class="form-label">Search settings</label>
                    <input
                        class="form-control"
                        v-model="search"
                        placeholder="Search option names or values..."
                    />
                </div>

                <button class="btn btn-outline-light" type="button" @click="search = ''" :disabled="!search">
                    Clear Search
                </button>
            </div>

            <form method="post" action="/config" class="settings-form">
                <div v-if="loading" class="empty-state">
                    Loading settings from the selected bot...
                </div>

                <div v-else-if="filteredGroupCount === 0" class="empty-state">
                    No settings match your search.
                </div>

                <template v-else>
                    <div
                        v-for="(value, key) of filteredOptions"
                        :key="key"
                        class="settings-group"
                    >
                        <recursive-option :for="key" :level="2" :data="value" :parent="key"></recursive-option>
                    </div>
                </template>

                <div class="settings-save-bar">
                    <span>Saving updates the currently selected bot.</span>
                    <input class="btn btn-primary" type="submit" value="Save Changes">
                </div>
            </form>
        </div>
    </div>
</template>

<script lang="ts">
import recursiveOption from './components/recursiveOption.vue';

export default {
    name: "config.vue",

    components: {
        recursiveOption
    },

    data(){
        return{
            options: {},
            search: '',
            loading: true,
            saveSuccess: false,
            saveError: ''
        };
    },

    computed: {
        optionGroupCount(): number {
            return Object.keys(this.options || {}).length;
        },

        filteredGroupCount(): number {
            return Object.keys(this.filteredOptions || {}).length;
        },

        totalOptionCount(): number {
            return this.countOptions(this.options);
        },

        filteredOptions(): object {
            const query = String(this.search || '').toLowerCase().trim();

            if (!query) {
                return this.options;
            }

            return Object.entries(this.options || {}).reduce((acc: any, [key, value]) => {
                const searchable = `${key} ${JSON.stringify(value)}`.toLowerCase();

                if (searchable.includes(query)) {
                    acc[key] = value;
                }

                return acc;
            }, {});
        }
    },

    methods: {
        countOptions(value: any): number {
            if (!value || typeof value !== 'object') {
                return 1;
            }

            if (Array.isArray(value)) {
                return 1;
            }

            return Object.values(value).reduce((total: number, child: any) => {
                return total + this.countOptions(child);
            }, 0);
        },

        getJson(){
            this.loading = true;

            fetch('/config/options')
                .then((response) => {
                    return response.json();
                })
                .then((data) => {
                    this.options = data || {};
                })
                .catch((error) => {
                    console.error('Error: ', error);
                })
                .finally(() => {
                    this.loading = false;
                });
        },

        readSaveStatusFromUrl(): void {
            const params = new URLSearchParams(window.location.search);

            this.saveSuccess = params.get('saved') === '1';
            this.saveError = params.get('error') ? decodeURIComponent(params.get('error') || '') : '';

            if (this.saveSuccess || this.saveError) {
                window.history.replaceState({}, '', '/config');
            }
        }
    },

    mounted(){
        this.readSaveStatusFromUrl();
        this.getJson();
    },
};
</script>
