import path from "path";
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('console-stamp')(console, {
    format: ':date(yyyy-mm-dd HH:MM:ss.l) :label(7)'
});

import express from 'express';
import initApp from './express/init';
import SchemaManager from '@tf2autobot/tf2-schema';
import BotConnectionManager from "./IPC";
import fs from "fs";
import * as https from "https";
import * as http from "http";
import { printStartupLog } from './startupLog';
import { parsePort } from './utils/parsePort';
import { startPanelUpdateScheduler } from './utils/panelUpdateScheduler';
import { createLogger } from './utils/logger';

const log = createLogger('server');
// import {Bot} from "./Bot";
const port = parsePort(process.env.PORT, 3000, 'PORT');
const portHttps = parsePort(process.env.PORT_HTTPS, 443, 'PORT_HTTPS');
const portNginx = process.env.PORT_NGINX ? parsePort(process.env.PORT_NGINX, 0, 'PORT_NGINX') : 0;

const pkg = require(path.join(process.cwd(), 'package.json'));
printStartupLog(pkg.version);
const app = express();

// var bots = new Map() as  Map<Number, Bot>;
//
//
// app.use((req, res, next) => {
//     if(req.session.botID && bots.has(req.session.botID) && bots.get(req.session.botID).admins.includes()) {
//
//     } else {
//         res.render('pickBot');
//     }
// });
const botConnectionManager = new BotConnectionManager();
botConnectionManager.init();

import { apiRequest } from './utils/apiRequest';

// Make the schema manager request the schema from schema.autobot.tf

/*eslint-disable */
SchemaManager.prototype.getSchema = function (callback): void {
    apiRequest('GET', 'https://schema.autobot.tf/schema')
        .then(schema => {
            this.setSchema(schema, true);
            callback(null, this.schema);
        })
        .catch(err => {
            callback(err);
        });
};
/*eslint-enable */

const schemaManager = new SchemaManager({ apiKey: process.env.API_KEY });
schemaManager.init(err => {
    if(err) {
        console.error('[schema] Failed to init:', err);
        console.error('[schema] Check network access to https://schema.autobot.tf/schema');
        console.error('[schema] If HTTP_PROXY or HTTPS_PROXY is set on this host, unset it or add HTTP_PROXY_ENABLED=true only with a valid proxy URL.');
        process.exit(1);
    } else {
        initApp(app, schemaManager, botConnectionManager);
        if(process.env.SSL === 'true') {
            const credentials = {
                key: fs.readFileSync(process.env.CERT_KEY || 'local.key', 'utf8'),
                cert: fs.readFileSync(process.env.CERT_FILE || 'local.crt', 'utf8')
            };
            const httpsServer = https.createServer(credentials, app);
            const httpsPort = portNginx || portHttps;
            httpsServer.listen(httpsPort, portNginx ? "127.0.0.1" : undefined, () => {
                log.info(`HTTPS listening on port ${httpsPort}`);
                startPanelUpdateScheduler();
            });
        } else {
            const httpServer = http.createServer(app);
            httpServer.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`[server] Port ${port} is already in use. Stop the other process first:`);
                    console.error(`[server]   fuser -k ${port}/tcp`);
                    console.error(`[server] Or change PORT in your .env file.`);
                    process.exit(1);
                }
                throw err;
            });
            httpServer.listen(port, () => {
                log.info(`HTTP listening on port ${port}`);
                log.info(`Open http://localhost:${port} in your browser`);
                startPanelUpdateScheduler();
            });
        }
    }
})


process
    .on('uncaughtException', (err) => {
        console.error('[server] Uncaught exception:', err.message);
        if (err.stack) {
            console.error(err.stack);
        }
        console.error('[server] Report bugs: https://github.com/uwu6967/tf2autobot-gui-panel/issues/new');
    })
    .on('unhandledRejection', (reason) => {
        console.error('[server] Unhandled rejection:', reason);
        console.error('[server] Report bugs: https://github.com/uwu6967/tf2autobot-gui-panel/issues/new');
    });
