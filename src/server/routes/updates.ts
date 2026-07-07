import express, { Router } from 'express';
import { UPDATE_LOGS } from '../data/updateLogs';
import BotConnectionManager from '../IPC';
import { requirePanelAdmin } from '../middleware/requirePanelAdmin';
import {
    applyPanelUpdate,
    checkForPanelUpdate,
    getPanelUpdateSettings,
    getUpdateJobStatus,
    savePanelUpdateSettings
} from '../utils/panelUpdate';

export default function updates(botManager: BotConnectionManager): Router {
    const router = express.Router();
    const adminOnly = requirePanelAdmin(botManager);

    router.get('/', (_req, res) => {
        res.render('updates', {
            logs: UPDATE_LOGS
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
