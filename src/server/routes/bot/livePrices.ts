import express, { Router } from 'express';
import { getLivePricesForSkus, getLivePriceCacheUpdatedAt, missingPrice, unavailablePrice } from '../../utils/livePrices';

export = function (): Router {
	const router = express.Router();

	router.post('/', async (req, res) => {
		const skus = Array.isArray(req.body?.skus)
			? req.body.skus.map((sku) => String(sku)).filter(Boolean)
			: [];

		if (skus.length === 0) {
			return res.json({ source: 'pricedb.io', updatedAt: Date.now(), prices: {} });
		}

		try {
			const response = await getLivePricesForSkus(skus);

			res.json({
				source: 'pricedb.io / backpack.tf',
				updatedAt: getLivePriceCacheUpdatedAt() || Date.now(),
				prices: response
			});
		} catch (error) {
			console.error('Failed to load live reference prices:', error);

			const response: Record<string, ReturnType<typeof missingPrice>> = {};

			skus.forEach((sku) => {
				response[sku] = unavailablePrice(sku);
			});

			res.status(200).json({
				error: 'Unable to load live reference prices right now.',
				source: 'pricedb.io / backpack.tf',
				updatedAt: getLivePriceCacheUpdatedAt() || Date.now(),
				prices: response
			});
		}
	});

	return router;
};
