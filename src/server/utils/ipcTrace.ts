import util from 'util';
import { createLogger } from './logger';

const traceLog = createLogger('ipc');

export function isIpcDebugEnabled(): boolean {
    return process.env.DEBUG_IPC === 'true';
}

function isIpcVerboseEnabled(): boolean {
    return process.env.DEBUG_IPC_VERBOSE === 'true';
}

function sampleLimit(): number {
    const parsed = Number.parseInt(process.env.DEBUG_IPC_SAMPLE || '5', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function botLabel(botId?: string): string {
    return botId ?? '?';
}

function formatPrice(price?: { keys?: number; metal?: number } | null): string {
    const keys = Number(price?.keys || 0);
    const metal = Number(price?.metal || 0);

    if (keys > 0 && metal > 0) {
        return `${keys}k+${metal}ref`;
    }

    if (keys > 0) {
        return `${keys}k`;
    }

    return `${metal}ref`;
}

function pricelistItems(data: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(data)) {
        return data.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
    }

    if (data && typeof data === 'object') {
        return Object.values(data as Record<string, unknown>).filter(
            (item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)
        );
    }

    return [];
}

function summarizePricelistItem(item: Record<string, unknown>): string {
    const flags: string[] = [];

    if (item.enabled === false) {
        flags.push('disabled');
    }

    if (item.autoprice === true) {
        flags.push('auto');
    } else if (item.autoprice === false) {
        flags.push('manual');
    }

    if (item.isPartialPriced === true) {
        flags.push('partial');
    }

    const intent = item.intent;
    if (intent === 0 || intent === 1 || intent === 2) {
        flags.push(`intent:${intent}`);
    }

    const flagText = flags.length > 0 ? ` (${flags.join(', ')})` : '';

    return `  ${String(item.sku ?? '?')}  buy ${formatPrice(item.buy as { keys?: number; metal?: number })} / sell ${formatPrice(item.sell as { keys?: number; metal?: number })}${flagText}`;
}

function summarizePricelist(data: unknown): string {
    const items = pricelistItems(data);
    const total = items.length;

    if (total === 0) {
        return '  (empty pricelist)';
    }

    let enabled = 0;
    let disabled = 0;
    let autopriced = 0;
    let partial = 0;

    for (const item of items) {
        if (item.enabled === false) {
            disabled += 1;
        } else {
            enabled += 1;
        }

        if (item.autoprice === true) {
            autopriced += 1;
        }

        if (item.isPartialPriced === true) {
            partial += 1;
        }
    }

    const lines = [
        `  ${total} items · enabled ${enabled} · disabled ${disabled} · autopriced ${autopriced} · partial ${partial}`
    ];

    if (isIpcVerboseEnabled()) {
        lines.push(...items.map(summarizePricelistItem));
        return lines.join('\n');
    }

    const limit = Math.min(sampleLimit(), total);
    lines.push(...items.slice(0, limit).map(summarizePricelistItem));

    if (total > limit) {
        lines.push(`  … and ${total - limit} more (DEBUG_IPC_VERBOSE=true for all, DEBUG_IPC_SAMPLE=${limit} to change sample size)`);
    }

    return lines.join('\n');
}

function summarizeInventory(data: unknown): string {
    if (!data || typeof data !== 'object') {
        return '  (no inventory payload)';
    }

    const snapshot = data as {
        tradable?: Record<string, string[]>;
        nonTradable?: Record<string, string[]>;
        updatedAt?: number;
    };

    const tradableSkus = Object.keys(snapshot.tradable || {});
    const nonTradableSkus = Object.keys(snapshot.nonTradable || {});
    const tradableCount = tradableSkus.reduce((sum, sku) => sum + (snapshot.tradable?.[sku]?.length || 0), 0);
    const nonTradableCount = nonTradableSkus.reduce((sum, sku) => sum + (snapshot.nonTradable?.[sku]?.length || 0), 0);

    const lines = [
        `  ${tradableSkus.length} tradable SKUs (${tradableCount} items) · ${nonTradableSkus.length} non-tradable SKUs (${nonTradableCount} items)`
    ];

    if (tradableSkus.length > 0) {
        const preview = tradableSkus.slice(0, sampleLimit()).join(', ');
        const suffix = tradableSkus.length > sampleLimit() ? ` … +${tradableSkus.length - sampleLimit()} more` : '';
        lines.push(`  tradable: ${preview}${suffix}`);
    }

    if (snapshot.updatedAt) {
        lines.push(`  updated: ${new Date(snapshot.updatedAt).toISOString()}`);
    }

    return lines.join('\n');
}

function summarizePolldata(data: unknown): string {
    if (!data || typeof data !== 'object') {
        return '  (no polldata payload)';
    }

    const record = data as Record<string, unknown>;
    const offers = Array.isArray(record.offers) ? record.offers : null;
    const received = Array.isArray(record.received) ? record.received : null;
    const sent = Array.isArray(record.sent) ? record.sent : null;

    if (offers || received || sent) {
        return [
            `  offers ${offers?.length ?? 0} · received ${received?.length ?? 0} · sent ${sent?.length ?? 0}`
        ].join('\n');
    }

    const keys = Object.keys(record);
    return `  object with ${keys.length} key${keys.length === 1 ? '' : 's'} (${keys.slice(0, sampleLimit()).join(', ')}${keys.length > sampleLimit() ? ', …' : ''})`;
}

function summarizeItem(data: unknown): string {
    if (!data || typeof data !== 'object') {
        return '  (no item payload)';
    }

    const item = data as Record<string, unknown>;
    return summarizePricelistItem(item).trimStart();
}

function summarizeOptions(data: unknown): string {
    if (!data || typeof data !== 'object') {
        return '  (no options payload)';
    }

    const keys = Object.keys(data as Record<string, unknown>);
    const preview = keys.slice(0, sampleLimit()).join(', ');

    return `  ${keys.length} option key${keys.length === 1 ? '' : 's'}${preview ? `: ${preview}${keys.length > sampleLimit() ? ', …' : ''}` : ''}`;
}

function summarizePayload(event: string, data: unknown): string {
    if (data === null || data === undefined) {
        return '  (empty)';
    }

    switch (event) {
        case 'pricelist':
            return summarizePricelist(data);
        case 'inventory':
            return summarizeInventory(data);
        case 'polldata':
            return summarizePolldata(data);
        case 'itemAdded':
        case 'itemUpdated':
        case 'itemRemoved':
            return `  ${summarizeItem(data)}`;
        case 'options':
        case 'optionsUpdated':
            return summarizeOptions(data);
        case 'chatResp':
            return `  ${String(data)}`;
        case 'info':
            if (typeof data === 'object' && data !== null) {
                const info = data as { id?: string; name?: string };
                return `  id=${info.id ?? '?'} name=${info.name ?? '?'}`;
            }
            return `  ${String(data)}`;
        default:
            if (typeof data === 'string') {
                return `  ${data.length > 240 ? `${data.slice(0, 240)}…` : data}`;
            }

            if (typeof data === 'object') {
                const keys = Object.keys(data as Record<string, unknown>);
                if (keys.length === 0) {
                    return '  {}';
                }

                return `  ${util.inspect(data, {
                    depth: isIpcVerboseEnabled() ? 4 : 1,
                    maxArrayLength: isIpcVerboseEnabled() ? 100 : 5,
                    breakLength: 120,
                    compact: true
                })}`;
            }

            return `  ${String(data)}`;
    }
}

export function traceIpcInbound(event: string, data: unknown, botId?: string): void {
    if (!isIpcDebugEnabled()) {
        return;
    }

    traceLog.info(`← ${event} (bot ${botLabel(botId)})\n${summarizePayload(event, data)}`);
}

export function traceIpcOutbound(event: string, data: unknown, botId?: string): void {
    if (!isIpcDebugEnabled()) {
        return;
    }

    traceLog.info(`→ ${event} (bot ${botLabel(botId)})\n${summarizePayload(event, data)}`);
}
