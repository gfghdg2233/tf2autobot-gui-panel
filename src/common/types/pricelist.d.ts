export type Pricelist = PricelistItem[] | {
    [sku: string]: PricelistItem
}

export interface PricelistItem {
    sku: string
    id?: string;
    name?: string;
    max: number;
    min: number;
    buy: Price;
    sell: Price;
    style?: {
        image_small: string;
        effect: string;
        quality_color: string;
        craftable: boolean;
        border_color: string;
        killstreak: string;
    };
    promoted: number;
    group: string;
    note: {
        buy: null | string,
        sell: null | string
    },
    enabled: boolean;
    intent: number;
    autoprice: boolean;
    autopriceSell?: boolean;
    autopriceBuy?: boolean;
    isPartialPriced?: boolean;
    time: number;
    statslink?: string;
    bptfPrice?: LivePriceItem | null;
    skuDetails?: {
        killstreak: string | null;
        sheen: string | null;
        killstreaker: string | null;
    };
}

interface LivePriceItem {
    sku: string;
    name?: string;
    source: string;
    time?: number;
    buy: Price | null;
    sell: Price | null;
    status: 'priced' | 'partial' | 'unpriced' | 'unavailable';
    error?: string;
}

interface Price {
    keys: number;
    metal: number;
    string?: string;
    total?: number;
}
