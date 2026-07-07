<template>
    <div class="container page-shell unlisted-page">
        <message
            v-for="(msg, index) in messages"
            :key="index"
            :to-remove="index"
            :msg_type="msg.type"
            @close="msgClose"
        >
            {{ msg.msg }}
        </message>

        <price-modal ref="priceModal" @item="onItemListed"></price-modal>

        <div class="page-hero">
            <div>
                <p class="eyebrow mb-1">Inventory</p>
                <h1 class="mb-1">Unlisted Stock</h1>
                <p>Tradable items in your bot backpack that are not on the pricelist yet — including recent trade pickups.</p>
            </div>

            <div class="hero-actions">
                <button class="btn btn-primary" @click="loadItems()" :disabled="loading">
                    {{ loading ? 'Refreshing…' : 'Refresh' }}
                </button>
                <button
                    class="btn btn-outline-light"
                    @click="listSelected()"
                    :disabled="loading || listing || selectedSkus.length === 0"
                >
                    {{ listing ? 'Listing…' : `List selected (${selectedSkus.length})` }}
                </button>
            </div>
        </div>

        <div class="alert alert-warning tf2-alert" v-if="error">
            {{ error }}
            <div class="small mt-2" v-if="inventoryUnsupported">
                See <code>patches/tf2autobot/INVENTORY_IPC.md</code> in this repo and restart your bot after patching.
            </div>
        </div>

        <div class="stat-grid mb-4" v-if="!error">
            <div class="stat-card stat-card-accent">
                <span>Unlisted items</span>
                <strong>{{ itemCount }}</strong>
            </div>
            <div class="stat-card">
                <span>Recent pickups</span>
                <strong>{{ recentCount }}</strong>
            </div>
            <div class="stat-card">
                <span>Selected</span>
                <strong>{{ selectedSkus.length }}</strong>
            </div>
            <div class="stat-card">
                <span>Last updated</span>
                <strong>{{ updatedLabel }}</strong>
            </div>
        </div>

        <div class="glass-panel mb-4 filter-panel" v-if="!error">
            <div class="row g-3 align-items-end">
                <div class="col-lg-6">
                    <label class="form-label">Search name or SKU</label>
                    <input
                        class="form-control form-control-lg"
                        v-model="search"
                        placeholder="Example: Team Captain, 440;7..."
                    />
                </div>
                <div class="col-lg-3">
                    <label class="form-label">Show</label>
                    <select class="form-select form-select-lg" v-model="showFilter">
                        <option value="all">All unlisted</option>
                        <option value="recent">Recent pickups only</option>
                    </select>
                </div>
                <div class="col-lg-3">
                    <button class="btn btn-soft w-100" type="button" @click="toggleSelectAllVisible()">
                        {{ allVisibleSelected ? 'Clear selection' : 'Select visible' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="unlisted-empty glass-panel" v-if="!loading && !error && filteredItems.length === 0">
            <h2>Nothing to list</h2>
            <p>Every tradable item in your backpack is already on the pricelist, or your inventory is empty.</p>
        </div>

        <div class="unlisted-grid" v-if="!error && filteredItems.length > 0">
            <div
                class="unlisted-card-wrap"
                v-for="item in filteredItems"
                :key="item.sku"
            >
                <grid-item
                    :item="displayItem(item)"
                    :selected="selectedSkus.includes(item.sku)"
                    @itemClick="toggleSelect(item.sku)"
                ></grid-item>

                <div class="unlisted-card-actions">
                    <span class="recent-badge" v-if="item.recent">Recent</span>
                    <span class="count-badge">{{ item.count }} in backpack</span>
                    <button class="btn btn-sm btn-primary" type="button" @click.stop="listOne(item)">
                        List for sale
                    </button>
                    <a
                        v-if="item.statslink"
                        class="btn btn-sm btn-outline-light"
                        :href="item.statslink"
                        target="_blank"
                        rel="noopener"
                        @click.stop
                    >
                        Stats
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import message from './components/message.vue';
import gridItem from './components/gridItem.vue';
import priceModal from './parts/priceModal.vue';

interface Message {
    msg: string;
    type: 'Success' | 'Danger' | 'Warning' | 'info';
}

interface UnlistedRow {
    sku: string;
    name: string;
    count: number;
    style: Record<string, unknown>;
    statslink?: string;
    recent: boolean;
    bptfPrice?: Record<string, unknown>;
}

export default {
    components: {
        message,
        gridItem,
        priceModal
    },

    data() {
        return {
            messages: [] as Message[],
            items: [] as UnlistedRow[],
            itemCount: 0,
            recentCount: 0,
            updatedAt: 0,
            loading: false,
            listing: false,
            error: '',
            inventoryUnsupported: false,
            search: '',
            showFilter: 'all',
            selectedSkus: [] as string[]
        };
    },

    computed: {
        filteredItems(): UnlistedRow[] {
            const term = this.search.trim().toLowerCase();

            return this.items.filter((item) => {
                if (this.showFilter === 'recent' && !item.recent) {
                    return false;
                }

                if (!term) {
                    return true;
                }

                return item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
            });
        },

        allVisibleSelected(): boolean {
            return this.filteredItems.length > 0 && this.filteredItems.every((item) => this.selectedSkus.includes(item.sku));
        },

        updatedLabel(): string {
            if (!this.updatedAt) {
                return '—';
            }

            return new Date(this.updatedAt).toLocaleString();
        }
    },

    methods: {
        displayItem(item: UnlistedRow) {
            return {
                sku: item.sku,
                name: item.name,
                style: item.style,
                amount: item.count,
                intent: 1,
                enabled: false,
                autoprice: true,
                buy: { string: '—' },
                sell: { string: 'Not listed' },
                bptfPrice: item.bptfPrice
            };
        },

        addMessage(msg: string, type: Message['type'] = 'info') {
            this.messages.push({ msg, type });
        },

        msgClose(index: number) {
            this.messages.splice(index, 1);
        },

        toggleSelect(sku: string) {
            const index = this.selectedSkus.indexOf(sku);
            if (index === -1) {
                this.selectedSkus.push(sku);
            } else {
                this.selectedSkus.splice(index, 1);
            }
        },

        toggleSelectAllVisible() {
            if (this.allVisibleSelected) {
                const visible = new Set(this.filteredItems.map((item) => item.sku));
                this.selectedSkus = this.selectedSkus.filter((sku) => !visible.has(sku));
                return;
            }

            for (const item of this.filteredItems) {
                if (!this.selectedSkus.includes(item.sku)) {
                    this.selectedSkus.push(item.sku);
                }
            }
        },

        listOne(item: UnlistedRow) {
            (this.$refs.priceModal as InstanceType<typeof priceModal>).show(false, {
                sku: item.sku,
                name: item.name,
                max: Math.max(1, item.count),
                min: 0,
                intent: 1,
                enabled: true,
                autoprice: true
            });
        },

        async listSelected() {
            if (this.selectedSkus.length === 0) {
                return;
            }

            this.listing = true;

            try {
                const response = await fetch('/pricelist/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: this.selectedSkus.join('\n'),
                        intent: 1,
                        autoprice: true,
                        min: 0,
                        max: 1,
                        group: 'all',
                        buy_keys: 0,
                        buy_metal: 0,
                        sell_keys: 0,
                        sell_metal: 0
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.addMessage(`Listed ${this.selectedSkus.length} item(s) for sale.`, 'Success');
                    this.selectedSkus = [];
                    await this.loadItems();
                } else {
                    this.addMessage(result.msg?.message || 'Bulk list failed.', 'Danger');
                }
            } catch (err) {
                this.addMessage('Bulk list failed.', 'Danger');
                console.error(err);
            } finally {
                this.listing = false;
            }
        },

        onItemListed() {
            this.addMessage('Item added to pricelist.', 'Success');
            this.loadItems();
        },

        async loadItems() {
            this.loading = true;
            this.error = '';
            this.inventoryUnsupported = false;

            try {
                const response = await fetch('/unlisted', {
                    headers: { Accept: 'application/json' }
                });
                const payload = await response.json();

                if (!response.ok || !payload.success) {
                    this.error = payload.error || 'Failed to load unlisted inventory.';
                    this.inventoryUnsupported = response.status === 503;
                    this.items = [];
                    this.itemCount = 0;
                    this.recentCount = 0;
                    return;
                }

                this.items = payload.data.items;
                this.itemCount = payload.data.itemCount;
                this.recentCount = payload.data.recentCount;
                this.updatedAt = payload.data.updatedAt;
            } catch (err) {
                this.error = 'Failed to load unlisted inventory.';
                console.error(err);
            } finally {
                this.loading = false;
            }
        }
    },

    mounted() {
        this.loadItems();
    },

    name: 'unlistedPage'
};
</script>

<style scoped lang="scss">
.unlisted-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 1rem;
}

.unlisted-card-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.unlisted-card-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.15rem 0.35rem;
}

.recent-badge,
.count-badge {
    padding: 0.2rem 0.45rem;
    font-family: "Oswald", sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.recent-badge {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.22);
}

.count-badge {
    color: #c8dff8;
    background: rgba(45, 90, 138, 0.22);
}

.unlisted-empty {
    padding: 2rem;
    text-align: center;
}

.unlisted-empty h2 {
    margin-bottom: 0.5rem;
}

.tf2-alert {
    border-radius: 0;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
}
</style>
