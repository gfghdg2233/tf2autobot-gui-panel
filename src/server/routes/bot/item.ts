import express, {Router} from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import {PricelistItem} from "../../../common/types/pricelist";
import BotConnectionManager from "../../IPC";
import processPricelistItem from "../../utils/processPricelistItem";
import { getKeyPrice } from "../../utils/keyPrice";
import {checkItem} from "./checkItem";

export = function (schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
    const router = express.Router();
    const schema = schemaManager.schema;
    router.post('/', async (req,res)=>{
        const item = req.body as PricelistItem;
        if(checkItem(item, res)) return;
        try {
            const ret = await botManager.addItem(req.session.bot ,item);
            const keyPrice = await getKeyPrice();
            if(typeof ret === 'object') {
                res.json(processPricelistItem(ret, schema, keyPrice));
            } else {
                res.json(typeof ret === "string" ? ret : "");
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
            const ret = await botManager.updateItem(req.session.bot, item);
            const keyPrice = await getKeyPrice();
            if(typeof ret === 'object') {
                res.json(processPricelistItem(ret, schema, keyPrice));
            } else {
                res.json(typeof ret === "string" ? ret : "");
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
                if(typeof ret === 'object') {
                    res.json(ret);
                } else {
                    res.json(typeof ret === "string" ? ret : ""); // make sure r is string
                }
            });
    });
    return router;
}
