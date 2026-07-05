import axios from 'axios';

const FALLBACK_KEY_PRICE = 56;
const CACHE_TTL_MS = 5 * 60 * 1000;
const KEY_SKU = '5021;6';

let cachedKeyPrice: number | null = null;
let cacheTimestamp = 0;
let lastFetchErrorLogged = 0;

interface PriceSide {
    keys?: number;
    metal?: number;
}

interface PricedItem {
    sku: string;
    sell?: PriceSide | null;
    buy?: PriceSide | null;
}

export async function getKeyPrice(): Promise<number> {
    if (cachedKeyPrice !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return cachedKeyPrice;
    }

    try {
        const response = await axios({
            method: 'POST',
            url: 'https://pricedb.io/api/items-bulk',
            data: { skus: [KEY_SKU] },
            responseType: 'json',
            timeout: 12000
        });

        const items = response.data?.items as PricedItem[] | undefined;
        const keyItem = items?.find(item => item.sku === KEY_SKU) ?? items?.[0];
        const metal = keyItem?.sell?.metal;

        if (typeof metal === 'number' && metal > 0) {
            cachedKeyPrice = metal;
            cacheTimestamp = Date.now();
            return cachedKeyPrice;
        }
    } catch (err) {
        if (Date.now() - lastFetchErrorLogged > 5 * 60 * 1000) {
            lastFetchErrorLogged = Date.now();
            console.error('Failed to fetch key price (using fallback):', err?.message ?? err);
        }
    }

    return cachedKeyPrice ?? FALLBACK_KEY_PRICE;
}
