import express, { Router } from 'express';
import SchemaManager from "@tf2autobot/tf2-schema";
import BotConnectionManager from "../IPC";
import { normalizeBotOptions } from '../utils/normalizeBotOptions';

function toType(source: unknown, val: string): unknown {
    if (source === null || source === undefined) {
        return val;
    }

    if (Array.isArray(source)) {
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === '[]') {
            return [];
        }
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // fall through to line split
            }
        }
        return trimmed
            .split(/\r?\n|,/)
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    switch (typeof source) {
    case 'boolean':
        return val === 'true' ? true : val === 'false' ? false : source;
    case 'number': {
        const num = Number(val);
        return Number.isNaN(num) ? source : num;
    }
    case 'string':
        return String(val);
    default:
        if (typeof val !== 'string') {
            return val;
        }
        if (val === '') {
            if (Array.isArray(source)) {
                return [];
            }
            if (typeof source === 'object' && source !== null) {
                return source;
            }
            return val;
        }
        const trimmed = val.trim();
        if (trimmed === '' || trimmed === '{}' || trimmed === '[]') {
            if (trimmed === '[]' || Array.isArray(source)) {
                return [];
            }
            if (trimmed === '{}') {
                return {};
            }
            return val;
        }
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return val;
            }
        }
        return val;
    }
}

function setNestedOption(botOptions: Record<string, unknown>, path: string, rawVal: string): void {
    const keys = path.split('$');
    let opt: Record<string, unknown> = botOptions;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLeaf = i === keys.length - 1;
        if (isLeaf) {
            opt[key] = toType(opt[key], rawVal);
            return;
        }
        const child = opt[key];
        if (!child || typeof child !== 'object' || Array.isArray(child)) {
            opt[key] = {};
        }
        opt = opt[key] as Record<string, unknown>;
    }
}

export default function config(_schemaManager: SchemaManager, botManager: BotConnectionManager): Router {
    const router = express.Router();
    router.get('/', async (req, res) => {
        res.render('config');
    });
    router.get('/options', async (req, res, next) => {
        try {
            if (!req.session.bot) {
                return res.status(503).json({ error: 'No bot connected' });
            }
            res.json(await botManager.getOptions(req.session.bot));
        } catch (err) {
            next(err);
        }
    });
    router.post('/', async (req, res, next) => {
        try {
            if (!req.session.bot) {
                return res.status(503).send('No bot connected. Start the trading bot first, then reload this page.');
            }
            const botOptions = await botManager.getOptions(req.session.bot);
            for (const key in req.body) {
                if (!Object.prototype.hasOwnProperty.call(req.body, key)) {
                    continue;
                }
                setNestedOption(botOptions, key, req.body[key]);
            }
            normalizeBotOptions(botOptions);
            const result = await botManager.updateOptions(req.session.bot, botOptions);
            const resultMessage = typeof result === 'string' ? result : '';

            if (resultMessage.startsWith('❌')) {
                return res.redirect(`/config?error=${encodeURIComponent(resultMessage)}`);
            }

            const miscSettings = botOptions.miscSettings as Record<string, unknown> | undefined;
            const deleteJunk = miscSettings?.deleteUntradableJunk as Record<string, unknown> | undefined;
            if (deleteJunk?.enable === true) {
                try {
                    await botManager.deleteUntradableJunk(req.session.bot);
                } catch (err) {
                    console.error('Failed to trigger untradable junk deletion:', err);
                }
            }

            res.redirect('/config?saved=1');
        } catch (err) {
            console.error('Failed to save bot settings:', err);
            next(err);
        }
    });
    return router;
}
