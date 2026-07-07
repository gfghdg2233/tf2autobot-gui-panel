function coerceWebhookUrlList(url: unknown): string[] {
    if (Array.isArray(url)) {
        return url.map((entry) => String(entry).trim()).filter(Boolean);
    }

    if (typeof url === 'string' && url.trim() !== '') {
        return [url.trim()];
    }

    return [];
}

/** Align panel-saved bot options with TF2Autobot v15 discordWebhook schema. */
export function normalizeBotOptions(botOptions: Record<string, unknown>): void {
    const discordWebhook = botOptions.discordWebhook as Record<string, unknown> | undefined;
    if (!discordWebhook) {
        return;
    }

    if (discordWebhook.embedColor !== undefined) {
        discordWebhook.embedColor = String(discordWebhook.embedColor);
    }

    if (discordWebhook.ownerID !== undefined) {
        const ownerID = discordWebhook.ownerID;
        if (!Array.isArray(ownerID)) {
            discordWebhook.ownerID = ownerID === '' ? [] : [String(ownerID)];
        } else {
            discordWebhook.ownerID = ownerID
                .map((id) => String(id))
                .filter((id) => id.trim() !== '');
        }
    }

    const tradeSummary = discordWebhook.tradeSummary as Record<string, unknown> | undefined;
    if (tradeSummary?.url !== undefined) {
        tradeSummary.url = coerceWebhookUrlList(tradeSummary.url);
    }

    const declinedTrade = discordWebhook.declinedTrade as Record<string, unknown> | undefined;
    if (declinedTrade?.url !== undefined) {
        declinedTrade.url = coerceWebhookUrlList(declinedTrade.url);
    }

    const mentionOwner = tradeSummary?.mentionOwner as Record<string, unknown> | undefined;
    if (mentionOwner?.itemSkus !== undefined && Array.isArray(mentionOwner.itemSkus)) {
        mentionOwner.itemSkus = mentionOwner.itemSkus
            .map((sku) => String(sku))
            .filter(Boolean);
    }
}
