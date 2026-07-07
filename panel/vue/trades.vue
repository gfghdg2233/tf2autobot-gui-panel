<template>
    <div class="container page-shell trades-page">
        <div class="page-hero">
            <div>
                <p class="eyebrow mb-1">Trade Log</p>
                <h1 class="mb-1">Trade History</h1>
                <p>Review accepted and declined trades from your Mann Co. trading bot.</p>
            </div>

            <div class="settings-hero-meta">
                <span>{{ tradeCount }} total</span>
                <span>{{ tradeList.length }} loaded</span>
            </div>
        </div>

        <div class="glass-panel mb-4 trade-filters">
            <div class="row g-3 align-items-end">
                <div class="col-lg-6">
                    <label class="form-label">Search trades</label>
                    <input class="form-control form-control-lg" id="searchPricelist" type="search" placeholder="Search trade ID or partner SteamID" aria-label="Search" autocomplete="off" v-model="search">
                </div>

                <div class="col-lg-3">
                    <label class="form-label" for="order">Sort trades by time</label>
                    <select name="intent" class="form-select form-select-lg" id="order" v-model="order">
                        <option value="1">Newest to oldest</option>
                        <option value="0">Oldest to newest</option>
                    </select>
                </div>

                <div class="col-lg-3">
                    <div class="accepted-toggle">
                        <div class="form-check form-switch mb-0">
                            <input class="form-check-input" type="checkbox" name="acceptedOnly" id="acceptedOnly" v-model="acceptedOnly"/>
                            <label class="form-check-label" for="acceptedOnly">Accepted only</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="tradeList" class="trade-list">
            <div class="trade-card" v-for="trade in tradeList" :key="trade.id" :class="trade.accepted ? 'accepted' : 'declined'">
                <div class="trade-card-header">
                    <div>
                        <span class="trade-status">{{ trade.accepted ? 'Accepted' : 'Declined' }}</span>
                        <h2>Trade #{{ trade.id }}</h2>
                        <p>
                            {{ trade.datetime }} ·
                            <a :href="trade.partnerProfileUrl" target="_blank" rel="noopener" class="steam-profile">{{ trade.partnerName }}</a>
                            <span v-if="trade.partnerTradeHistoryUrl">
                                ·
                                <a :href="trade.partnerTradeHistoryUrl" target="_blank" rel="noopener" class="steam-history">Trade history</a>
                            </span>
                        </p>
                    </div>

                    <div class="trade-result">
                        <span>{{ trade.accepted ? 'Profit' : 'Reason' }}</span>
                        <strong>{{ trade.accepted ? trade.profit : trade.lastState }}</strong>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-xl-6 item-list">
                        <div class="trade-side-heading">
                            <span>Our items</span>
                            <strong>{{ trade.hasOwnProperty('value') ? `${trade.value?.our?.keys} keys, ${trade.value?.our?.metal} metal` : '' }}</strong>
                        </div>
                        <div class="trade-items-list">
                            <trade-item-row
                                v-for="item in trade.items.our"
                                :key="item.sku + '-our-' + item.amount"
                                :item="Object.assign({}, items[item.sku], item)"
                            ></trade-item-row>
                        </div>
                    </div>

                    <div class="col-xl-6 item-list">
                        <div class="trade-side-heading">
                            <span>Their items</span>
                            <strong>{{ trade.hasOwnProperty('value') ? `${trade.value?.their?.keys} keys, ${trade.value?.their?.metal} metal` : '' }}</strong>
                        </div>
                        <div class="trade-items-list">
                            <trade-item-row
                                v-for="item in trade.items.their"
                                :key="item.sku + '-their-' + item.amount"
                                :item="Object.assign({}, items[item.sku], item)"
                            ></trade-item-row>
                        </div>
                    </div>
                </div>
            </div>

            <button class="btn btn-soft w-100 mt-3" v-if="tradeList.length >= toShow && !loadLock" @click="toShow += 25">
                Show More
            </button>

            <div v-if="loadLock" class="empty-state">
                Loading more trades...
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import tradeItemRow from './components/tradeItemRow.vue';

export default {
    name: 'trades.vue',
    data() {
        return {
            tradeList: [] as any[],
            error: '',
            items: [] as any[],
            toShow: 50,
            search: '',
            order: 1,
            acceptedOnly: 0,
            tradeCount: 0,
            loadLock: false
        };
    },
    components: {
        tradeItemRow
    },
    methods: {
        loadTrades(first = 0, count = 50) {
            this.loadLock = true;
            fetch(`?first=${first}&count=${count}&dir=${this.order}&search=${encodeURIComponent(this.search)}&acceptedOnly=${this.acceptedOnly ? '1' : '0'}`, { headers: {
                Accept: 'application/json'
            } })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        this.tradeCount = data.data.tradeCount;
                        if (first === 0) {
                            this.tradeList = data.data.trades;
                            this.items = data.data.items;
                        } else {
                            this.tradeList = this.tradeList.concat(data.data.trades);
                            this.items = Object.assign(this.items, data.data.items);
                        }
                    } else {
                        this.error = '';
                    }
                })
                .catch((error) => {
                    console.error('Error: ', error);
                })
                .finally(() => {
                    this.loadLock = false;
                });
        },
        scroll() {
            window.onscroll = () => {
                const bottomOfWindow = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop) + window.innerHeight === document.documentElement.offsetHeight;
                if (bottomOfWindow && !this.loadLock && this.toShow < this.tradeCount) {
                    const nuberToAdd = 25;
                    this.loadTrades(this.toShow, nuberToAdd);
                    this.toShow += nuberToAdd;
                }
            };
        }
    },
    watch: {
        order: function() {
            this.toShow = 50;
            this.loadTrades(0, this.toShow);
        },
        search: function() {
            this.toShow = 50;
            this.loadTrades(0, this.toShow);
        },
        acceptedOnly: function() {
            this.toShow = 50;
            this.loadTrades(0, this.toShow);
        }
    },
    created() {
        this.loadTrades();
    },
    mounted() {
        this.scroll();
    }
};
</script>

<style scoped lang="scss">
.trade-filters {
    border-radius: 0;
}

.accepted-toggle {
    display: flex;
    align-items: center;
    min-height: 3rem;
    padding: 0 1rem;
    background: rgba(0, 0, 0, 0.18);
    border: 2px solid;
    border-color: #14110f #6b5d4f #6b5d4f #14110f;
}

.trade-list {
    display: grid;
    gap: 0.85rem;
}

.trade-card {
    padding: 1rem;
    background: linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 8px 24px rgba(0, 0, 0, 0.4);
}

.trade-card.declined {
    border-color: #e07070 #5a1810 #5a1810 #e07070;
}

.trade-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 2px solid rgba(0, 0, 0, 0.28);
}

.trade-card h2 {
    margin: 0.35rem 0 0.2rem;
    font-size: clamp(1.15rem, 2vw, 1.45rem);
}

.trade-card p {
    margin: 0;
    color: #a89880;
}

.trade-status {
    display: inline-flex;
    padding: 0.35rem 0.55rem;
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.28);
    border: 1px solid rgba(124, 179, 86, 0.45);
    font-family: "Oswald", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.declined .trade-status {
    color: #ffd0ca;
    background: rgba(156, 52, 40, 0.28);
    border-color: rgba(224, 112, 112, 0.45);
}

.trade-result {
    min-width: 160px;
    padding: 0.8rem;
    text-align: right;
    background: rgba(0, 0, 0, 0.22);
    border: 2px solid;
    border-color: #14110f #6b5d4f #6b5d4f #14110f;
}

.trade-result span,
.trade-side-heading span {
    display: block;
    color: #a89880;
    font-family: "Oswald", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.trade-result strong {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
}

.trade-side-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.9rem;
    background: rgba(0, 0, 0, 0.18);
    border: 2px solid rgba(0, 0, 0, 0.28);
}

.trade-side-heading strong {
    color: #ece5d8;
    font-size: 0.88rem;
}

.item-list {
    min-width: 0;
}

.steam-profile,
.steam-history {
    color: #c8dff8;
    font-weight: 700;
}

.trade-items-list {
    display: grid;
    gap: 0.35rem;
}

@media (max-width: 768px) {
    .trade-card-header {
        flex-direction: column;
    }

    .trade-result {
        width: 100%;
        text-align: left;
    }

    .trade-side-heading {
        flex-direction: column;
        gap: 0.25rem;
    }
}
</style>
