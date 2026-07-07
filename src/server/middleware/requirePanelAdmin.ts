import { Request, Response, NextFunction } from 'express';
import BotConnectionManager from '../IPC';

export function requirePanelAdmin(botManager: BotConnectionManager) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (process.env.STEAM_AUTH !== 'true') {
            next();
            return;
        }

        const user = req.user as { id?: string } | undefined;
        const session = req.session as { bot?: string };

        if (!user?.id || !session.bot) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        const bot = botManager.bots[session.bot];
        if (!bot || (!bot.admins.includes(user.id) && bot.id !== user.id)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        next();
    };
}
