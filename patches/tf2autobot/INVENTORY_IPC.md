# TF2Autobot patch — inventory IPC for Unlisted Stock page

The GUI **Unlisted Stock** tab (`/unlisted`) needs live bot inventory over IPC.

## tf2autobot-pricedb (recommended)

**[uwu6967/tf2autobot-pricedb](https://github.com/uwu6967/tf2autobot-pricedb)** includes `getInventory` IPC support for the GUI panel.

Update to the latest version and rebuild:

```bash
git pull
npm run build
pm2 restart <your-bot>
```

The bot responds with:

```json
{
  "tradable": { "440;7": ["1234567890"] },
  "nonTradable": {},
  "updatedAt": 1710000000000
}
```

## Other TF2Autobot forks

If your bot does not have `getInventory` yet, add this handler where it connects to the GUI IPC server (`autobot_gui`) — usually `src/classes/IPC.ts`:

```typescript
this.ourServer.on('getInventory', this.sendInventory.bind(this));

// ...

sendInventory(): void {
    const inventory = this.bot.inventoryManager?.getInventory;

    if (!inventory) {
        this.ourServer.emit('inventory', {
            tradable: {},
            nonTradable: {},
            updatedAt: Date.now()
        });
        return;
    }

    const pack = (bucket: Record<string, { id: string | number }[]> | undefined) => {
        const out: Record<string, string[]> = {};
        for (const sku of Object.keys(bucket ?? {})) {
            out[sku] = (bucket[sku] ?? []).map((item) => String(item.id));
        }
        return out;
    };

    this.ourServer.emit('inventory', {
        tradable: pack(inventory.getItems),
        nonTradable: {},
        updatedAt: Date.now()
    });
}
```

## After updating the bot

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
