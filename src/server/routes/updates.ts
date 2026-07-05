import express, { Router } from 'express';
import { UPDATE_LOGS, getLatestUpdateLog } from '../data/updateLogs';
import { buildDiscordUpdatePayload } from '../utils/discordWebhook';

function formatDiscordPreviewText(text: string): string {
	return text
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
		.replace(/\n/g, '<br>');
}

export default function updates(): Router {
    const router = express.Router();

    router.get('/', (_req, res) => {
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

        const discordPreview = rawPreview && embed
            ? {
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
            }
            : null;

        res.render('updates', {
            logs: UPDATE_LOGS,
            discordPreview
        });
    });

    return router;
}
