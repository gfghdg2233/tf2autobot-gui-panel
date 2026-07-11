import express, {Router} from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import {PricelistItem} from "../../../common/types/pricelist";
import BotConnectionManager from "../../IPC";
import processPricelistItem from "../../utils/processPricelistItem";
import { getKeyPrice } from "../../utils/keyPrice";
import {checkItem} from "./checkItem";
import {
	findPricelistEntryBySku,
	formatBotItemError,
	getBotItemError,
	isActivelyListedEntry,
	isAlreadyPricedError,
	isAutopriceUnavailableError,
	isPricelistItem,
	prepareItemForSave
} from '../../utils/botItemResponse';
import { removeListingQueueItem } from '../../app/listingQueue';

function mergeWithExistingEntry(requested: PricelistItem, existing: PricelistItem): PricelistItem {
	const merged = JSON.parse(JSON.stringify(existing)) as PricelistItem & { id?: string };

	merged.intent = requested.intent ?? merged.intent ?? 1;
	merged.enabled = requested.enabled ?? true;
	merged.max = requested.max ?? merged.max ?? 1;
	merged.min = requested.min ?? merged.min ?? 0;
	merged.group = requested.group ?? merged.group ?? 'all';

	if (requested.autoprice === false || !requested.autoprice) {
		merged.autoprice = false;
		merged.buy = requested.buy?.keys || requested.buy?.metal ? requested.buy : merged.buy;
		merged.sell = requested.sell?.keys || requested.sell?.metal ? requested.sell : merged.sell;
	} else if (!existing.autoprice && (merged.buy || merged.sell)) {
		merged.autoprice = false;
	}

	return merged;
}

async function savePricelistItem(
	botManager: BotConnectionManager,
	botId: string,
	item: PricelistItem,
	mode: 'add' | 'update'
) {
	const pricelist = await botManager.getBotPricelist(botId).catch(() => null);
	const existing = findPricelistEntryBySku(pricelist, item.sku);

	if (mode === 'add' && existing) {
		if (isActivelyListedEntry(existing) && item.autoprice) {
			return { ret: existing, error: null };
		}

		const merged = mergeWithExistingEntry(item, existing);
		prepareItemForSave(merged);

		let ret = await botManager.updateItem(botId, merged);
		let error = getBotItemError(ret);

		if (error && isAutopriceUnavailableError(error) && merged.autoprice) {
			merged.autoprice = false;
			prepareItemForSave(merged);
			ret = await botManager.updateItem(botId, merged);
			error = getBotItemError(ret);
		}

		return { ret, error: error ? formatBotItemError(error) : null };
	}

	let ret = mode === 'add'
		? await botManager.addItem(botId, item)
		: await botManager.updateItem(botId, item);
	let error = getBotItemError(ret);

	if (mode === 'add' && error && isAlreadyPricedError(error)) {
		const merged = existing ? mergeWithExistingEntry(item, existing) : item;
		prepareItemForSave(merged);
		ret = await botManager.updateItem(botId, merged);
		error = getBotItemError(ret);
	}

	if (error && isAutopriceUnavailableError(error) && item.autoprice) {
		if (existing && (existing.buy || existing.sell)) {
			const merged = mergeWithExistingEntry({ ...item, autoprice: false }, existing);
			prepareItemForSave(merged);
			ret = await botManager.updateItem(botId, merged);
			error = getBotItemError(ret);
		} else {
			const manualItem = JSON.parse(JSON.stringify(item)) as PricelistItem;
			manualItem.autoprice = false;
			prepareItemForSave(manualItem);

			if (manualItem.buy?.keys || manualItem.buy?.metal || manualItem.sell?.keys || manualItem.sell?.metal) {
				ret = mode === 'add'
					? await botManager.addItem(botId, manualItem)
					: await botManager.updateItem(botId, manualItem);
				error = getBotItemError(ret);

				if (mode === 'add' && error && isAlreadyPricedError(error)) {
					ret = await botManager.updateItem(botId, manualItem);
					error = getBotItemError(ret);
				}
			}
		}
	}

	return { ret, error: error ? formatBotItemError(error) : null };
}

export = function (schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
    const router = express.Router();
    const schema = schemaManager.schema;
    router.post('/', async (req,res)=>{
        const item = req.body as PricelistItem;
        if(checkItem(item, res)) return;
        try {
            const { ret, error } = await savePricelistItem(botManager, req.session.bot, item, 'add');
            if (error) {
                res.status(400).json({ success: 0, msg: { type: 'error', message: error } });
                return;
            }

            const keyPrice = await getKeyPrice();
            if (isPricelistItem(ret)) {
				await removeListingQueueItem(req.session.bot, ret.sku).catch(() => undefined);
                res.json(processPricelistItem(ret, schema, keyPrice));
            } else {
                res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to add item' } });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to add item' } });
        }
    });
    router.patch('/', async (req,res)=>{
        const item = req.body as PricelistItem;
        if(checkItem(item, res)) return;
        try {
            const pricelist = await botManager.getBotPricelist(req.session.bot).catch(() => null);
            const existing = findPricelistEntryBySku(pricelist, item.sku);
            const payload = existing ? mergeWithExistingEntry(item, existing) : item;
            prepareItemForSave(payload);

            const { ret, error } = await savePricelistItem(botManager, req.session.bot, payload, 'update');
            if (error) {
                res.status(400).json({ success: 0, msg: { type: 'error', message: error } });
                return;
            }

            const keyPrice = await getKeyPrice();
            if (isPricelistItem(ret)) {
				await removeListingQueueItem(req.session.bot, ret.sku).catch(() => undefined);
                res.json(processPricelistItem(ret, schema, keyPrice));
            } else {
                res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to update item' } });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: 0, msg: { type: 'error', message: 'Failed to update item' } });
        }
    });
    router.delete('/', (req,res)=>{
        const sku = req.body.sku as string;
        botManager.removeItem(req.session.bot, sku)
            .then(ret => {
                const error = getBotItemError(ret);
                if (error) {
                    res.status(400).json({ success: 0, msg: { type: 'error', message: error } });
                    return;
                }

                if (isPricelistItem(ret)) {
                    res.json(ret);
                } else {
                    res.json(typeof ret === "string" ? ret : "");
                }
            });
    });
    return router;
}
