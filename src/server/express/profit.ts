import express, { Router } from 'express';
import SchemaManager from '@tf2autobot/tf2-schema';
import BotConnectionManager from '../IPC';
import * as profitApp from '../app/profit';

export default function profit(
    _schemaManager: SchemaManager,
    botManager: BotConnectionManager
): Router {
    const router = express.Router();

    router.get('/', async (req, res, next) => {
        try {
            const start = Number(req.query.start ?? -1);
            const interval = Number(req.query.interval ?? -1);
            const end = Number(req.query.end ?? -1);

            const botId = req.session.bot;
            const polldata = await botManager.getTrades(botId);

            const profit = await profitApp.get(
                start,
                interval,
                end,
                polldata,
                false
            );

            res.render('profit', {
                user: req.user,
                profit,
                query: req.query
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/json', async (req, res, next) => {
        try {
            const start = Number(req.query.start ?? -1);
            const interval = Number(req.query.interval ?? -1);
            const end = Number(req.query.end ?? -1);

            const botId = req.session.bot;
            const polldata = await botManager.getTrades(botId);

            const profit = await profitApp.get(
                start,
                interval,
                end,
                polldata,
                true
            );

            res.json({
                success: 1,
                data: profit
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
}