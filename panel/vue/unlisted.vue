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

        <price-modal ref="priceModal" @item="onItemListed" @error="onItemListError"></price-modal>

        <div class="page-hero">
            <div>
                <p class="eyebrow mb-1">Inventory</p>
                <h1 class="mb-1">Unlisted Stock</h1>
                <p>Tradable items not actively listed for sale on your pricelist or backpack.tf.</p>
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

        <div class="glass-panel mb-4 filter-panel" v-if="!error">
            <div class="row g-3 align-items-end">
                <div class="col-lg-8">
                    <label class="form-label">Search name or SKU</label>
                    <input
                        class="form-control form-control-lg"
                        v-model="search"
                        placeholder="Example: Team Captain, 440;7..."
                    />
                </div>
                <div class="col-lg-4">
                    <button class="btn btn-soft w-100" type="button" @click="toggleSelectAllVisible()">
                        {{ allVisibleSelected ? 'Clear selection' : 'Select visible' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="unlisted-empty glass-panel" v-if="!loading && !error && filteredItems.length === 0">
            <h2>Nothing to list</h2>
            <p>Every tradable item is already actively listed, or your inventory is empty.</p>
        </div>

        <div class="item-table-wrap" v-if="!error && filteredItems.length > 0">
            <div class="table-responsive">
                <table class="table item-table align-middle unlisted-table">
                    <thead>
                        <tr>
                            <th style="width: 2.5rem"></th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>backpack.tf</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in filteredItems"
                            :key="item.sku"
                            class="item-row"
                            :class="rowClass(item.sku)"
                        >
                            <td>
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    :checked="selectedSkus.includes(item.sku)"
                                    @change="toggleSelect(item.sku)"
                                />
                            </td>
                            <td>
                                <div class="item-main">
                                    <div
                                        class="item-icon"
                                        :style="{
                                            backgroundImage: `url(${item.style?.image_small}), url(${item.style?.effect})`,
                                            backgroundColor: item.style?.quality_color,
                                            borderColor: item.style?.border_color,
                                            borderStyle: item.style?.craftable === false ? 'dashed' : 'solid'
                                        }"
                                    ></div>
                                    <div class="item-title-block">
                                        <a
                                            v-if="item.statslink"
                                            :href="item.statslink"
                                            target="_blank"
                                            rel="noopener"
                                            class="item-title item-title-link"
                                            @click.stop
                                        >
                                            {{ item.name }}
                                        </a>
                                        <div v-else class="item-title">{{ item.name }}</div>
                                        <div class="item-meta">
                                            <span class="sku-pill">{{ item.sku }}</span>
                                            <span class="status-pill recent" v-if="item.recent">Recent</span>
                                            <span class="status-pill ks" v-if="item.skuDetails?.killstreak">{{ item.skuDetails.killstreak }}</span>
                                            <span class="status-pill sheen" v-if="item.skuDetails?.sheen">{{ item.skuDetails.sheen }}</span>
                                            <span class="status-pill killstreaker" v-if="item.skuDetails?.killstreaker">{{ item.skuDetails.killstreaker }}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td><strong>{{ item.count }}</strong></td>
                            <td>{{ bptfPrice(item) }}</td>
                            <td class="text-end unlisted-actions">
                                <button
                                    class="btn btn-sm btn-outline-light"
                                    type="button"
                                    @click="openPriceModal(item)"
                                    :disabled="isRowBusy(item.sku)"
                                >
                                    Price…
                                </button>
                                <button
                                    class="btn btn-sm btn-primary"
                                    type="button"
                                    @click="listOne(item)"
                                    :disabled="isRowBusy(item.sku)"
                                >
                                    {{ listButtonLabel(item.sku) }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import message from './components/message.vue';
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
    skuDetails?: {
        killstreak: string | null;
        sheen: string | null;
        killstreaker: string | null;
    };
    bptfPrice?: {
        sell?: { string?: string };
        buy?: { string?: string };
        status?: string;
    };
}

export default {
    components: {
        message,
        priceModal
    },

    data() {
        return {
            messages: [] as Message[],
            items: [] as UnlistedRow[],
            loading: false,
            listing: false,
            error: '',
            inventoryUnsupported: false,
            search: '',
            selectedSkus: [] as string[],
            listingSkus: [] as string[],
            removingSkus: [] as string[],
            failedSkus: {} as Record<string, string>
        };
    },

    computed: {
        filteredItems(): UnlistedRow[] {
            const term = this.search.trim().toLowerCase();

            return this.items
                .filter((item) => {
                    if (!term) {
                        return true;
                    }

                    return item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
                })
                .sort((a, b) => a.name.localeCompare(b.name));
        },

        allVisibleSelected(): boolean {
            return this.filteredItems.length > 0 && this.filteredItems.every((item) => this.selectedSkus.includes(item.sku));
        }
    },

    methods: {
        bptfPrice(item: UnlistedRow): string {
            if (!item.bptfPrice) {
                return '—';
            }

            return item.bptfPrice.sell?.string || item.bptfPrice.buy?.string || 'Not priced';
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

        rowClass(sku: string): Record<string, boolean> {
            return {
                'is-listing': this.listingSkus.includes(sku),
                'is-removing': this.removingSkus.includes(sku),
                'is-failed': !!this.failedSkus[sku]
            };
        },

        isRowBusy(sku: string): boolean {
            return this.listingSkus.includes(sku) || this.removingSkus.includes(sku);
        },

        listButtonLabel(sku: string): string {
            if (this.removingSkus.includes(sku)) {
                return 'Listed';
            }

            if (this.listingSkus.includes(sku)) {
                return 'Listing…';
            }

            return 'List';
        },

        buildListPayload(item: UnlistedRow) {
            return {
                sku: item.sku,
                name: item.name,
                max: Math.max(1, item.count),
                min: 0,
                intent: 1,
                enabled: true,
                autoprice: true,
                buy: { keys: 0, metal: 0 },
                sell: { keys: 0, metal: 0 },
                promoted: 0,
                group: 'all',
                note: { buy: '', sell: '' }
            };
        },

        getErrorMessage(payload: unknown): string {
            if (typeof payload === 'string' && payload) {
                return payload;
            }

            if (payload && typeof payload === 'object') {
                const obj = payload as { msg?: { message?: string }; message?: string };
                return obj.msg?.message || obj.message || 'Failed to list item.';
            }

            return 'Failed to list item.';
        },

        isListSuccess(payload: unknown): payload is { sku: string } {
            return !!payload && typeof payload === 'object' && typeof (payload as { sku?: string }).sku === 'string';
        },

        markListed(sku: string, name?: string) {
            delete this.failedSkus[sku];
            this.selectedSkus = this.selectedSkus.filter((entry) => entry !== sku);

            if (!this.removingSkus.includes(sku)) {
                this.removingSkus.push(sku);
            }

            if (name) {
                this.addMessage(`Listed ${name} for sale.`, 'Success');
            }

            window.setTimeout(() => {
                this.items = this.items.filter((item) => item.sku !== sku);
                this.removingSkus = this.removingSkus.filter((entry) => entry !== sku);
            }, 650);
        },

        async postListItem(item: UnlistedRow) {
            const response = await fetch('/pricelist/item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.buildListPayload(item))
            });

            return response.json();
        },

        async enqueueToListingQueue(item: UnlistedRow, reason: string) {
            try {
                await fetch('/pricelist/queue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sku: item.sku,
                        name: item.name,
                        count: item.count,
                        reason,
                        style: item.style,
                        statslink: item.statslink,
                        skuDetails: item.skuDetails
                    })
                });
            } catch (err) {
                console.error(err);
            }
        },

        openPriceModal(item: UnlistedRow) {
            (this.$refs.priceModal as InstanceType<typeof priceModal>).show(false, this.buildListPayload(item));
        },

        async listOne(item: UnlistedRow) {
            if (this.isRowBusy(item.sku)) {
                return;
            }

            this.listingSkus.push(item.sku);
            delete this.failedSkus[item.sku];

            try {
                const result = await this.postListItem(item);

                if (this.isListSuccess(result)) {
                    this.markListed(item.sku, item.name);
                    return;
                }

                const message = this.getErrorMessage(result);
                this.failedSkus[item.sku] = message;
                await this.enqueueToListingQueue(item, message);
                this.addMessage(`${item.name}: ${message} Added to queue on Pricelist.`, 'Warning');
            } catch (err) {
                const message = 'Failed to list item.';
                this.failedSkus[item.sku] = message;
                await this.enqueueToListingQueue(item, message);
                this.addMessage(`${item.name}: ${message} Added to queue on Pricelist.`, 'Warning');
                console.error(err);
            } finally {
                this.listingSkus = this.listingSkus.filter((sku) => sku !== item.sku);
            }
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
                    const listed = [...this.selectedSkus];
                    this.addMessage(`Listed ${listed.length} item(s) for sale.`, 'Success');
                    this.selectedSkus = [];
                    for (const sku of listed) {
                        this.markListed(sku);
                    }
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

        onItemListed(event: { data: { sku: string; name?: string } }) {
            this.markListed(event.data.sku, event.data.name);
        },

        onItemListError(message: string) {
            this.addMessage(message, 'Danger');
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
                    return;
                }

                this.items = payload.data.items;
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
.unlisted-table .item-main {
    min-width: 280px;
}

.unlisted-table .item-icon {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
}

.unlisted-table .item-title {
    font-size: 0.9rem;
}

.unlisted-table .item-meta {
    margin-top: 0.25rem;
}

.item-table-wrap {
    overflow: hidden;
    background: linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.45);
}

.unlisted-table {
    margin-bottom: 0;
}

.unlisted-table thead th {
    padding: 0.75rem 0.85rem;
    background: rgba(0, 0, 0, 0.22);
    color: #a89880;
    font-family: "Oswald", sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.unlisted-table td {
    padding: 0.65rem 0.85rem;
    color: #ece5d8;
    border-color: rgba(255, 255, 255, 0.05);
    transition: background-color 0.25s ease, opacity 0.45s ease, transform 0.45s ease;
}

.unlisted-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.45rem;
    white-space: nowrap;
}

.item-row.is-listing {
    background: rgba(240, 192, 96, 0.12);
    animation: unlisted-pulse 0.9s ease-in-out infinite;
}

.item-row.is-removing {
    background: rgba(90, 140, 58, 0.18);
    opacity: 0.35;
    transform: translateX(12px);
}

.item-row.is-failed {
    background: rgba(156, 52, 40, 0.16);
}

@keyframes unlisted-pulse {
    0%,
    100% {
        box-shadow: inset 0 0 0 0 rgba(240, 192, 96, 0);
    }

    50% {
        box-shadow: inset 0 0 0 1px rgba(240, 192, 96, 0.45);
    }
}

.item-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.item-icon {
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}

.sku-pill,
.status-pill {
    display: inline-flex;
    align-items: center;
    font-family: "Oswald", sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 0.28rem 0.45rem;
    border: 1px solid rgba(0, 0, 0, 0.35);
}

.sku-pill {
    color: #c8dff8;
    background: rgba(45, 90, 138, 0.35);
}

.status-pill.recent {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.28);
}

.status-pill.ks {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.28);
}

.status-pill.sheen {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.28);
}

.status-pill.killstreaker {
    color: #ffd0ca;
    background: rgba(156, 52, 40, 0.28);
}

.item-title-link {
    color: #f0c060;
    text-decoration: none;
    border-bottom: 1px dashed rgba(240, 192, 96, 0.45);
}

.unlisted-empty {
    padding: 2rem;
    text-align: center;
}

.tf2-alert {
    border-radius: 0;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
}
</style>
