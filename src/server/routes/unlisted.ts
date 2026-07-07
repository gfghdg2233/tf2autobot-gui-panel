import express, { Router } from 'express';
import SchemaManager from '@tf2autobot/tf2-schema';
import BotConnectionManager from '../IPC';
import { buildUnlistedItems } from '../app/unlisted';
import { UnlistedItem } from '../../common/types/inventory';
import { getLivePricesForSkus } from '../utils/livePrices';

async function attachLivePrices(items: UnlistedItem[]): Promise<void> {
	if (items.length === 0) {
		return;
	}

	try {
		const prices = await getLivePricesForSkus(items.map((item) => item.sku));
		for (const item of items) {
			const ref = prices[item.sku];
			if (ref) {
				item.bptfPrice = {
					buy: ref.buy ?? undefined,
					sell: ref.sell ?? undefined,
					status: ref.status
				};
			}
		}
	} catch {
		// Live prices are optional for this page.
	}
}

export = function unlisted(schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
	const router = express.Router();
	const schema = schemaManager.schema;

	router.get('/', async (req, res) => {
		if (req.accepts('text/html')) {
			res.render('unlisted', { user: req.user });
			return;
		}

		if (!req.accepts('application/json')) {
			res.status(406).send('Not Acceptable');
			return;
		}

		try {
			const [inventory, pricelist, polldata] = await Promise.all([
				botManager.getInventory(req.session.bot),
				botManager.getBotPricelist(req.session.bot),
				botManager.getTrades(req.session.bot)
			]);

			const items = buildUnlistedItems(inventory, pricelist ?? {}, polldata as Record<string, unknown>, schema);
			await attachLivePrices(items);

			res.json({
				success: 1,
				data: {
					items,
					itemCount: items.length,
					recentCount: items.filter((item) => item.recent).length,
					updatedAt: inventory.updatedAt ?? Date.now()
				}
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const inventoryUnsupported = /timeout waiting for inventory|IPC timeout/i.test(message);

			res.status(inventoryUnsupported ? 503 : 500).json({
				success: 0,
				error: inventoryUnsupported
					? 'Inventory IPC is not available on your bot. Apply the getInventory patch from patches/tf2autobot/INVENTORY_IPC.md and restart the bot.'
					: message
			});
		}
	});

	return router;
};
