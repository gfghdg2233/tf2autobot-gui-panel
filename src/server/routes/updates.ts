import express, { Router } from 'express';
import { UPDATE_LOGS } from '../data/updateLogs';

export default function updates(): Router {
    const router = express.Router();

    router.get('/', (_req, res) => {
        res.render('updates', {
            logs: UPDATE_LOGS
        });
    });

    return router;
}
