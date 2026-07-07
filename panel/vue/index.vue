<template>
    <div class="container page-shell">
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
        <price-modal ref="priceModal" @item="itemUpdate($event)"></price-modal>

        <div class="page-hero items-hero">
            <div>
                <p class="eyebrow mb-1">Mann Co. Pricelist</p>
                <h1 class="mb-1">Bot Inventory Prices</h1>
                <p>Set your buy/sell prices and compare them live against backpack.tf.</p>
            </div>

            <div class="hero-actions">
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

        <div class="stat-grid mb-4">
            <div class="stat-card stat-card-accent">
                <span>Visible Items</span>
                <strong>{{ filteredCount }}</strong>
            </div>

            <div class="stat-card">
                <span>Backpack.tf Priced</span>
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
                <span>Differs from bptf</span>
                <strong>{{ mismatchCount }}</strong>
            </div>
        </div>

        <div class="glass-panel mb-4 filter-panel">
            <div class="row g-3 align-items-end">
                <div class="col-lg-5">
                    <label class="form-label">Search item name or SKU</label>
                    <input
                        class="form-control form-control-lg"
                        v-model="search"
                        placeholder="Example: Team Captain, 5021;6, unusual..."
                    />
                </div>

                <div class="col-lg-2">
                    <label class="form-label">Intent</label>
                    <select class="form-select form-select-lg" v-model="intentFilter">
                        <option value="all">All intents</option>
                        <option value="2">Bank</option>
                        <option value="1">Sell only</option>
                        <option value="0">Buy only</option>
                    </select>
                </div>

                <div class="col-lg-2">
                    <label class="form-label">Pricing</label>
                    <select class="form-select form-select-lg" v-model="pricingFilter">
                        <option value="all">All pricing</option>
                        <option value="auto">Autoprice</option>
                        <option value="manual">Manual</option>
                        <option value="disabled">Disabled</option>
                        <option value="mismatch">Differs from bptf</option>
                    </select>
                </div>

                <div class="col-lg-3">
                    <button class="btn btn-soft w-100" type="button" @click="loadLivePrices(true)" :disabled="livePriceLoading || pricelistCount === 0">
                        {{ livePriceLoading ? 'Refreshing prices...' : 'Refresh backpack.tf prices' }}
                    </button>
                </div>
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
    </div>
</template>

<script lang="ts">
import message from './components/message.vue';
import bulkAdd from './parts/bulkAddModal.vue';
import itemGrid from './parts/itemGrid.vue';
import itemList from './parts/itemList.vue';
import priceModal from './parts/priceModal.vue';
import { PricelistItem } from '../../common/types/pricelist';

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
        itemList
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
            livePriceTimer: null as any
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
        }
    },

    created() {
        this.loadItems();
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
