import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import { Pricelist } from '../../common/types/pricelist';
import { InventorySnapshot, UnlistedItem } from '../../common/types/inventory';
import getName from '../utils/getName';
import { getImageStyle } from '../utils/getImage';
import getStatsLink from '../utils/getStatsLink';
import { isCurrencySku } from '../utils/currencySkus';
import { getSkuDetails } from '../utils/skuDetails';

const RECENT_TRADE_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInventorySnapshot(raw: unknown): InventorySnapshot {
	if (!raw || typeof raw !== 'object') {
		return { tradable: {}, updatedAt: Date.now() };
	}

	const obj = raw as Record<string, unknown>;

	if (obj.tradable && typeof obj.tradable === 'object') {
		const tradable: Record<string, string[]> = {};

		for (const [sku, value] of Object.entries(obj.tradable as Record<string, unknown>)) {
			if (!Array.isArray(value)) {
				continue;
			}

			tradable[sku] = value
				.map((entry) => {
					if (typeof entry === 'string' || typeof entry === 'number') {
						return String(entry);
					}

					if (entry && typeof entry === 'object' && 'id' in entry) {
						return String((entry as { id: string | number }).id);
					}

					return '';
				})
				.filter(Boolean);
		}

		return {
			tradable,
			nonTradable: obj.nonTradable as InventorySnapshot['nonTradable'],
			updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now()
		};
	}

	// Legacy bots sent a flat tradable dict at the top level.
	const tradable: Record<string, string[]> = {};

	for (const [sku, value] of Object.entries(obj)) {
		if (!Array.isArray(value)) {
			continue;
		}

		tradable[sku] = value
			.map((entry) => {
				if (typeof entry === 'string' || typeof entry === 'number') {
					return String(entry);
				}

				if (entry && typeof entry === 'object' && 'id' in entry) {
					return String((entry as { id: string | number }).id);
				}

				return '';
			})
			.filter(Boolean);
	}

	return { tradable, updatedAt: Date.now() };
}

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

function isActivelyListed(sku: string, pricelist: Pricelist): boolean {
	const entry = pricelist?.[sku];
	if (!entry) {
		return false;
	}

	return entry.enabled !== false && Number(entry.intent) !== 0;
}

export function buildUnlistedItems(
	inventory: InventorySnapshot,
	pricelist: Pricelist,
	polldata: Record<string, unknown> | null | undefined,
	schema: SchemaManager.Schema
): UnlistedItem[] {
	const recentSkus = getRecentlyReceivedSkus(polldata);
	const items: UnlistedItem[] = [];

	for (const [sku, assetids] of Object.entries(inventory.tradable ?? {})) {
		if (!sku || isCurrencySku(sku) || isActivelyListed(sku, pricelist)) {
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
			recent: recentSkus.has(sku),
			skuDetails: getSkuDetails(sku)
		});
	}

	items.sort((a, b) => a.name.localeCompare(b.name));

	return items;
}
