import express, {Router} from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import {PricelistItem} from "../../../common/types/pricelist";
import BotConnectionManager from "../../IPC";
import processPricelistItem from "../../utils/processPricelistItem";
import { getKeyPrice } from "../../utils/keyPrice";
import {checkItem} from "./checkItem";
import { getBotItemError, isAlreadyPricedError, isPricelistItem } from '../../utils/botItemResponse';

async function savePricelistItem(
	botManager: BotConnectionManager,
	botId: string,
	item: PricelistItem,
	mode: 'add' | 'update'
) {
	let ret = mode === 'add'
		? await botManager.addItem(botId, item)
		: await botManager.updateItem(botId, item);
	let error = getBotItemError(ret);

	if (mode === 'add' && error && isAlreadyPricedError(error)) {
		ret = await botManager.updateItem(botId, item);
		error = getBotItemError(ret);
	}

	return { ret, error };
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
            const { ret, error } = await savePricelistItem(botManager, req.session.bot, item, 'update');
            if (error) {
                res.status(400).json({ success: 0, msg: { type: 'error', message: error } });
                return;
            }

            const keyPrice = await getKeyPrice();
            if (isPricelistItem(ret)) {
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
