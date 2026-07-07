import { Pricelist, PricelistItem } from "../common/types/pricelist";
import { InventorySnapshot } from "../common/types/inventory";
import { createLogger } from './utils/logger';
import { traceIpcInbound, traceIpcOutbound } from './utils/ipcTrace';

const log = createLogger('ipc');

const { IPCModule } = require('node-ipc');

type QueueEntry = {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timer: NodeJS.Timeout;
};

const IPC_TIMEOUT_MS = 30000;

export default class BotConnectionManager {
    bots: { [id: string]: { socket: any, pricelistTS?: number, pricelist?: Pricelist, admins?: string[], id: string, name: string} };

    private initiated: boolean;

    private ipc: typeof IPCModule;

    private responseQueues: Map<string, QueueEntry[]> = new Map();

    constructor() {
        this.ipc = new IPCModule;
        this.bots = {};
        this.initiated = false;
    }

    private queueKey(socket: any, event: string): string {
        return `${socket?.id ?? 'unknown'}:${event}`;
    }

    private waitForResponse<T>(socket: any, event: string, timeoutMs = IPC_TIMEOUT_MS): Promise<T> {
        return new Promise((resolve, reject) => {
            const key = this.queueKey(socket, event);
            let queue = this.responseQueues.get(key);
            if (!queue) {
                queue = [];
                this.responseQueues.set(key, queue);
            }

            const entry: QueueEntry = {
                resolve: (value: unknown) => resolve(value as T),
                reject,
                timer: null as unknown as NodeJS.Timeout
            };

            entry.timer = setTimeout(() => {
                const idx = queue!.indexOf(entry);
                if (idx === 0) {
                    queue!.shift();
                    reject(new Error(`IPC timeout waiting for ${event}`));
                }
            }, timeoutMs);

            queue.push(entry);
        });
    }

    private resolveNextResponse(socket: any, event: string, data: unknown): void {
        const key = this.queueKey(socket, event);
        const queue = this.responseQueues.get(key);
        if (queue && queue.length > 0) {
            const entry = queue.shift()!;
            clearTimeout(entry.timer);
            entry.resolve(data);
        }
    }

    private request<T>(socket: any, emitEvent: string, responseEvent: string, ...args: unknown[]): Promise<T> {
        const payload = args.length === 1 ? args[0] : args;
        traceIpcOutbound(emitEvent, payload, socket?.id);
        const promise = this.waitForResponse<T>(socket, responseEvent);
        this.ipc.server.emit(socket, emitEvent, ...args);
        return promise;
    }

    static cleanItem(item: object) {
        const raw = item as Record<string, unknown>;
        const note = raw.note && typeof raw.note === 'object' && !Array.isArray(raw.note)
            ? raw.note as Record<string, unknown>
            : {};
        const buy = raw.buy && typeof raw.buy === 'object' && !Array.isArray(raw.buy)
            ? raw.buy as Record<string, unknown>
            : {};
        const sell = raw.sell && typeof raw.sell === 'object' && !Array.isArray(raw.sell)
            ? raw.sell as Record<string, unknown>
            : {};

        return {
            sku: raw.sku,
            enabled: raw.enabled,
            autoprice: raw.autoprice,
            min: raw.min,
            max: raw.max,
            intent: Number.parseInt(String(raw.intent ?? ''), 10),
            buy: { keys: buy.keys, metal: buy.metal },
            sell: { keys: sell.keys, metal: sell.metal },
            promoted: raw.promoted,
            group: raw.group,
            note: { buy: note.buy ?? '', sell: note.sell ?? '' },
            isPartialPriced: raw.isPartialPriced
        };
    }

    listBots(): Array<{ id: string; name: string; admins?: string[] }> {
        return Object.values(this.bots).map((bot) => ({
            id: bot.id,
            name: bot.name,
            admins: bot.admins
        }));
    }

    isReady(): boolean {
        return this.initiated;
    }

    getBotPricelist(id: string) {
        return new Promise<undefined | Pricelist>((resolve, reject) => {
            if(!this.bots[id]) {
                reject("no bot found");
                return;
            }
            if(this.bots[id].pricelistTS && this.bots[id].pricelistTS > Date.now() - 15*1000) {
                resolve(this.bots[id].pricelist);
            } else {
                this.request<Pricelist>(this.bots[id].socket, 'getPricelist', 'pricelist')
                    .then(resolve)
                    .catch(reject);
            }
        });
    }
    getOptions(id: string){
        return new Promise<Record<string, unknown>>((resolve, reject) => {
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<Record<string, unknown>>(this.bots[id].socket, 'getOptions', 'options')
                    .then(resolve)
                    .catch(reject);
            }
        })
    }
    updateOptions(id: string, options: object){
        return new Promise<Record<string, unknown>>((resolve, reject) => {
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<Record<string, unknown>>(this.bots[id].socket, 'updateOptions', 'optionsUpdated', options)
                    .then(resolve)
                    .catch(reject);
            }
        })
    }
    addItem(id: string, item: object) {
        return new Promise<undefined | PricelistItem>((resolve, reject) => {
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<PricelistItem>(this.bots[id].socket, 'addItem', 'itemAdded', BotConnectionManager.cleanItem(item))
                    .then(resolve)
                    .catch(reject);
            }
        });
    }
    updateItem(id: string, item: object) {
        return new Promise<undefined | PricelistItem>((resolve, reject) => {
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<PricelistItem>(this.bots[id].socket, 'updateItem', 'itemUpdated', BotConnectionManager.cleanItem(item))
                    .then(resolve)
                    .catch(reject);
            }
        });
    }
    removeItem(id: string, sku: string) {
        return new Promise<undefined | PricelistItem>((resolve, reject) => {
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<PricelistItem>(this.bots[id].socket, 'removeItem', 'itemRemoved', sku)
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    getTrades(id: string) {
        return new Promise<unknown>((resolve, reject)=>{
            if(!this.bots[id]) reject("no bot found");
            else {
                this.request<unknown>(this.bots[id].socket, 'getTrades', 'polldata')
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    sendChat(id: string, message: string){
        return new Promise<string>((resolve, reject)=>{
            if(!this.bots[id]) reject("this bot does not exist");
            else {
                this.request<string>(this.bots[id].socket, 'sendChat', 'chatResp', message)
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    deleteUntradableJunk(id: string) {
        return new Promise<void>((resolve, reject) => {
            if (!this.bots[id]) {
                reject('no bot found');
                return;
            }
            this.request<void>(this.bots[id].socket, 'deleteUntradableJunk', 'untradableJunkDeleted')
                .then(() => resolve())
                .catch(reject);
        });
    }

    getInventory(id: string) {
        return new Promise<InventorySnapshot>((resolve, reject) => {
            if (!this.bots[id]) {
                reject('no bot found');
                return;
            }
            this.request<InventorySnapshot>(this.bots[id].socket, 'getInventory', 'inventory')
                .then(resolve)
                .catch(reject);
        });
    }

    init() {
        this.ipc.config.id = 'autobot_gui';
        this.ipc.config.retry = 1500;
        this.ipc.config.logger = () => undefined;
        this.ipc.config.readableAll = true;
        this.ipc.config.writableAll = true;
        this.ipc.config.silent = true;
        this.ipc.config.logDepth = 1;
        this.ipc.serve(() => {
            this.initiated = true;
            this.ipc.server.on(
                'info',
                (data, socket) => {
                    traceIpcInbound('info', data, data?.id ?? socket?.id);
                    if (!this.bots[data.id]) {
                        log.info(`Bot connected: ${data.name ?? data.id} (${data.id})`);
                        socket.id = data.id;
                        this.bots[data.id] = {
                            socket,
                            ...data
                        };
                    }
                    this.resolveNextResponse(socket, 'info', data);
                }
            );
            this.ipc.server.on(
                'pricelist',
                (data, socket) => {
                    if(!data) {
                        traceIpcInbound('pricelist', null, socket?.id);
                        setTimeout(() => {
                            this.ipc.server.emit(socket, 'getPricelist');
                        }, 3000);
                    } else if (socket.id && this.bots[socket.id]) {
                        traceIpcInbound('pricelist', data, socket.id);
                        this.bots[socket.id].pricelist = data;
                        this.bots[socket.id].pricelistTS = Date.now();
                        this.resolveNextResponse(socket, 'pricelist', data);
                    }
                }
            );
            const queuedEvents = ['options', 'optionsUpdated', 'itemAdded', 'itemUpdated', 'itemRemoved', 'polldata', 'chatResp', 'untradableJunkDeleted', 'inventory'];
            for (const event of queuedEvents) {
                this.ipc.server.on(event, (data, socket) => {
                    traceIpcInbound(event, data, socket?.id);
                    this.resolveNextResponse(socket, event, data);
                });
            }
            this.ipc.server.on(
                'connect',
                (socket) => {
                    traceIpcInbound('connect', { socketId: socket?.id });
                    traceIpcOutbound('getInfo', null, socket?.id);
                    this.ipc.server.emit(socket, 'getInfo');
                }
            );
            this.ipc.server.on(
                'socket.disconnected',
                (socket) => {
                    const bot = this.bots[socket.id];
                    traceIpcInbound('socket.disconnected', { socketId: socket?.id }, socket?.id);
                    if (bot) {
                        log.info(`Bot disconnected: ${bot.name} (${bot.id})`);
                    }
                    delete this.bots[socket.id];
                }
            )
        });
        this.ipc.server.start();
        const ipcPath = process.platform === 'win32'
            ? '\\\\.\\pipe\\app.autobot_gui'
            : '/tmp/app.autobot_gui';
        log.info(`IPC listening (id: autobot_gui, path: ${ipcPath})`);
        log.info('Start tf2autobot-pricedb with IPC=true in the bot .env, then wait for "Bot connected".');
    }
}
