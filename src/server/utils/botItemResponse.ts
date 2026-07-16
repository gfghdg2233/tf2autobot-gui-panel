import { PricelistItem } from '../../common/types/pricelist';
import {
	findPricelistEntryBySku,
	getPricelistEntries,
	isActivelyListedEntry,
	normalizeSku,
	PricelistInput
} from './pricelistEntries';
import { getLivePricesForSkus } from './livePrices';

export { findPricelistEntryBySku, getPricelistEntries, isActivelyListedEntry, normalizeSku, PricelistInput };

export function isPricelistItem(ret: unknown): ret is PricelistItem {
	return !!ret && typeof ret === 'object' && typeof (ret as PricelistItem).sku === 'string';
}

export function getBotItemError(ret: unknown): string | null {
	if (ret == null) {
		return 'No response from bot';
	}

	if (typeof ret === 'string') {
		return ret || 'Unknown bot error';
	}

	if (isPricelistItem(ret)) {
		return null;
	}

	if (typeof ret === 'object') {
		const obj = ret as Record<string, unknown>;
		if (typeof obj.message === 'string' && obj.message) {
			return obj.message;
		}
		if (typeof obj.error === 'string' && obj.error) {
			return obj.error;
		}
	}

	return 'The bot returned an unexpected response';
}

export function isAlreadyPricedError(message: string): boolean {
	return /already priced/i.test(message);
}

export function isAutopriceUnavailableError(message: string): boolean {
	return /unable to get current prices|request failed with status code 404|item is not priced|does not exist/i.test(message);
}

export function formatBotItemError(message: string): string {
	if (isAutopriceUnavailableError(message)) {
		return 'Autoprice is not available for this item. Turn off autoprice and set a manual price.';
	}

	return message;
}

function hasManualPrice(item: PricelistItem, side: 'buy' | 'sell'): boolean {
	const price = item[side];
	return !!price && (Number(price.keys) > 0 || Number(price.metal) > 0);
}

function pricesRoughlyEqual(
	left?: { keys?: number; metal?: number } | null,
	right?: { keys?: number; metal?: number } | null
): boolean {
	return Number(left?.keys || 0) === Number(right?.keys || 0)
		&& Number(left?.metal || 0) === Number(right?.metal || 0);
}

function normalizePanelAutopriceFlags(item: PricelistItem): void {
	item.autopriceSell = item.autopriceSell === true;
	item.autopriceBuy = item.autopriceBuy === true;

	if (item.autoprice) {
		item.autopriceSell = false;
		item.autopriceBuy = false;
	} else if (item.autopriceSell && item.autopriceBuy) {
		item.autopriceBuy = false;
	}
}

function clearPanelAutopriceFlags(item: PricelistItem): void {
	delete item.autopriceSell;
	delete item.autopriceBuy;
}

type LivePriceRef = {
	buy?: { keys?: number; metal?: number } | null;
	sell?: { keys?: number; metal?: number } | null;
};

export function applyPartialAutopriceForPricedb(item: PricelistItem, livePrice?: LivePriceRef | null): void {
	item.buy = item.buy || { keys: 0, metal: 0 };
	item.sell = item.sell || { keys: 0, metal: 0 };
	normalizePanelAutopriceFlags(item);

	if (item.autoprice) {
		const wantsManualSell = Number(item.intent) !== 0 && hasManualPrice(item, 'sell');
		const wantsManualBuy = Number(item.intent) !== 1 && hasManualPrice(item, 'buy');

		if (!item.autopriceSell && !item.autopriceBuy && (wantsManualSell || wantsManualBuy)) {
			item.autoprice = false;
			item.isPartialPriced = false;
			clearPanelAutopriceFlags(item);
			return;
		}

		item.isPartialPriced = false;
		item.buy = { keys: 0, metal: 0 };
		item.sell = { keys: 0, metal: 0 };
		clearPanelAutopriceFlags(item);
		return;
	}

	if (!item.autopriceSell && !item.autopriceBuy) {
		const wantsManualSell = Number(item.intent) !== 0 && hasManualPrice(item, 'sell');
		const wantsManualBuy = Number(item.intent) !== 1 && hasManualPrice(item, 'buy');

		if (wantsManualSell || wantsManualBuy) {
			item.autoprice = false;
			item.isPartialPriced = false;
		}

		clearPanelAutopriceFlags(item);
		return;
	}

	item.autoprice = true;
	item.isPartialPriced = true;

	if (item.autopriceSell && !hasManualPrice(item, 'sell') && livePrice?.sell) {
		item.sell = {
			keys: Number(livePrice.sell.keys || 0),
			metal: Number(livePrice.sell.metal || 0)
		};
	}

	if (item.autopriceBuy && !hasManualPrice(item, 'buy') && livePrice?.buy) {
		item.buy = {
			keys: Number(livePrice.buy.keys || 0),
			metal: Number(livePrice.buy.metal || 0)
		};
	}

	clearPanelAutopriceFlags(item);
}

export function inferPanelAutopriceFlags(item: PricelistItem): void {
	normalizePanelAutopriceFlags(item);

	if (!item.autoprice || !item.isPartialPriced) {
		return;
	}

	const bptf = item.bptfPrice;
	if (!bptf?.buy || !bptf?.sell || !item.buy || !item.sell) {
		return;
	}

	const buyMatches = pricesRoughlyEqual(item.buy, bptf.buy);
	const sellMatches = pricesRoughlyEqual(item.sell, bptf.sell);

	item.autoprice = false;
	item.autopriceSell = false;
	item.autopriceBuy = false;

	if (!buyMatches && sellMatches) {
		item.autopriceSell = true;
	} else if (buyMatches && !sellMatches) {
		item.autopriceBuy = true;
	}
}

export async function prepareItemForBot(item: PricelistItem): Promise<void> {
	item.buy = item.buy || { keys: 0, metal: 0 };
	item.sell = item.sell || { keys: 0, metal: 0 };
	normalizePanelAutopriceFlags(item);

	if (item.autoprice) {
		applyPartialAutopriceForPricedb(item);
		return;
	}

	if (!item.autopriceSell && !item.autopriceBuy) {
		applyPartialAutopriceForPricedb(item);
		return;
	}

	let livePrice: LivePriceRef | null = null;

	try {
		const prices = await getLivePricesForSkus([item.sku]);
		livePrice = prices[item.sku] ?? null;
	} catch {
		livePrice = null;
	}

	applyPartialAutopriceForPricedb(item, livePrice);
}

export function prepareItemForSave(item: PricelistItem): void {
	applyPartialAutopriceForPricedb(item);
}
