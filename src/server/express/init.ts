import express, { Express } from 'express';
import initBody from './body';
import initPassport from './passport';
import initNjs from './nunjucks';
import initRoutes from './routes';
import SchemaManager from '@tf2autobot/tf2-schema';
import type BotConnectionManager from '../IPC';

export = function init(
    app: Express,
    schemaManager: SchemaManager,
    botManager: BotConnectionManager
): void {
    app.use(express.static('./public'));

    initBody(app);

    if (process.env.STEAM_AUTH) {
        initPassport(app, botManager);
    } else {
        app.use((req, _res, next) => {
            const session = req.session as unknown as { bot?: string };
            const firstBotId = Object.keys(botManager.bots)[0];

            if (!session.bot && firstBotId) {
                session.bot = firstBotId;
            }

            next();
        });
    }

    initNjs(app);
    initRoutes(app, schemaManager, botManager);
};