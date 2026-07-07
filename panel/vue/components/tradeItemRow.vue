<template>
    <div class="trade-item-row">
        <div
            class="trade-item-icon"
            :style="{
                backgroundImage: `url(${item.style?.image_small}), url(${item.style?.effect})`,
                backgroundColor: item.style?.quality_color,
                borderColor: item.style?.border_color,
                borderStyle: item.style?.craftable === false ? 'dashed' : 'solid'
            }"
        ></div>
        <div class="trade-item-body">
            <div class="trade-item-name">{{ item.name }}</div>
            <div class="trade-item-meta">
                <span v-if="item.amount > 1">{{ item.amount }}×</span>
                <span class="trade-item-price">{{ item.price || '—' }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'tradeItemRow',
    props: {
        item: {
            type: Object,
            required: true
        }
    }
};
</script>

<style scoped lang="scss">
.trade-item-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.45rem 0.55rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.trade-item-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border: 2px solid;
    border-color: #6b5d4f #14110f #14110f #6b5d4f;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}

.trade-item-body {
    min-width: 0;
    flex: 1;
}

.trade-item-name {
    color: #ece5d8;
    font-family: "Oswald", sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.trade-item-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.15rem;
    color: #a89880;
    font-size: 0.75rem;
}

.trade-item-price {
    color: #ffe8c0;
    font-family: "Oswald", sans-serif;
    font-weight: 600;
}
</style>
