<template>
    <div
        class="item-card m-2"
        :style="{
            backgroundImage: `url(${item.style?.effect})`,
            opacity: (item.enabled ?? true) ? 1 : 0.55,
            borderColor: item.style?.border_color
        }"
        @click="$emit('itemClick', item)"
    >
        <div
            class="item-art"
            :style="{
                backgroundImage: `url(${item.style?.image_small})`,
                backgroundColor: item.style?.quality_color,
                borderStyle: item.style?.craftable ? 'solid' : 'dashed'
            }"
        ></div>

        <div class="item-card-top">
            <span class="intent-chip">{{ intentLabel }}</span>
            <span v-if="item.autoprice" class="auto-chip">Auto</span>
            <span v-else class="manual-chip">Manual</span>
        </div>

        <div class="item-card-body" v-if="!selected">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-card-prices">
                <span>B {{ item.buy?.string ?? '—' }}</span>
                <span>S {{ item.sell?.string ?? '—' }}</span>
            </div>
            <div class="item-reference" v-if="showReference">
                bptf {{ item.bptfPrice?.sell?.string || item.bptfPrice?.buy?.string || 'loading…' }}
            </div>
        </div>

        <svg class="bi bi-check item-check" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" v-else-if="selected">
            <path fill-rule="evenodd" d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"/>
        </svg>

        <div v-if="item.amount" class="item-count">
            <b>{{ item.amount }}×</b>
        </div>

        <div class="ks">
            <b>{{ item.style?.killstreak }}</b>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'item.vue',
    props: {
        item: Object,
        selected: Boolean
    },
    emits: ['itemClick'],
    computed: {
        intentLabel() {
            // @ts-ignore
            return this.item?.intent === 2 ? 'Bank' : this.item?.intent === 1 ? 'Sell' : 'Buy';
        },

        showReference() {
            // @ts-ignore
            return this.item && Object.prototype.hasOwnProperty.call(this.item, 'bptfPrice');
        }
    }
};
</script>

<style scoped lang="scss">
%unselectable {
    user-select: none;
}

.item-card {
    width: 168px;
    height: 208px;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 40%),
        linear-gradient(180deg, #3a3430 0%, #2b2622 100%);
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 20px rgba(0, 0, 0, 0.4);
    transition: transform 120ms ease, box-shadow 120ms ease;
    @extend %unselectable;
}

.item-card:hover {
    transform: translateY(-3px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 14px 30px rgba(0, 0, 0, 0.5);
}

.item-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.55));
    pointer-events: none;
}

.item-art {
    position: absolute;
    left: 50%;
    top: 52px;
    width: 104px;
    height: 104px;
    transform: translateX(-50%);
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.35);
    z-index: 1;
}

.item-card-top {
    position: absolute;
    z-index: 2;
    top: 0.55rem;
    left: 0.55rem;
    right: 0.55rem;
    display: flex;
    justify-content: space-between;
    gap: 0.35rem;
}

.intent-chip,
.auto-chip,
.manual-chip {
    padding: 0.3rem 0.45rem;
    font-family: "Oswald", sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #ece5d8;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.45);
}

.auto-chip {
    color: #ffe8c0;
}

.manual-chip {
    color: #c8dff8;
}

.item-card-body {
    position: absolute;
    z-index: 2;
    left: 0.65rem;
    right: 0.65rem;
    bottom: 0.65rem;
    text-align: center;
}

.item-name {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.15;
    max-height: 2rem;
    overflow: hidden;
    margin-bottom: 0.4rem;
}

.item-card-prices,
.item-reference {
    display: grid;
    gap: 0.15rem;
    color: #d4c4a8;
    font-family: "Oswald", sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
}

.item-reference {
    margin-top: 0.3rem;
    color: #c8dff8;
    background: rgba(45, 90, 138, 0.28);
    border: 1px solid rgba(90, 142, 200, 0.35);
    padding: 0.2rem 0.35rem;
}

.ks,
.item-count {
    position: absolute;
    z-index: 2;
    color: #fff;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
    font-family: "Oswald", sans-serif;
}

.ks {
    bottom: 0.3rem;
    left: 0.45rem;
}

.item-count {
    top: 3rem;
    right: 0.55rem;
}

.item-check {
    position: absolute;
    z-index: 3;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    color: #7cb356;
    font-size: 4rem;
}
</style>
