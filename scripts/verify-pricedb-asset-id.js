#!/usr/bin/env node
/**
 * Smoke test: panel passes asset ids for single-asset unlisted items (pricedb priceKey).
 * Run: node scripts/verify-pricedb-asset-id.js
 */
const { findPricelistEntryBySkuOrId } = require('../dist/server/utils/pricelistEntries');

function assert(condition, message) {
	if (!condition) {
		console.error('FAIL:', message);
		process.exit(1);
	}
}

const assetId = '12345678901';
const pricelist = [
	{
		sku: '440;7',
		id: assetId,
		max: 1,
		min: 0,
		buy: { keys: 0, metal: 0 },
		sell: { keys: 1, metal: 0 },
		enabled: true,
		intent: 1,
		autoprice: false,
		promoted: 0,
		group: 'all',
		note: { buy: null, sell: null }
	}
];

const found = findPricelistEntryBySkuOrId(pricelist, '440;7', assetId);
assert(found && String(found.id) === assetId, 'findPricelistEntryBySkuOrId should match asset-keyed entry');

const wrongAsset = findPricelistEntryBySkuOrId(pricelist, '440;7', '99999999999');
assert(wrongAsset && wrongAsset.sku === '440;7', 'unknown asset id should fall back to sku match');

console.log('OK: pricedb asset-id lookup verified');
