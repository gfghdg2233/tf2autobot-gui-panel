#!/usr/bin/env node
/**
 * Smoke test: panel handles tf2autobot-pricedb addItem/updateItem IPC responses.
 * pricedb emits PricelistItem on success or a string error on failure (see IPC.ts).
 * Run: node scripts/verify-pricedb-item-errors.js
 */
const {
	getBotItemError,
	isAlreadyPricedError,
	isAutopriceUnavailableError,
	formatBotItemError,
	prepareItemForSave
} = require('../dist/server/utils/botItemResponse');

function assert(condition, message) {
	if (!condition) {
		console.error('FAIL:', message);
		process.exit(1);
	}
}

const sampleItem = {
	sku: '5021;6',
	max: 1,
	min: 1,
	buy: { keys: 0, metal: 0 },
	sell: { keys: 1, metal: 0 },
	enabled: true,
	intent: 2,
	autoprice: true,
	promoted: 0,
	group: 'all',
	note: { buy: null, sell: null }
};

assert(getBotItemError(sampleItem) === null, 'PricelistItem success should have no error');
assert(getBotItemError('Item is already priced') === 'Item is already priced', 'string error passthrough');
assert(isAlreadyPricedError('Item is already priced'), 'already priced detection');
assert(
	isAutopriceUnavailableError('Unable to get current prices for item'),
	'autoprice unavailable detection'
);
assert(
	formatBotItemError('Unable to get current prices for item').includes('Autoprice is not available'),
	'user-facing autoprice message'
);

const manualItem = JSON.parse(JSON.stringify(sampleItem));
manualItem.sell = { keys: 2, metal: 0 };
prepareItemForSave(manualItem);
assert(manualItem.autoprice === false, 'manual sell price disables autoprice');

console.log('OK: pricedb item error handling verified');
