import { Pricelist, PricelistItem } from '../../common/types/pricelist';

export type PricelistInput = Pricelist | PricelistItem[] | null | undefined;

export function getPricelistEntries(pricelist: PricelistInput): PricelistItem[] {
	if (!pricelist) {
		return [];
	}

	return Array.isArray(pricelist) ? pricelist : Object.values(pricelist);
}
