import { Pricelist, PricelistItem } from '../../common/types/pricelist';

export type PricelistInput = Pricelist | PricelistItem[] | null | undefined;

export function getPricelistEntries(pricelist: PricelistInput): PricelistItem[] {
	if (!pricelist) {
		return [];
	}

	return Array.isArray(pricelist) ? pricelist : Object.values(pricelist);
}

export function normalizeSku(sku: string): string {
	return sku.trim().toLowerCase();
}

export function findPricelistEntryBySku(pricelist: PricelistInput, sku: string): PricelistItem | null {
	const target = normalizeSku(sku);

	return getPricelistEntries(pricelist).find((entry) => normalizeSku(entry.sku) === target) ?? null;
}

export function findPricelistEntryBySkuOrId(
	pricelist: PricelistInput,
	sku: string,
	assetId?: string | null
): PricelistItem | null {
	if (assetId) {
		const id = String(assetId);
		const byId = getPricelistEntries(pricelist).find(
			(entry) => entry.id != null && String(entry.id) === id
		);

		if (byId) {
			return byId;
		}
	}

	return findPricelistEntryBySku(pricelist, sku);
}

export function isActivelyListedEntry(entry: PricelistItem): boolean {
	return entry.enabled !== false && Number(entry.intent) !== 0;
}
