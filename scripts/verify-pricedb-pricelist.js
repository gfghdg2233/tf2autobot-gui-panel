#!/usr/bin/env node
/**
 * Smoke test: panel handles tf2autobot-pricedb pricelist array IPC format.
 * Run: node scripts/verify-pricedb-pricelist.js
 */
const { getPricelistEntries } = require('../dist/server/utils/pricelistEntries');

const sampleItem = {
	sku: '5021;6',
	max: 1,
	min: 1,
	buy: { keys: 0, metal: 0 },
	sell: { keys: 1, metal: 0 },
	enabled: true,
	intent: 2,
	autoprice: false,
	promoted: 0,
	group: 'all',
	note: { buy: null, sell: null },
	time: Date.now()
};

// pricedb sendPricelist() emits an array (see tf2autobot-pricedb IPC.ts)
const pricedbArray = [sampleItem, { ...sampleItem, sku: '5002;6', intent: 0, enabled: false }];

// Legacy keyed-object format
const keyedObject = {
	'5021;6': sampleItem,
	'5002;6': { ...sampleItem, sku: '5002;6', intent: 0, enabled: false }
};

function assert(condition, message) {
	if (!condition) {
		console.error('FAIL:', message);
		process.exit(1);
	}
}

const fromArray = getPricelistEntries(pricedbArray);
assert(fromArray.length === 2, 'array format should yield 2 entries');
assert(fromArray[0].sku === '5021;6', 'array entry sku');

const fromObject = getPricelistEntries(keyedObject);
assert(fromObject.length === 2, 'object format should yield 2 entries');

const activelyListed = fromArray.filter(
	(e) => e.sku === '5021;6' && e.enabled !== false && Number(e.intent) !== 0
);
assert(activelyListed.length === 1, 'actively listed filter');

console.log('OK: pricedb pricelist array compatibility verified');
