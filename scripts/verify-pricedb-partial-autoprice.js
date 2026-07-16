#!/usr/bin/env node
/**
 * Smoke test: panel translates sell-only/buy-only autoprice to tf2autobot-pricedb format.
 * pricedb schema rejects autopriceSell/autopriceBuy (additionalProperties: false).
 * Run: node scripts/verify-pricedb-partial-autoprice.js
 */
const {
	applyPartialAutopriceForPricedb,
	inferPanelAutopriceFlags
} = require('../dist/server/utils/botItemResponse');

function assert(condition, message) {
	if (!condition) {
		console.error('FAIL:', message);
		process.exit(1);
	}
}

const livePrice = {
	sku: '5021;6',
	buy: { keys: 0, metal: 45.11 },
	sell: { keys: 0, metal: 46.22 }
};

const sellOnly = {
	sku: '5021;6',
	max: 1,
	min: 0,
	buy: { keys: 0, metal: 44 },
	sell: { keys: 0, metal: 0 },
	enabled: true,
	intent: 2,
	autoprice: false,
	autopriceSell: true,
	autopriceBuy: false,
	promoted: 0,
	group: 'all',
	note: { buy: null, sell: null }
};

applyPartialAutopriceForPricedb(sellOnly, livePrice);
assert(sellOnly.autoprice === true, 'sell-only should enable autoprice');
assert(sellOnly.isPartialPriced === true, 'sell-only should set isPartialPriced');
assert(sellOnly.sell.metal === 46.22, 'sell-only should fill sell from live price');
assert(sellOnly.buy.metal === 44, 'sell-only should keep manual buy');
assert(sellOnly.autopriceSell !== true, 'panel-only autopriceSell should be cleared');
assert(sellOnly.autopriceBuy !== true, 'panel-only autopriceBuy should be cleared');

const buyOnly = {
	sku: '5002;6',
	max: 1,
	min: 0,
	buy: { keys: 0, metal: 0 },
	sell: { keys: 1, metal: 0 },
	enabled: true,
	intent: 2,
	autoprice: false,
	autopriceSell: false,
	autopriceBuy: true,
	promoted: 0,
	group: 'all',
	note: { buy: null, sell: null }
};

applyPartialAutopriceForPricedb(buyOnly, {
	sku: '5002;6',
	buy: { keys: 0, metal: 1.33 },
	sell: { keys: 1, metal: 0 }
});
assert(buyOnly.autoprice === true, 'buy-only should enable autoprice');
assert(buyOnly.isPartialPriced === true, 'buy-only should set isPartialPriced');
assert(buyOnly.buy.metal === 1.33, 'buy-only should fill buy from live price');
assert(buyOnly.sell.keys === 1, 'buy-only should keep manual sell');

const fromBot = {
	sku: '5021;6',
	max: 1,
	min: 0,
	buy: { keys: 0, metal: 44 },
	sell: { keys: 0, metal: 46.22 },
	enabled: true,
	intent: 2,
	autoprice: true,
	isPartialPriced: true,
	promoted: 0,
	group: 'all',
	note: { buy: null, sell: null },
	bptfPrice: {
		sku: '5021;6',
		source: 'pricedb.io',
		buy: { keys: 0, metal: 45.11 },
		sell: { keys: 0, metal: 46.22 },
		status: 'priced'
	}
};

inferPanelAutopriceFlags(fromBot);
assert(fromBot.autopriceSell === true, 'should infer sell-only from partial priced entry');
assert(fromBot.autoprice === false, 'panel UI should not show full autoprice for partial');

console.log('OK: pricedb partial autoprice compatibility verified');
