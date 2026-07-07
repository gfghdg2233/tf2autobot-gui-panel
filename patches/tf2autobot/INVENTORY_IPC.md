# TF2Autobot patch — inventory IPC for Unlisted Stock page

The GUI **Unlisted Stock** tab (`/unlisted`) needs live bot inventory over IPC.

Without this patch the page shows an error: *Inventory IPC is not available on your bot.*

Apply to your **tf2autobot-pricedb** (or TF2Autobot) install on the machine running the bot.

## Bot-side handler

Find where your bot connects to the GUI IPC server (`autobot_gui`) — usually in the bot’s GUI/IPC module.

Add:

```typescript
ipc.of.autobot_gui.on('getInventory', (_data, socket) => {
    const inventory = bot.inventoryManager?.getInventory;

    if (!inventory) {
        ipc.of.autobot_gui.emit(socket, 'inventory', {
            tradable: {},
            nonTradable: {},
            updatedAt: Date.now()
        });
        return;
    }

    const pack = (bucket: Record<string, Array<{ id: string | number }>> | undefined) => {
        const out: Record<string, string[]> = {};
        for (const sku of Object.keys(bucket ?? {})) {
            out[sku] = (bucket[sku] ?? []).map((item) => String(item.id));
        }
        return out;
    };

    ipc.of.autobot_gui.emit(socket, 'inventory', {
        tradable: pack(inventory.tradable),
        nonTradable: pack(inventory.nonTradable),
        updatedAt: Date.now()
    });
});
```

Use the same `ipc.of.autobot_gui.on(...)` style as your existing handlers (`getPricelist`, `deleteUntradableJunk`, etc.).

## After patching

```bash
npm run build
pm2 restart <your-bot>
```

Restart the **GUI panel** as well, then open **Unlisted Stock** in the sidebar.

## What the page does

1. Fetches tradable inventory SKUs from the bot
2. Removes items already on your pricelist (and currency like keys/metal)
3. Highlights items **received in trades during the last 7 days**
4. Lets you **list for sale** (adds to pricelist with sell intent) individually or in bulk

## Verify

1. Bot is connected to the panel (same as Pricelist page)
2. Open `/unlisted` — you should see unlisted backpack items
3. Click an item → **List for sale** opens the price modal pre-filled
