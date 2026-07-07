<template>
    <div class="item-table-wrap">
        <div class="table-responsive">
            <table class="table item-table align-middle">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Mode</th>
                        <th>Your Buy</th>
                        <th>backpack.tf Buy</th>
                        <th>Your Sell</th>
                        <th>backpack.tf Sell</th>
                        <th>Stock</th>
                    </tr>
                </thead>

                <tbody>
                    <tr
                        class="item-row"
                        v-for="item in filtered"
                        :key="item.sku"
                        @click="$emit('itemClick', item)"
                    >
                        <td>
                            <div class="item-main">
                                <div
                                    class="item-icon"
                                    :style="{
                                        backgroundImage: `url(${item.style?.image_small}), url(${item.style?.effect})`,
                                        backgroundColor: item.style?.quality_color,
                                        borderColor: item.style?.border_color,
                                        borderStyle: item.style?.craftable === false ? 'dashed' : 'solid',
                                        opacity: item.enabled ? 1 : 0.45
                                    }"
                                >
                                    <svg
                                        class="bi bi-check item-check"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                        v-if="multiSelect && multiSelect.includes(item.sku)"
                                    >
                                        <path
                                            fill-rule="evenodd"
                                            d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"
                                            clip-rule="evenodd"
                                        />
                                    </svg>
                                </div>

                                <div class="item-title-block">
                                    <a
                                        v-if="item.statslink"
                                        :href="item.statslink"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="item-title item-title-link"
                                        :title="'View on backpack.tf: ' + (item.name || item.sku)"
                                        @click.stop
                                    >
                                        {{ item.name || 'Unknown item' }}
                                    </a>

                                    <div v-else class="item-title">
                                        {{ item.name || 'Unknown item' }}
                                    </div>

                                    <div class="item-meta">
                                        <button
                                            type="button"
                                            class="sku-pill sku-copy"
                                            :class="{ copied: copiedSku === item.sku }"
                                            :title="copiedSku === item.sku ? 'Copied!' : 'Click to copy SKU'"
                                            @click.stop="copySku(item.sku)"
                                        >
                                            {{ copiedSku === item.sku ? 'Copied!' : item.sku }}
                                        </button>

                                        <span class="status-pill enabled" v-if="item.enabled">
                                            Enabled
                                        </span>

                                        <span class="status-pill disabled" v-else>
                                            Disabled
                                        </span>

                                        <span class="status-pill auto" v-if="item.autoprice">
                                            Autoprice
                                        </span>

                                        <span class="status-pill manual" v-else>
                                            Manual
                                        </span>

                                        <span class="status-pill ks" v-if="item.skuDetails?.killstreak">
                                            {{ item.skuDetails.killstreak }}
                                        </span>

                                        <span class="status-pill sheen" v-if="item.skuDetails?.sheen">
                                            {{ item.skuDetails.sheen }}
                                        </span>

                                        <span class="status-pill killstreaker" v-if="item.skuDetails?.killstreaker">
                                            {{ item.skuDetails.killstreaker }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <td>
                            <span class="intent-pill" :class="intentClass(item.intent)">
                                {{ intentText(item.intent) }}
                            </span>
                        </td>

                        <td>
                            <div class="price-cell buy">
                                {{ item.buy?.string || '—' }}
                            </div>
                        </td>

                        <td>
                            <div class="reference-cell" :class="referenceClass(item, 'buy')">
                                <span>{{ referencePrice(item, 'buy') }}</span>
                                <small>{{ referenceCaption(item, 'buy') }}</small>
                            </div>
                        </td>

                        <td>
                            <div class="price-cell sell">
                                {{ item.sell?.string || '—' }}
                            </div>
                        </td>

                        <td>
                            <div class="reference-cell" :class="referenceClass(item, 'sell')">
                                <span>{{ referencePrice(item, 'sell') }}</span>
                                <small>{{ referenceCaption(item, 'sell') }}</small>
                            </div>
                        </td>

                        <td @click.stop>
                            <div class="stock-panel" :title="'Keep between ' + item.min + ' and ' + item.max + ' in stock'">
                                <div class="stock-slot">
                                    <span class="stock-slot-label">Min</span>
                                    <strong class="stock-slot-value">{{ item.min }}</strong>
                                </div>
                                <div class="stock-slot stock-slot-max">
                                    <span class="stock-slot-label">Max</span>
                                    <strong class="stock-slot-value">{{ item.max }}</strong>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <tr v-if="filtered.length === 0">
                        <td colspan="7">
                            <div class="empty-state">
                                No items match your current filters.
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import { Pricelist } from '../../../common/types/pricelist';
import { PropType } from 'vue';

export default {
    emits: ['itemClick'],

    props: {
        pricelist: Object as PropType<Pricelist>,
        filter: Function,
        multiSelect: Array
    },

    name: 'itemList.vue',

    data() {
        return {
            copiedSku: null as string | null,
            copyTimer: null as ReturnType<typeof setTimeout> | null
        };
    },

    computed: {
        filtered() {
            // @ts-ignore
            return this.pricelist ? Object.values(this.pricelist).filter(this.filter) : [];
        }
    },

    methods: {
        async copySku(sku: string) {
            if (!sku) {
                return;
            }

            try {
                await navigator.clipboard.writeText(sku);
            } catch {
                const input = document.createElement('textarea');
                input.value = sku;
                input.style.position = 'fixed';
                input.style.opacity = '0';
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }

            this.copiedSku = sku;

            if (this.copyTimer) {
                clearTimeout(this.copyTimer);
            }

            this.copyTimer = setTimeout(() => {
                if (this.copiedSku === sku) {
                    this.copiedSku = null;
                }
            }, 1600);
        },

        intentText(intent: number) {
            return intent === 2 ? 'Bank' : intent === 1 ? 'Sell' : 'Buy';
        },

        intentClass(intent: number) {
            return intent === 2 ? 'bank' : intent === 1 ? 'sell' : 'buy';
        },

        referencePrice(item: any, side: 'buy' | 'sell') {
            if (!item.bptfPrice) {
                return 'Loading…';
            }

            return item.bptfPrice?.[side]?.string || 'Not priced';
        },

        referenceCaption(item: any, side: 'buy' | 'sell') {
            if (!item.bptfPrice) {
                return 'live check';
            }

            if (item.bptfPrice.status === 'unavailable') {
                return 'price service down';
            }

            if (!item.bptfPrice?.[side]) {
                return item.bptfPrice.status === 'unpriced' ? 'no ref price' : 'missing side';
            }

            const bot = item?.[side];
            const ref = item.bptfPrice?.[side];

            if (bot && ref) {
                const botMetal = Number(bot.keys || 0) * 9 + Number(bot.metal || 0);
                const refMetal = Number(ref.keys || 0) * 9 + Number(ref.metal || 0);

                if (botMetal > refMetal) {
                    return 'you pay more';
                }

                if (botMetal < refMetal) {
                    return 'you pay less';
                }

                return 'matches bptf';
            }

            return item.bptfPrice.source || 'reference';
        },

        referenceClass(item: any, side: 'buy' | 'sell') {
            if (!item.bptfPrice) {
                return 'loading';
            }

            if (item.bptfPrice.status === 'unavailable') {
                return 'missing unavailable';
            }

            if (!item.bptfPrice?.[side]) {
                return 'missing';
            }

            const bot = item?.[side];
            const ref = item.bptfPrice?.[side];

            if (!bot || !ref) {
                return side;
            }

            const botMetal = Number(bot.keys || 0) * 9 + Number(bot.metal || 0);
            const refMetal = Number(ref.keys || 0) * 9 + Number(ref.metal || 0);

            if (botMetal === refMetal) {
                return 'same';
            }

            return botMetal > refMetal ? 'higher' : 'lower';
        }
    },

    beforeUnmount() {
        if (this.copyTimer) {
            clearTimeout(this.copyTimer);
        }
    }
};
</script>

<style scoped lang="scss">
.item-table-wrap {
    overflow: hidden;
    background: linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.45);
}

.item-table {
    margin-bottom: 0;
}

.item-table thead th {
    padding: 0.95rem 0.85rem;
    background: rgba(0, 0, 0, 0.22);
}

.item-row {
    cursor: pointer;
}

.item-row td {
    padding: 0.85rem 0.85rem;
}

.item-main {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 340px;
}

.item-icon {
    width: 62px;
    height: 62px;
    flex: 0 0 62px;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    position: relative;
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.35);
}

.item-title-block {
    min-width: 0;
}

.item-title {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 0.4rem;
    letter-spacing: 0.02em;
}

.item-title-link {
    display: inline-block;
    color: #f0c060;
    text-decoration: none;
    border-bottom: 1px dashed rgba(240, 192, 96, 0.45);
    transition: color 120ms ease, border-color 120ms ease;
}

.item-title-link:hover {
    color: #ffe8c0;
    border-bottom-color: rgba(255, 232, 192, 0.75);
}

.item-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.sku-pill,
.status-pill,
.intent-pill {
    display: inline-flex;
    align-items: center;
    font-family: "Oswald", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    line-height: 1;
    padding: 0.38rem 0.55rem;
    border: 1px solid rgba(0, 0, 0, 0.35);
}

.sku-pill {
    color: #c8dff8;
    background: rgba(45, 90, 138, 0.35);
}

.sku-copy {
    appearance: none;
    cursor: pointer;
    font: inherit;
    border: 1px solid rgba(90, 142, 200, 0.35);
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.sku-copy:hover {
    color: #fff;
    background: rgba(45, 90, 138, 0.55);
    border-color: rgba(90, 142, 200, 0.65);
}

.sku-copy.copied {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.35);
    border-color: rgba(124, 179, 86, 0.55);
}

.status-pill.enabled {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.35);
}

.status-pill.disabled {
    color: #ffd0ca;
    background: rgba(156, 52, 40, 0.35);
}

.status-pill.auto {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.35);
}

.status-pill.manual {
    color: #d4c4a8;
    background: rgba(107, 93, 79, 0.35);
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

.intent-pill.bank {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.35);
}

.intent-pill.sell {
    color: #ffd0ca;
    background: rgba(156, 52, 40, 0.35);
}

.intent-pill.buy {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.35);
}

.price-cell,
.reference-cell {
    display: inline-flex;
    min-width: 104px;
    justify-content: center;
    align-items: center;
    padding: 0.45rem 0.65rem;
    font-family: "Oswald", sans-serif;
    font-weight: 600;
    white-space: nowrap;
    border: 2px solid;
}

.price-cell.buy {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.18);
    border-color: #7cb356 #2a4018 #2a4018 #7cb356;
}

.price-cell.sell {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.18);
    border-color: #f0c060 #6a3810 #6a3810 #f0c060;
}

.reference-cell {
    flex-direction: column;
    gap: 0.1rem;
    min-width: 118px;
    color: #c8dff8;
    background: rgba(45, 90, 138, 0.18);
    border-color: #5a8ec8 #142840 #142840 #5a8ec8;
}

.reference-cell small {
    color: rgba(212, 196, 168, 0.72) !important;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.reference-cell.same,
.reference-cell.lower {
    color: #d8f0c8;
    background: rgba(90, 140, 58, 0.18);
    border-color: #7cb356 #2a4018 #2a4018 #7cb356;
}

.reference-cell.higher {
    color: #ffd0ca;
    background: rgba(156, 52, 40, 0.18);
    border-color: #e07070 #5a1810 #5a1810 #e07070;
}

.reference-cell.loading,
.reference-cell.missing {
    color: #a89880;
    background: rgba(0, 0, 0, 0.18);
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
}

.stock-panel {
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(52px, 1fr));
    gap: 0.35rem;
    min-width: 118px;
    padding: 0.35rem;
    background: rgba(0, 0, 0, 0.22);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
}

.stock-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.35rem 0.45rem;
    background: rgba(90, 140, 58, 0.12);
    border: 1px solid rgba(124, 179, 86, 0.25);
}

.stock-slot-max {
    background: rgba(196, 112, 32, 0.12);
    border-color: rgba(240, 192, 96, 0.25);
}

.stock-slot-label {
    color: #a89880;
    font-family: "Oswald", sans-serif;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.stock-slot-value {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
    font-size: 1rem;
    line-height: 1;
}

.empty-state {
    padding: 2rem;
    text-align: center;
    color: #a89880;
}

@media (max-width: 1100px) {
    .item-main {
        min-width: 280px;
    }

    .item-table {
        min-width: 1120px;
    }
}
</style>
