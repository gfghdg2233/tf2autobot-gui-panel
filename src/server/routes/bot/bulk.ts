import express, {Router} from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import {PricelistItem} from "../../../common/types/pricelist";
import BotConnectionManager from "../../IPC";
import testSKU from "../../utils/testSKU";

export = function (schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
    const router = express.Router();
    const schema = schemaManager.schema;
    router.post('/', async (req,res)=>{
        const input = req.body.input.split(/\r?\n/).map(item => item.trim?.());

        if (req.body.max - req.body.min < 0) {
            res.json({
                success: 0,
                msg: {
                    type: 'warning',
                    message: 'Maximum stock can\'t be smaller than the minimum'
                }
            });
            return;
        }
        const  sellvalues = {
            keys: 0,
            metal: 0
        };
        const buyvalues = {
            keys: 0,
            metal: 0
        };
        if (!req.body.autoprice) {
            sellvalues.keys = Number(req.body.sell_keys);
            sellvalues.metal = Number(req.body.sell_metal);

            buyvalues.keys =  Number(req.body.buy_keys);
            buyvalues.metal = Number(req.body.buy_metal);

            if (sellvalues.keys < buyvalues.keys && req.body.intent != 0) {
                res.json({
                    success: 0,
                    msg: {
                        type: 'warning',
                        message: 'The sell price must be higher than the buy price'
                    }
                });
                return;
            }
            if (sellvalues.keys === buyvalues.keys && sellvalues.metal <= buyvalues.metal && req.body.intent != 0) {
                res.json({
                    success: 0,
                    msg: {
                        type: 'warning',
                        message: 'The sell price must be higher than the buy price'
                    }
                });
                return;
            }
        }
        const failed: {[key: string]: string} = {};
        const items: PricelistItem[] = [];
        for(let i = 0; i<input.length; i++) {
            const e =input[i];
            if (!e) continue;
            let sku = testSKU(e) ? e : schema.getSkuFromName(e);
            if (sku.includes('null') || sku.includes('undefined')) {
                failed[e] = 'Invalid sku or name';
                continue;
            }
            items.push({
                sku,
                max: req.body.max,
                min: req.body.min,
                intent: Number(req.body.intent),
                buy: buyvalues,
                sell: sellvalues,
                promoted: 0,
                note: {
                    buy: '',
                    sell: ''
                },
                group: req.body.group,
                autoprice: req.body.autoprice,
                enabled: true,
                time: Date.now()
            });
        }
        const addRes = await Promise.all(items.map(item => botManager.addItem(req.session.bot, item)));
        for (let i = 0; i < addRes.length; i++) {
            const ret = addRes[i];
            if (typeof ret !== 'object') {
                failed[items[i].sku] = typeof ret === 'string' ? ret : 'Failed to add item';
            }
        }
        if(Object.keys(failed).length > 0) {
            res.json({
                success: 0,
                msg: {
                    type: 'error',
                    message: Object.keys(failed).map(key=>`${key}: ${failed[key]}`).join('\n')
                }
            });
        }
        else res.json({success: 1, msg: {type: 'success', message: 'ok'}})
    });
    return router;
}
