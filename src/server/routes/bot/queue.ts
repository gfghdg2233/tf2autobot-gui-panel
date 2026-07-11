import express, { Router } from 'express';
import BotConnectionManager from '../../IPC';
import { addListingQueueItem, getListingQueue, removeListingQueueItem } from '../../app/listingQueue';
import { ListingQueueItem } from '../../../common/types/queue';

export = function (botManager: BotConnectionManager): Router {
	const router = express.Router();

	router.get('/', async (req, res) => {
		try {
			const items = await getListingQueue(req.session.bot);
			res.json({ success: 1, data: { items, count: items.length } });
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to load listing queue' } });
		}
	});

	router.post('/', async (req, res) => {
		const body = req.body as Partial<ListingQueueItem>;

		if (!body?.sku) {
			res.status(400).json({ success: 0, msg: { type: 'error', message: 'SKU is required' } });
			return;
		}

		try {
			const items = await addListingQueueItem(req.session.bot, {
				sku: body.sku,
				name: body.name || body.sku,
				count: body.count,
				reason: body.reason || 'Waiting to be listed',
				addedAt: Date.now(),
				style: body.style,
				statslink: body.statslink,
				skuDetails: body.skuDetails
			});

			res.json({ success: 1, data: { items, count: items.length } });
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to add item to queue' } });
		}
	});

	router.delete('/:sku', async (req, res) => {
		try {
			const items = await removeListingQueueItem(req.session.bot, decodeURIComponent(req.params.sku));
			res.json({ success: 1, data: { items, count: items.length } });
		} catch (err) {
			console.error(err);
			res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to remove item from queue' } });
		}
	});

	return router;
};
