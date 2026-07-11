<template>
    <div class="listing-queue-panel">
        <div class="glass-panel mb-3 filter-panel" v-if="items.length > 0">
            <p class="mb-0 queue-copy">
                These items could not be autopriced or listed yet. Set a manual price or retry when a price source is available.
            </p>
        </div>

        <div class="queue-empty glass-panel" v-if="!loading && items.length === 0">
            <h2>Queue is empty</h2>
            <p>Failed unlisted items will appear here until you list them manually.</p>
        </div>

        <div class="item-table-wrap" v-if="items.length > 0">
            <div class="table-responsive">
                <table class="table item-table align-middle queue-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Reason</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in items"
                            :key="item.sku"
                            class="item-row"
                            :class="{ 'is-listing': listingSkus.includes(item.sku), 'is-removing': removingSkus.includes(item.sku) }"
                        >
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
                                        >
                                            {{ item.name }}
                                        </a>
                                        <div v-else class="item-title">{{ item.name }}</div>
                                        <div class="item-meta">
                                            <span class="sku-pill">{{ item.sku }}</span>
                                            <span class="status-pill ks" v-if="item.skuDetails?.killstreak">{{ item.skuDetails.killstreak }}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td><strong>{{ item.count || 1 }}</strong></td>
                            <td class="queue-reason">{{ item.reason }}</td>
                            <td class="text-end queue-actions">
                                <button
                                    class="btn btn-sm btn-outline-light"
                                    type="button"
                                    @click="$emit('price', item)"
                                    :disabled="isRowBusy(item.sku)"
                                >
                                    Set price
                                </button>
                                <button
                                    class="btn btn-sm btn-primary"
                                    type="button"
                                    @click="retryList(item)"
                                    :disabled="isRowBusy(item.sku)"
                                >
                                    {{ listButtonLabel(item.sku) }}
                                </button>
                                <button
                                    class="btn btn-sm btn-outline-danger"
                                    type="button"
                                    @click="removeItem(item)"
                                    :disabled="isRowBusy(item.sku)"
                                >
                                    Remove
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
import { ListingQueueItem } from '../../../common/types/queue';

export default {
    props: {
        items: {
            type: Array as () => ListingQueueItem[],
            default: () => []
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    emits: ['price', 'listed', 'removed', 'error', 'reload'],
    data() {
        return {
            listingSkus: [] as string[],
            removingSkus: [] as string[]
        };
    },
    methods: {
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

            return 'Retry';
        },

        buildPayload(item: ListingQueueItem) {
            return {
                sku: item.sku,
                name: item.name,
                max: Math.max(1, item.count || 1),
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

        async retryList(item: ListingQueueItem) {
            if (this.isRowBusy(item.sku)) {
                return;
            }

            this.listingSkus.push(item.sku);

            try {
                const response = await fetch('/pricelist/item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.buildPayload(item))
                });
                const result = await response.json();

                if (response.ok && result?.sku) {
                    this.removingSkus.push(item.sku);
                    this.$emit('listed', item);
                    window.setTimeout(() => {
                        this.removingSkus = this.removingSkus.filter((sku) => sku !== item.sku);
                        this.$emit('reload');
                    }, 650);
                    return;
                }

                const message = result?.msg?.message || (typeof result === 'string' ? result : 'Retry failed');
                this.$emit('error', `${item.name}: ${message}`);
            } catch (err) {
                this.$emit('error', `${item.name}: Retry failed`);
                console.error(err);
            } finally {
                this.listingSkus = this.listingSkus.filter((sku) => sku !== item.sku);
            }
        },

        async removeItem(item: ListingQueueItem) {
            try {
                const response = await fetch(`/pricelist/queue/${encodeURIComponent(item.sku)}`, {
                    method: 'DELETE'
                });
                const result = await response.json();

                if (result.success) {
                    this.$emit('removed', item);
                    this.$emit('reload');
                } else {
                    this.$emit('error', result?.msg?.message || 'Failed to remove queue item');
                }
            } catch (err) {
                this.$emit('error', 'Failed to remove queue item');
                console.error(err);
            }
        }
    },
    name: 'listingQueuePanel'
};
</script>

<style scoped lang="scss">
.queue-copy {
    color: #c8dff8;
}

.queue-empty {
    padding: 2rem;
    text-align: center;
}

.item-table-wrap {
    overflow: hidden;
    background: linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.45);
}

.queue-table {
    margin-bottom: 0;
}

.queue-table thead th {
    padding: 0.75rem 0.85rem;
    background: rgba(0, 0, 0, 0.22);
    color: #a89880;
    font-family: "Oswald", sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.queue-table td {
    padding: 0.65rem 0.85rem;
    color: #ece5d8;
    border-color: rgba(255, 255, 255, 0.05);
    transition: background-color 0.25s ease, opacity 0.45s ease, transform 0.45s ease;
}

.item-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.item-icon {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}

.item-title {
    font-size: 0.9rem;
}

.item-title-link {
    color: #f0c060;
    text-decoration: none;
    border-bottom: 1px dashed rgba(240, 192, 96, 0.45);
}

.item-meta {
    margin-top: 0.25rem;
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

.status-pill.ks {
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.28);
}

.queue-reason {
    color: #d8c8b0;
    max-width: 320px;
}

.queue-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.45rem;
    white-space: nowrap;
}

.item-row.is-listing {
    background: rgba(240, 192, 96, 0.12);
    animation: queue-pulse 0.9s ease-in-out infinite;
}

.item-row.is-removing {
    background: rgba(90, 140, 58, 0.18);
    opacity: 0.35;
    transform: translateX(12px);
}

@keyframes queue-pulse {
    0%,
    100% {
        box-shadow: inset 0 0 0 0 rgba(240, 192, 96, 0);
    }

    50% {
        box-shadow: inset 0 0 0 1px rgba(240, 192, 96, 0.45);
    }
}
</style>
