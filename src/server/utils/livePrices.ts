import axios, { AxiosRequestConfig } from 'axios';
import Currency from '@tf2autobot/tf2-currencies';
import { externalAxiosOptions } from './httpDefaults';

interface RawPrice {
	keys?: number;
	metal?: number;
}

interface RawPricedItem {
	sku: string;
	name?: string;
	source?: string;
	time?: number;
	buy?: RawPrice | null;
	sell?: RawPrice | null;
}

export interface LivePriceSide {
	keys: number;
	metal: number;
	string: string;
}

export interface LivePriceItem {
	sku: string;
	name?: string;
	source: string;
	time?: number;
	buy: LivePriceSide | null;
	sell: LivePriceSide | null;
	status: 'priced' | 'partial' | 'unpriced' | 'unavailable';
	error?: string;
}

let cache: { updatedAt: number; prices: Map<string, LivePriceItem> } = {
	updatedAt: 0,
	prices: new Map()
};

const CACHE_TTL_MS = 60 * 1000;
const PRICE_DB_BULK_LIMIT = 100;
const PRICE_DB_TIMEOUT_MS = 12000;

function normalizePrice(price?: RawPrice | null): LivePriceSide | null {
	if (!price || (price.keys === undefined && price.metal === undefined)) {
		return null;
	}

	const normalized = {
		keys: Number(price.keys || 0),
		metal: Number(price.metal || 0)
	};

	return {
		...normalized,
		string: new Currency(normalized).toString()
	};
}

function normalizePricedItem(item: RawPricedItem): LivePriceItem {
	const buy = normalizePrice(item.buy);
	const sell = normalizePrice(item.sell);

	return {
		sku: item.sku,
		name: item.name,
		source: item.source || 'bptf',
		time: item.time,
		buy,
		sell,
		status: buy && sell ? 'priced' : buy || sell ? 'partial' : 'unpriced'
	};
}

function missingPrice(sku: string): LivePriceItem {
	return {
		sku,
		source: 'pricedb.io',
		buy: null,
		sell: null,
		status: 'unpriced'
	};
}

function unavailablePrice(sku: string, error = 'Price service unavailable'): LivePriceItem {
	return {
		sku,
		source: 'pricedb.io',
		buy: null,
		sell: null,
		status: 'unavailable',
		error
	};
}

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

async function fetchPriceDbBulk(skus: string[]): Promise<Map<string, LivePriceItem>> {
	const prices = new Map<string, LivePriceItem>();

	for (const skuChunk of chunk(skus, PRICE_DB_BULK_LIMIT)) {
		const options: AxiosRequestConfig = {
			method: 'POST',
			url: 'https://pricedb.io/api/items-bulk',
			data: {
				skus: skuChunk
			},
			responseType: 'json',
			timeout: PRICE_DB_TIMEOUT_MS,
			validateStatus: (status) => status >= 200 && status < 500,
			...externalAxiosOptions()
		};

		const { data, status } = await axios(options);

		if (status >= 400) {
			skuChunk.forEach((sku) => prices.set(sku, missingPrice(sku)));
			continue;
		}

		const rawItems: RawPricedItem[] = Array.isArray(data) ? data : data.items || data.prices || [];

		rawItems.forEach((item) => {
			if (item?.sku) {
				prices.set(item.sku, normalizePricedItem(item));
			}
		});

		skuChunk.forEach((sku) => {
			if (!prices.has(sku)) {
				prices.set(sku, missingPrice(sku));
			}
		});
	}

	return prices;
}

async function refreshPrices(skus: string[]): Promise<Map<string, LivePriceItem>> {
	const now = Date.now();
	const uniqueSkus = Array.from(new Set(skus));
	const missingFromCache = uniqueSkus.filter((sku) => !cache.prices.has(sku));
	const cacheIsFresh = cache.updatedAt > now - CACHE_TTL_MS;

	if (cacheIsFresh && missingFromCache.length === 0) {
		return cache.prices;
	}

	const toFetch = cacheIsFresh ? missingFromCache : uniqueSkus;
	const fetched = await fetchPriceDbBulk(toFetch);
	const prices = cacheIsFresh ? new Map(cache.prices) : new Map<string, LivePriceItem>();

	fetched.forEach((price, sku) => prices.set(sku, price));

	cache = {
		updatedAt: now,
		prices
	};

	return cache.prices;
}

export async function getLivePricesForSkus(skus: string[]): Promise<Record<string, LivePriceItem>> {
	const prices = await refreshPrices(skus);
	const response: Record<string, LivePriceItem> = {};

	skus.forEach((sku) => {
		response[sku] = prices.get(sku) || missingPrice(sku);
	});

	return response;
}

export function getLivePriceCacheUpdatedAt(): number {
	return cache.updatedAt;
}

export { missingPrice, unavailablePrice };
