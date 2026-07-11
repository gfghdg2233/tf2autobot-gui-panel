<template>
    <modal id="priceModal" :title="edit ? 'Edit item' : 'Add item'">
        <template v-slot:body>
            <div class="price-modal-body">
                <div class="mb-4">
                    <label class="form-label">Item</label>
                    <item-search v-model="item.name" id="search" :disable="edit" @item="itemSelected"></item-search>
                </div>

                <div class="reference-strip" v-if="edit && item.bptfPrice">
                    <div>
                        <span>backpack.tf buy</span>
                        <strong>{{ item.bptfPrice?.buy?.string || 'Not priced' }}</strong>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-light apply-bptf-btn"
                            v-if="item.bptfPrice?.buy && !item.autoprice"
                            @click="applyBptfPrice('buy')"
                        >
                            Use bptf buy
                        </button>
                    </div>
                    <div>
                        <span>backpack.tf sell</span>
                        <strong>{{ item.bptfPrice?.sell?.string || 'Not priced' }}</strong>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-light apply-bptf-btn"
                            v-if="item.bptfPrice?.sell && !item.autoprice"
                            @click="applyBptfPrice('sell')"
                        >
                            Use bptf sell
                        </button>
                    </div>
                </div>

                <div class="autoprice-warning" v-if="showAutopriceWarning">
                    Autoprice is not available for this item. Turn off autoprice and set a manual price.
                </div>

                <div class="switch-row mb-4">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" name="enabled" id="enabled" v-model="item.enabled" :disabled="!edit"/>
                        <label class="form-check-label" for="enabled">Enabled</label>
                    </div>

                    <div class="form-check form-switch" v-if="item.enabled">
                        <input class="form-check-input" type="checkbox" name="autoprice" id="priceautoprice" v-model="item.autoprice"/>
                        <label class="form-check-label" for="priceautoprice">Autoprice</label>
                    </div>
                </div>

                <div class="row g-3" v-if="item.enabled && item.intent != 1">
                    <div class="col-md-6">
                        <label class="form-label" for="pricebuykeys">Your buy keys</label>
                        <input type="number" class="form-control" id="pricebuykeys" name="buykeys" min="0" placeholder="Keys" required :disabled="item.autoprice" v-model="item.buy.keys">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="pricebuymetal">Your buy metal</label>
                        <input type="number" class="form-control" id="pricebuymetal" name="buymetal" min="0" placeholder="Metal" step="any" required :disabled="item.autoprice" v-model="item.buy.metal">
                    </div>
                </div>

                <div class="row g-3 mt-1" v-if="item.enabled && item.intent != 0">
                    <div class="col-md-6">
                        <label class="form-label" for="pricesellkeys">Your sell keys</label>
                        <input type="number" class="form-control" id="pricesellkeys" name="sellkeys" min="0" placeholder="Keys" required :disabled="item.autoprice" v-model="item.sell.keys">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="pricesellmetal">Your sell metal</label>
                        <input type="number" class="form-control" id="pricesellmetal" name="sellmetal" min="0" placeholder="Metal" step="any" required :disabled="item.autoprice" v-model="item.sell.metal">
                    </div>
                </div>

                <div class="row g-3 mt-1" v-if="item.enabled">
                    <div class="col-md-4" id="priceintentdiv">
                        <label class="form-label" for="priceintent">Intent</label>
                        <select name="intent" class="form-select" id="priceintent" v-model="item.intent">
                            <option value="2">Bank (buy and sell)</option>
                            <option value="0">Buy</option>
                            <option value="1">Sell</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label" for="priceminimum">Minimum stock</label>
                        <input type="number" class="form-control" id="priceminimum" name="min" min="0" required v-model="item.min">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label" for="pricemaximum">Maximum stock</label>
                        <input type="number" class="form-control" id="pricemaximum" name="max" min="0" required v-model="item.max">
                    </div>
                </div>

                <div class="mt-3" v-if="item.enabled && item.intent != 1">
                    <label class="form-label" for="buynote">Buy note</label>
                    <input class="form-control" type="text" name="buynote" id="buynote" v-model="item.note.buy">
                </div>

                <div class="mt-3" v-if="item.enabled && item.intent != 0">
                    <label class="form-label" for="sellnote">Sell note</label>
                    <input class="form-control" type="text" name="sellnote" id="sellnote" v-model="item.note.sell">
                </div>
            </div>
        </template>

        <template v-slot:footer>
            <button type="button" v-if="!edit" class="btn btn-outline-light" @click="resetModal()">Clear</button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="saving">Cancel</button>
            <button type="submit" class="btn btn-primary" @click.prevent="saveItem" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save' }}
            </button>
            <button type="button" v-if="edit" class="btn btn-danger" @click="deleteItem(item)">Delete item</button>
        </template>
    </modal>
</template>

<script lang="ts">
import itemSearch from '../components/itemSearch.vue';
import modal from '../components/modal.vue';
import { PricelistItem } from '../../../common/types/pricelist';
import * as bootstrap from 'bootstrap';

interface data {
    edit: boolean;
    item: PricelistItem;
    modal: bootstrap.Modal;
    saving: boolean;
}

export default {
    components: {
        modal,
        itemSearch
    },
    emits: ['item', 'error'],
    props: ['reloadItems'],
    data(): data {
        return {
            edit: false,
            item: {} as PricelistItem,
            modal: null,
            saving: false
        };
    },
    computed: {
        showAutopriceWarning(): boolean {
            if (!this.item.autoprice) {
                return false;
            }

            const status = this.item.bptfPrice?.status;
            return status === 'unavailable' || status === 'unpriced' || status === 'partial';
        }
    },
    methods: {
        normalizeItem(item: PricelistItem): PricelistItem {
            item.buy = item.buy || { keys: 0, metal: 0 };
            item.sell = item.sell || { keys: 0, metal: 0 };
            item.note = item.note || { buy: null, sell: null };
            return item;
        },
        itemSelected(e: any) {
            this.item.sku = e.sku;
            this.item.name = e.name;
        },
        applyBptfPrice(side: 'buy' | 'sell') {
            const ref = this.item.bptfPrice?.[side];

            if (!ref) {
                return;
            }

            this.item[side] = {
                keys: Number(ref.keys || 0),
                metal: Number(ref.metal || 0)
            };
        },
        show: function(edit: boolean, item?: object) {
            this.resetModal();
            this.edit = edit;
            if (edit) {
                if (item) {
                    this.item = this.normalizeItem(item as PricelistItem);
                } else {
                    this.edit = false;
                }
            } else if (item) {
                Object.assign(this.item, item);
                this.normalizeItem(this.item);
            }
            this.modal.show();
        },
        hide: function() {
            this.modal.hide();
        },
        resetModal() {
            this.item = {
                sku: '',
                name: '',
                max: 1,
                min: 0,
                buy: {
                    keys: 0,
                    metal: 0
                },
                sell: {
                    keys: 0,
                    metal: 0
                },
                promoted: 0,
                group: 'all',
                note: {
                    buy: null,
                    sell: null
                },
                enabled: true,
                intent: 2,
                autoprice: true,
                time: 0
            };
            this.edit = false;
        },
        saveItem() {
            if (!this.item.sku || this.saving) {
                return;
            }

            this.saving = true;

            fetch('/pricelist/item', {
                method: this.edit ? 'PATCH' : 'POST',
                body: JSON.stringify(this.item),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(async (res) => {
                    const payload = await res.json();

                    if (!res.ok || payload?.success === 0) {
                        const message = payload?.msg?.message || (typeof payload === 'string' ? payload : 'Failed to save item');
                        if (/autoprice is not available/i.test(message)) {
                            this.item.autoprice = false;
                        }
                        this.$emit('error', message);
                        return;
                    }

                    if (typeof payload === 'object' && payload.sku) {
                        this.hide();
                        this.$emit('item', { type: this.edit ? 'patch' : 'new', data: payload });
                        return;
                    }

                    this.$emit('error', typeof payload === 'string' ? payload : 'Failed to save item');
                })
                .catch((error) => {
                    console.error('Error: ', error);
                    this.$emit('error', 'Failed to save item');
                })
                .finally(() => {
                    this.saving = false;
                });
        },
        deleteItem() {
            this.hide();
            fetch('/pricelist/item', {
                method: 'DELETE',
                body: JSON.stringify({ sku: this.item.sku }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(res => res.json())
                .then(res => {
                    if (typeof res === 'object') {
                        this.$emit('item', { type: 'del', data: res });
                    } else {
                        console.error(res);
                    }
                })
                .catch((error) => {
                    console.error('Error: ', error);
                });
        }
    },
    created() {
        this.resetModal();
    },
    mounted() {
        this.modal = new bootstrap.Modal(document.getElementById('priceModal'));
    },
    name: 'priceModal'
};
</script>

<style scoped lang="scss">
.price-modal-body {
    color: #ece5d8;
}

.switch-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.85rem 1rem;
    background: rgba(0, 0, 0, 0.18);
    border: 2px solid;
    border-color: #14110f #6b5d4f #6b5d4f #14110f;
}

.reference-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.reference-strip div {
    padding: 0.85rem;
    background: rgba(45, 90, 138, 0.18);
    border: 2px solid;
    border-color: #5a8ec8 #142840 #142840 #5a8ec8;
}

.reference-strip span {
    display: block;
    color: #c8dff8;
    font-family: "Oswald", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.3rem;
}

.reference-strip strong {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
    font-size: 1rem;
}

.apply-bptf-btn {
    margin-top: 0.55rem;
    width: 100%;
}

.autoprice-warning {
    margin-bottom: 1rem;
    padding: 0.75rem 0.9rem;
    color: #ffe8c0;
    background: rgba(196, 112, 32, 0.2);
    border: 2px solid;
    border-color: #c47020 #14110f #14110f #c47020;
    font-size: 0.88rem;
}

input:disabled {
    color: #a89880;
    background-color: rgba(0, 0, 0, 0.22);
    border-color: #14110f;
}

@media (max-width: 576px) {
    .reference-strip {
        grid-template-columns: 1fr;
    }
}
</style>
