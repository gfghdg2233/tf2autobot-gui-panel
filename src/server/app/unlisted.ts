import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import { Pricelist } from '../../common/types/pricelist';
import { InventorySnapshot, UnlistedItem } from '../../common/types/inventory';
import getName from '../utils/getName';
import { getImageStyle } from '../utils/getImage';
import getStatsLink from '../utils/getStatsLink';
import { isCurrencySku } from '../utils/currencySkus';

const RECENT_TRADE_MS = 7 * 24 * 60 * 60 * 1000;

export function getRecentlyReceivedSkus(polldata: Record<string, unknown> | null | undefined, withinMs = RECENT_TRADE_MS): Set<string> {
	const skus = new Set<string>();
	const cutoff = Date.now() - withinMs;
	const offerData = (polldata?.offerData ?? {}) as Record<string, {
		accepted?: boolean;
		isAccepted?: boolean;
		handledByUs?: boolean;
		finishTimestamp?: number;
		dict?: { their?: Record<string, number> };
	}>;

	for (const offer of Object.values(offerData)) {
		const accepted = offer.accepted === true || (offer.handledByUs === true && offer.isAccepted === true);
		if (!accepted || !offer.finishTimestamp || offer.finishTimestamp < cutoff) {
			continue;
		}

		for (const sku of Object.keys(offer.dict?.their ?? {})) {
			skus.add(sku);
		}
	}

	return skus;
}

export function buildUnlistedItems(
	inventory: InventorySnapshot,
	pricelist: Pricelist,
	polldata: Record<string, unknown> | null | undefined,
	schema: SchemaManager.Schema
): UnlistedItem[] {
	const recentSkus = getRecentlyReceivedSkus(polldata);
	const listedSkus = new Set(Object.keys(pricelist ?? {}));
	const items: UnlistedItem[] = [];

	for (const [sku, assetids] of Object.entries(inventory.tradable ?? {})) {
		if (!sku || listedSkus.has(sku) || isCurrencySku(sku)) {
			continue;
		}

		const count = Array.isArray(assetids) ? assetids.length : 0;
		if (count <= 0) {
			continue;
		}

		items.push({
			sku,
			name: getName(SKU.fromString(sku), schema),
			count,
			style: getImageStyle(sku, schema),
			statslink: getStatsLink(sku, schema),
			recent: recentSkus.has(sku)
		});
	}

	items.sort((a, b) => {
		if (a.recent !== b.recent) {
			return a.recent ? -1 : 1;
		}
		if (b.count !== a.count) {
			return b.count - a.count;
		}
		return a.name.localeCompare(b.name);
	});

	return items;
}
