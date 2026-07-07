import express, { Router } from 'express';
import { UPDATE_LOGS, getLatestUpdateLog } from '../data/updateLogs';
import { buildDiscordUpdatePayload } from '../utils/discordWebhook';
import BotConnectionManager from '../IPC';
import { requirePanelAdmin } from '../middleware/requirePanelAdmin';
import {
    applyPanelUpdate,
    checkForPanelUpdate,
    getPanelUpdateSettings,
    getUpdateJobStatus,
    savePanelUpdateSettings
} from '../utils/panelUpdate';

function formatDiscordPreviewText(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br>');
}

function buildDiscordPreview() {
    const latest = getLatestUpdateLog();
    const rawPreview = latest
        ? buildDiscordUpdatePayload(latest.version, latest)
        : null;
    const embed = rawPreview?.embeds?.[0] as {
        title?: string;
        description?: string;
        fields?: Array<{ name: string; value: string; inline?: boolean }>;
        footer?: { text?: string };
        timestamp?: string;
    } | undefined;

    if (!rawPreview || !embed) {
        return null;
    }

    return {
        username: rawPreview.username,
        title: embed.title,
        description: embed.description,
        footer: embed.footer?.text,
        dateLabel: embed.timestamp ? embed.timestamp.slice(0, 10) : latest?.date,
        fields: (embed.fields ?? []).map((field) => ({
            name: field.name,
            value: formatDiscordPreviewText(field.value),
            inline: field.inline === true
        }))
    };
}

export default function updates(botManager: BotConnectionManager): Router {
    const router = express.Router();
    const adminOnly = requirePanelAdmin(botManager);

    router.get('/', (_req, res) => {
        res.render('updates', {
            logs: UPDATE_LOGS,
            discordPreview: buildDiscordPreview()
        });
    });

    router.get('/status', async (_req, res, next) => {
        try {
            const status = await checkForPanelUpdate(false);
            res.json(status);
        } catch (err) {
            next(err);
        }
    });

    router.post('/check', adminOnly, async (_req, res, next) => {
        try {
            const status = await checkForPanelUpdate(true);
            res.json(status);
        } catch (err) {
            next(err);
        }
    });

    router.post('/apply', adminOnly, async (_req, res, next) => {
        try {
            const result = await applyPanelUpdate();
            res.json(result);
        } catch (err) {
            next(err);
        }
    });

    router.get('/job', adminOnly, async (_req, res, next) => {
        try {
            const job = await getUpdateJobStatus();
            res.json(job);
        } catch (err) {
            next(err);
        }
    });

    router.get('/settings', adminOnly, async (_req, res, next) => {
        try {
            res.json(await getPanelUpdateSettings());
        } catch (err) {
            next(err);
        }
    });

    router.post('/settings', adminOnly, async (req, res, next) => {
        try {
            const settings = await savePanelUpdateSettings({
                autoCheck: req.body.autoCheck === true || req.body.autoCheck === 'true',
                autoUpdate: req.body.autoUpdate === true || req.body.autoUpdate === 'true',
                checkIntervalHours: Number(req.body.checkIntervalHours)
            });
            res.json(settings);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
