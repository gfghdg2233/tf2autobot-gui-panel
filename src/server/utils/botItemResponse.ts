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
