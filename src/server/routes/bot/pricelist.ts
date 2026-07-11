import express, {Router} from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import BotConnectionManager from "../../IPC";
import processPricelistItem from '../../utils/processPricelistItem';
import { getKeyPrice } from '../../utils/keyPrice';
import { getPricelistEntries } from '../../utils/pricelistEntries';

export = function (schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
    const router = express.Router();
    const schema = schemaManager.schema;
    router.get('/', async (req, res) => {
        let pricelist
        try {
            pricelist = await botManager.getBotPricelist(req.session.bot);
        } catch (e) {
            console.error(e);
        }
        if(!pricelist) return res.json([]);
        const keyPrice = await getKeyPrice();
        const entries = getPricelistEntries(pricelist);
        const processed = entries.map((item) => processPricelistItem(item, schema, keyPrice));
        res.json(processed);
    });
    return router;
}
