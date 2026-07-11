import { PricelistItem } from '../../common/types/pricelist';

export function isPricelistItem(ret: unknown): ret is PricelistItem {
	return !!ret && typeof ret === 'object' && typeof (ret as PricelistItem).sku === 'string';
}

export function getBotItemError(ret: unknown): string | null {
	if (ret == null) {
		return 'No response from bot';
	}

	if (typeof ret === 'string') {
		return ret;
	}

	if (isPricelistItem(ret)) {
		return null;
	}

	if (typeof ret === 'object') {
		const obj = ret as Record<string, unknown>;
		if (typeof obj.message === 'string' && obj.message) {
			return obj.message;
		}
	}

	return 'Failed to update pricelist';
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

export function prepareItemForSave(item: PricelistItem): void {
	item.buy = item.buy || { keys: 0, metal: 0 };
	item.sell = item.sell || { keys: 0, metal: 0 };

	const wantsManualSell = Number(item.intent) !== 0 && hasManualPrice(item, 'sell');
	const wantsManualBuy = Number(item.intent) !== 1 && hasManualPrice(item, 'buy');

	if (wantsManualSell || wantsManualBuy) {
		item.autoprice = false;
	}

	if (item.autoprice) {
		item.buy = { keys: 0, metal: 0 };
		item.sell = { keys: 0, metal: 0 };
	}
}
