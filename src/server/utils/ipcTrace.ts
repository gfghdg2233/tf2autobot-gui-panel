import util from 'util';
import { createLogger } from './logger';

const traceLog = createLogger('ipc');

type TraceState = {
    signature: string;
    lastAt: number;
    suppressed: number;
};

const traceState = new Map<string, TraceState>();

export function isIpcDebugEnabled(): boolean {
    return process.env.DEBUG_IPC === 'true';
}

function isIpcVerboseEnabled(): boolean {
    return process.env.DEBUG_IPC_VERBOSE === 'true';
}

function sampleLimit(): number {
    const parsed = Number.parseInt(process.env.DEBUG_IPC_SAMPLE || '3', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function throttleMs(event: string): number {
    const fallback = Number.parseInt(process.env.DEBUG_IPC_THROTTLE_MS || '5000', 10);

    const perEvent: Record<string, number> = {
        polldata: Number.parseInt(process.env.DEBUG_IPC_THROTTLE_POLL_MS || '30000', 10),
        pricelist: Number.parseInt(process.env.DEBUG_IPC_THROTTLE_PRICELIST_MS || '15000', 10),
        inventory: Number.parseInt(process.env.DEBUG_IPC_THROTTLE_INVENTORY_MS || '15000', 10)
    };

    const value = perEvent[event] ?? fallback;
    return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function shouldSkipEvent(event: string): boolean {
    if (isIpcVerboseEnabled()) {
        return false;
    }

    return ['connect', 'socket.disconnected', 'getInfo'].includes(event);
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
        flags.push('off');
    }

    if (item.autoprice === true) {
        flags.push('auto');
    } else if (item.autoprice === false) {
        flags.push('manual');
    }

    if (item.isPartialPriced === true) {
        flags.push('partial');
    }

    const flagText = flags.length > 0 ? ` [${flags.join(', ')}]` : '';

    return `  ${String(item.sku ?? '?')}  ${formatPrice(item.buy as { keys?: number; metal?: number })}/${formatPrice(item.sell as { keys?: number; metal?: number })}${flagText}`;
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
        `  ${total} items · on ${enabled} · off ${disabled} · auto ${autopriced} · partial ${partial}`
    ];

    if (isIpcVerboseEnabled()) {
        lines.push(...items.map(summarizePricelistItem));
        return lines.join('\n');
    }

    const limit = Math.min(sampleLimit(), total);
    lines.push(...items.slice(0, limit).map(summarizePricelistItem));

    if (total > limit) {
        lines.push(`  … +${total - limit} more (DEBUG_IPC_VERBOSE=true for full list)`);
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

    if (!isIpcVerboseEnabled()) {
        return lines.join('\n');
    }

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

    const record = data as {
        sent?: Record<string, unknown>;
        received?: Record<string, unknown>;
        timestamps?: Record<string, unknown>;
        offerData?: Record<string, {
            action?: { action?: string; reason?: string };
            isAccepted?: boolean;
            isDeclined?: boolean;
            isCanceledUnknown?: boolean;
            partner?: string;
        }>;
        offersSince?: number;
    };

    const sentCount = Object.keys(record.sent || {}).length;
    const receivedCount = Object.keys(record.received || {}).length;
    const offerData = record.offerData || {};
    const offerCount = Object.keys(offerData).length;

    let accepted = 0;
    let declined = 0;
    let countered = 0;
    let other = 0;

    for (const offer of Object.values(offerData)) {
        const action = offer.action?.action;

        if (offer.isAccepted || action === 'accept') {
            accepted += 1;
        } else if (offer.isDeclined || action === 'decline') {
            declined += 1;
        } else if (action === 'counter') {
            countered += 1;
        } else {
            other += 1;
        }
    }

    const lines = [
        `  active offers: sent ${sentCount} · received ${receivedCount}`,
        `  history: ${offerCount} offers · accepted ${accepted} · declined ${declined} · countered ${countered} · other ${other}`
    ];

    if (record.offersSince) {
        const since = Number(record.offersSince);
        if (Number.isFinite(since)) {
            const ms = since > 1_000_000_000_000 ? since : since * 1000;
            lines.push(`  offersSince: ${new Date(ms).toISOString()}`);
        }
    }

    if (isIpcVerboseEnabled() && offerCount > 0) {
        const limit = sampleLimit();
        const entries = Object.entries(offerData).slice(-limit);

        for (const [id, offer] of entries) {
            const action = offer.action ? `${offer.action.action}/${offer.action.reason}` : 'unknown';
            lines.push(`  ${id}: ${action} · partner ${offer.partner ?? '?'}`);
        }

        if (offerCount > limit) {
            lines.push(`  … +${offerCount - limit} older offers hidden`);
        }
    }

    return lines.join('\n');
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

    if (!isIpcVerboseEnabled()) {
        return `  ${keys.length} option keys`;
    }

    const preview = keys.slice(0, sampleLimit()).join(', ');
    return `  ${keys.length} option keys: ${preview}${keys.length > sampleLimit() ? ', …' : ''}`;
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
        case 'connect':
        case 'socket.disconnected':
            return `  socket ${String((data as { socketId?: string })?.socketId ?? '?')}`;
        default:
            if (typeof data === 'string') {
                return `  ${data.length > 120 ? `${data.slice(0, 120)}…` : data}`;
            }

            if (typeof data === 'object') {
                const keys = Object.keys(data as Record<string, unknown>);
                if (keys.length === 0) {
                    return '  {}';
                }

                if (!isIpcVerboseEnabled()) {
                    return `  object keys: ${keys.slice(0, sampleLimit()).join(', ')}${keys.length > sampleLimit() ? ', …' : ''}`;
                }

                return `  ${util.inspect(data, {
                    depth: 2,
                    maxArrayLength: 10,
                    breakLength: 120,
                    compact: true
                })}`;
            }

            return `  ${String(data)}`;
    }
}

function emitTrace(direction: 'in' | 'out', event: string, data: unknown, botId?: string): void {
    if (!isIpcDebugEnabled()) {
        return;
    }

    if (shouldSkipEvent(event)) {
        return;
    }

    const summary = summarizePayload(event, data);
    const signature = `${direction}:${event}:${summary}`;
    const key = `${botId ?? '?'}:${direction}:${event}`;
    const now = Date.now();
    const windowMs = throttleMs(event);
    const previous = traceState.get(key);

    if (previous && previous.signature === signature && now - previous.lastAt < windowMs) {
        previous.suppressed += 1;
        traceState.set(key, previous);
        return;
    }

    if (previous && previous.suppressed > 0) {
        traceLog.info(`  ↳ suppressed ${previous.suppressed} repeated ${event} trace(s) (${windowMs}ms window)`);
    }

    traceState.set(key, {
        signature,
        lastAt: now,
        suppressed: 0
    });

    const arrow = direction === 'in' ? '←' : '→';
    traceLog.info(`${arrow} ${event} (bot ${botLabel(botId)})\n${summary}`);
}

export function traceIpcInbound(event: string, data: unknown, botId?: string): void {
    emitTrace('in', event, data, botId);
}

export function traceIpcOutbound(event: string, data: unknown, botId?: string): void {
    emitTrace('out', event, data, botId);
}
