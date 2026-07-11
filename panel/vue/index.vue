<template>
    <div class="container-fluid page-shell px-0">
        <message
            v-for="(msg, index) in this.messages"
            :key="index"
            :to-remove="index"
            :msg_type="msg.type"
            @close="msgClose"
        >
            {{ msg.msg }}
        </message>

        <bulk-add ref="bulkAdd" :reloadItems="loadItems" @message="this.addMessage"></bulk-add>
        <price-modal ref="priceModal" @item="itemUpdate($event)" @error="onPriceModalError"></price-modal>

        <nav class="sb-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span class="sb-breadcrumb-sep">›</span>
            <span>Pricelist</span>
        </nav>

        <div class="sb-page-head">
            <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
                <div>
                    <h1>Pricelist</h1>
                    <p class="sb-page-sub" v-if="pageTab === 'pricelist'">{{ filteredCount }} of {{ pricelistCount }} items · {{ bptfPricedCount }} with backpack.tf prices</p>
                    <p class="sb-page-sub" v-else>{{ queueCount }} item(s) waiting to be listed manually</p>
                </div>

                <div class="hero-actions p-0">
                    <div class="live-price-chip" :class="{ loading: livePriceLoading }">
                        <span class="live-dot"></span>
                        <span>{{ livePriceLoading ? 'Updating backpack.tf' : 'backpack.tf live' }}</span>
                        <small>{{ livePriceUpdatedLabel }}</small>
                    </div>

                    <button class="btn btn-primary" @click="$refs.priceModal.show()">
                        Add Item
                    </button>

                    <button class="btn btn-outline-light" @click="$refs.bulkAdd.show()">
                        Bulk Add
                    </button>

                    <button class="btn btn-outline-light" @click="grid = !grid">
                        {{ grid ? 'List View' : 'Grid View' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="filter-pill-bar page-tab-bar mb-3" role="tablist" aria-label="Pricelist views">
            <button type="button" class="filter-pill" :class="{ active: pageTab === 'pricelist' }" @click="pageTab = 'pricelist'">
                <span class="filter-pill-dot"></span>
                Pricelist
            </button>
            <button type="button" class="filter-pill" :class="{ active: pageTab === 'queue' }" @click="openQueueTab()">
                <span class="filter-pill-dot"></span>
                Queue
                <span class="queue-count-badge" v-if="queueCount > 0">{{ queueCount }}</span>
            </button>
        </div>

        <template v-if="pageTab === 'pricelist'">
        <div class="stat-grid mb-3">
            <div class="stat-card stat-card-accent">
                <span>Visible</span>
                <strong>{{ filteredCount }}</strong>
            </div>

            <div class="stat-card">
                <span>backpack.tf</span>
                <strong>{{ bptfPricedCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Autopriced</span>
                <strong>{{ autopricedCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Manual</span>
                <strong>{{ manualCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Differs</span>
                <strong>{{ mismatchCount }}</strong>
            </div>
        </div>

        <div class="glass-panel mb-3 filter-panel">
            <div class="toolbar-row mb-3">
                <div class="flex-grow-1" style="min-width: 220px;">
                    <label class="form-label">Search</label>
                    <input
                        class="form-control"
                        v-model="search"
                        placeholder="Item name or SKU..."
                    />
                </div>

                <div style="min-width: 140px;">
                    <label class="form-label">Intent</label>
                    <select class="form-select" v-model="intentFilter">
                        <option value="all">All intents</option>
                        <option value="2">Bank</option>
                        <option value="1">Sell only</option>
                        <option value="0">Buy only</option>
                    </select>
                </div>

                <div>
                    <label class="form-label">&nbsp;</label>
                    <button class="btn btn-primary d-block" type="button" @click="loadLivePrices(true)" :disabled="livePriceLoading || pricelistCount === 0">
                        {{ livePriceLoading ? 'Refreshing…' : 'Apply' }}
                    </button>
                </div>
            </div>

            <div class="filter-pill-bar" role="group" aria-label="Pricing filters">
                <button type="button" class="filter-pill" :class="{ active: pricingFilter === 'all' }" @click="pricingFilter = 'all'">
                    <span class="filter-pill-dot"></span>
                    All
                </button>
                <button type="button" class="filter-pill" :class="{ active: pricingFilter === 'auto' }" @click="pricingFilter = 'auto'">
                    <span class="filter-pill-dot"></span>
                    Autoprice
                </button>
                <button type="button" class="filter-pill" :class="{ active: pricingFilter === 'manual' }" @click="pricingFilter = 'manual'">
                    <span class="filter-pill-dot"></span>
                    Manual
                </button>
                <button type="button" class="filter-pill" :class="{ active: pricingFilter === 'disabled' }" @click="pricingFilter = 'disabled'">
                    <span class="filter-pill-dot"></span>
                    Disabled
                </button>
                <button type="button" class="filter-pill" :class="{ active: pricingFilter === 'mismatch' }" @click="pricingFilter = 'mismatch'">
                    <span class="filter-pill-dot"></span>
                    Differs from bptf
                </button>
            </div>
        </div>

        <item-grid
            v-if="grid"
            :pricelist="pricelist"
            :filter="filterPricelist"
            :multi-select="[]"
            @itemClick="$refs.priceModal.show(true, $event)"
        ></item-grid>

        <item-list
            v-else
            :pricelist="pricelist"
            :filter="filterPricelist"
            :multi-select="[]"
            @itemClick="$refs.priceModal.show(true, $event)"
        ></item-list>
        </template>

        <listing-queue
            v-else
            :items="queueItems"
            :loading="queueLoading"
            @price="openQueueItemPrice"
            @listed="onQueueItemListed"
            @removed="onQueueItemRemoved"
            @error="onQueueError"
            @reload="loadQueue"
        ></listing-queue>
    </div>
</template>

<script lang="ts">
import message from './components/message.vue';
import bulkAdd from './parts/bulkAddModal.vue';
import itemGrid from './parts/itemGrid.vue';
import itemList from './parts/itemList.vue';
import priceModal from './parts/priceModal.vue';
import listingQueue from './parts/listingQueue.vue';
import { PricelistItem } from '../../common/types/pricelist';
import { ListingQueueItem } from '../../common/types/queue';

interface Message {
    msg: string;
    type: 'Success' | 'Danger' | 'Warning' | 'info';
}

interface LivePriceMap {
    [sku: string]: any;
}

export default {
    components: {
        priceModal,
        message,
        bulkAdd,
        itemGrid,
        itemList,
        listingQueue
    },

    data() {
        return {
            messages: [] as Message[],
            pricelist: [] as any[],
            grid: false,
            search: '',
            intentFilter: 'all',
            pricingFilter: 'all',
            livePriceMap: {} as LivePriceMap,
            livePriceUpdatedAt: 0,
            livePriceLoading: false,
            livePriceTimer: null as any,
            pageTab: 'pricelist' as 'pricelist' | 'queue',
            queueItems: [] as ListingQueueItem[],
            queueLoading: false
        };
    },

    computed: {
        pricelistArray(): any[] {
            return Array.isArray(this.pricelist) ? this.pricelist : Object.values(this.pricelist || {});
        },

        pricelistCount(): number {
            return this.pricelistArray.length;
        },

        filteredCount(): number {
            return this.pricelistArray.filter((item: any) => this.filterPricelist(item)).length;
        },

        bptfPricedCount(): number {
            return this.pricelistArray.filter((item: any) => item.bptfPrice && item.bptfPrice.status !== 'unpriced').length;
        },

        autopricedCount(): number {
            return this.pricelistArray.filter((item: any) => item.autoprice === true && item.enabled !== false).length;
        },

        manualCount(): number {
            return this.pricelistArray.filter((item: any) => item.autoprice === false && item.enabled !== false).length;
        },

        disabledCount(): number {
            return this.pricelistArray.filter((item: any) => item.enabled === false).length;
        },

        mismatchCount(): number {
            return this.pricelistArray.filter((item: any) => this.priceDiffersFromBptf(item)).length;
        },

        queueCount(): number {
            return this.queueItems.length;
        },

        livePriceUpdatedLabel(): string {
            if (!this.livePriceUpdatedAt) {
                return 'waiting';
            }

            return new Date(this.livePriceUpdatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    },

    methods: {
        priceToMetal(price?: { keys?: number; metal?: number } | null): number | null {
            if (!price) {
                return null;
            }

            return Number(price.keys || 0) * 9 + Number(price.metal || 0);
        },

        priceDiffersFromBptf(item: any, side?: 'buy' | 'sell'): boolean {
            if (!item?.bptfPrice || item.bptfPrice.status === 'unavailable' || item.bptfPrice.status === 'unpriced') {
                return false;
            }

            const sides: Array<'buy' | 'sell'> = side ? [side] : ['buy', 'sell'];

            return sides.some((priceSide) => {
                const bot = item?.[priceSide];
                const ref = item.bptfPrice?.[priceSide];

                if (!bot || !ref) {
                    return false;
                }

                const botMetal = this.priceToMetal(bot);
                const refMetal = this.priceToMetal(ref);

                return botMetal !== null && refMetal !== null && botMetal !== refMetal;
            });
        },

        filterPricelist(item: any) {
            const query = String(this.search || '').toLowerCase().trim();

            const matchesSearch =
                !query ||
                String(item.name || '').toLowerCase().includes(query) ||
                String(item.sku || '').toLowerCase().includes(query);

            const matchesIntent =
                this.intentFilter === 'all' ||
                String(item.intent) === this.intentFilter;

            let matchesPricing = true;

            if (this.pricingFilter === 'auto') {
                matchesPricing = item.autoprice === true && item.enabled !== false;
            }

            if (this.pricingFilter === 'manual') {
                matchesPricing = item.autoprice === false && item.enabled !== false;
            }

            if (this.pricingFilter === 'disabled') {
                matchesPricing = item.enabled === false;
            }

            if (this.pricingFilter === 'mismatch') {
                matchesPricing = this.priceDiffersFromBptf(item);
            }

            return matchesSearch && matchesIntent && matchesPricing;
        },

        withLivePrices(items: any[]) {
            return items.map((item: any) => ({
                ...item,
                bptfPrice: this.livePriceMap[item.sku] || item.bptfPrice || null
            }));
        },

        msgClose(msg: any) {
            this.messages.splice(msg, 1);
        },

        loadItems() {
            fetch('/pricelist')
                .then((response) => response.json())
                .then((data) => {
                    const items = Array.isArray(data) ? data : Object.values(data || {});
                    this.pricelist = this.withLivePrices(items);
                    this.loadLivePrices();
                })
                .catch((error) => {
                    console.error('Error: ', error);
                });
        },

        emptyLivePriceMap(skus: string[], status = 'unavailable') {
            return skus.reduce((prices: LivePriceMap, sku: string) => {
                prices[sku] = {
                    sku,
                    source: 'pricedb.io',
                    buy: null,
                    sell: null,
                    status
                };

                return prices;
            }, {} as LivePriceMap);
        },

        loadLivePrices(forceAll = false) {
            const visibleItems = this.pricelistArray.filter((item: any) => this.filterPricelist(item));
            const sourceItems = forceAll ? this.pricelistArray : visibleItems;
            const skus = sourceItems.map((item: any) => item.sku).filter(Boolean);

            if (skus.length === 0) {
                return;
            }

            this.livePriceLoading = true;

            fetch('/pricelist/live-prices', {
                method: 'POST',
                body: JSON.stringify({ skus }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => response.json())
                .then((data) => {
                    const prices = data.prices && Object.keys(data.prices).length > 0
                        ? data.prices
                        : this.emptyLivePriceMap(skus, 'unavailable');

                    this.livePriceMap = prices;
                    this.livePriceUpdatedAt = data.updatedAt || Date.now();
                    this.pricelist = this.withLivePrices(this.pricelistArray);

                    if (data.error) {
                        this.addMessage({ msg: data.error, type: 'Warning' });
                    }
                })
                .catch((error) => {
                    console.error('Error loading live reference prices: ', error);
                    this.livePriceMap = this.emptyLivePriceMap(skus, 'unavailable');
                    this.livePriceUpdatedAt = Date.now();
                    this.pricelist = this.withLivePrices(this.pricelistArray);
                    this.addMessage({ msg: 'Unable to load live reference prices right now.', type: 'Warning' });
                })
                .finally(() => {
                    this.livePriceLoading = false;
                });
        },

        addMessage(msg: Message) {
            this.messages.push(msg);
        },

        itemUpdate(item: { type: string; data: PricelistItem }) {
            if (item.type === 'del') {
                this.pricelist.splice(this.pricelist.findIndex((e: PricelistItem) => e.sku === item.data.sku), 1);
            } else if (item.type === 'patch') {
                const index = this.pricelist.findIndex((e: PricelistItem) => e.sku === item.data.sku);

                if (index >= 0) {
                    this.pricelist[index] = this.withLivePrices([item.data])[0];
                }
            } else {
                this.pricelist.push(this.withLivePrices([item.data])[0]);
            }

            this.loadLivePrices();
            this.loadQueue();
        },

        onPriceModalError(message: string) {
            this.addMessage({ msg: message, type: 'Danger' });
        },

        openQueueTab() {
            this.pageTab = 'queue';
            this.loadQueue();
        },

        loadQueue() {
            this.queueLoading = true;

            fetch('/pricelist/queue')
                .then((response) => response.json())
                .then((data) => {
                    this.queueItems = data?.data?.items || [];
                })
                .catch((error) => {
                    console.error('Error loading listing queue: ', error);
                })
                .finally(() => {
                    this.queueLoading = false;
                });
        },

        openQueueItemPrice(item: ListingQueueItem) {
            (this.$refs.priceModal as { show: (edit: boolean, payload?: object) => void }).show(false, {
                sku: item.sku,
                name: item.name,
                max: Math.max(1, item.count || 1),
                min: 0,
                intent: 1,
                enabled: true,
                autoprice: false,
                buy: { keys: 0, metal: 0 },
                sell: { keys: 0, metal: 0 },
                promoted: 0,
                group: 'all',
                note: { buy: '', sell: '' }
            });
        },

        onQueueItemListed(item: ListingQueueItem) {
            this.addMessage({ msg: `Listed ${item.name} for sale.`, type: 'Success' });
            this.loadItems();
            this.loadQueue();
        },

        onQueueItemRemoved(item: ListingQueueItem) {
            this.addMessage({ msg: `Removed ${item.name} from queue.`, type: 'info' });
        },

        onQueueError(message: string) {
            this.addMessage({ msg: message, type: 'Danger' });
        }
    },

    created() {
        this.loadItems();
        this.loadQueue();
    },

    mounted() {
        this.livePriceTimer = setInterval(() => this.loadLivePrices(), 60000);

        const params = new URLSearchParams(window.location.search);
        if (params.get('add') === '1') {
            this.$nextTick(() => {
                (this.$refs.priceModal as { show: () => void }).show();
                window.history.replaceState({}, '', '/');
            });
        }
    },

    beforeUnmount() {
        if (this.livePriceTimer) {
            clearInterval(this.livePriceTimer);
        }
    },

    watch: {
        search() {
            this.loadLivePrices();
        },

        intentFilter() {
            this.loadLivePrices();
        },

        pricingFilter() {
            this.loadLivePrices();
        }
    }
};
</script>
