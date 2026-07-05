# TF2Autobot patches — untradable junk deletion

**Status:** These patches are applied in `../tf2autobot/` (tf2autobot-pricedb clone).

Apply these to your **TF2Autobot** install on the machine running the bot (for example `C:\tf2autobot`).

The GUI in this repo only talks to the bot over IPC; Steam inventory deletion happens inside TF2Autobot.

## What was broken

1. **Too few items deleted** — `findUntradableJunk()` only removed 4 seasonal items (536, 537, 655, 5826), not stockings, Gibus, badges, etc.
2. **Startup race** — deletion ran in `onReady()` while metal crafting / sorting was still queued on the TF2 GC, so delete jobs could fail or never run reliably.
3. **Misleading logs** — successful deletes still logged `Error deleting untradable junk`.
4. **Asset ID mismatch** — strict `===` comparisons could miss non-tradable items when IDs were number vs string.

## Files to change (in your TF2Autobot folder)

### 1. Copy new helper

Copy `untradableJunkDefindexes.ts` into:

`src/classes/untradableJunkDefindexes.ts`

### 2. `src/classes/Inventory.ts`

At the top, add:

```typescript
import { UNTRADABLE_JUNK_DEFINDEXES } from './untradableJunkDefindexes';
```

Replace `findUntradableJunk()` with:

```typescript
findUntradableJunk(): string[] {
    const result: string[] = [];
    for (const sku in this.nonTradable) {
        const item = SKU.fromString(sku);
        if (!UNTRADABLE_JUNK_DEFINDEXES.has(item.defindex)) {
            continue;
        }
        for (const itemWithAssetid of this.nonTradable[sku]) {
            result.push(String(itemWithAssetid.id));
        }
    }
    return result;
}
```

In `findByAssetid()`, compare IDs as strings:

```typescript
if (!this.tradable[sku].find(item => String(item.id) === String(assetid))) {
```

(and the same for the `nonTradable` loop)

In `removeItem()`, use `String(item.id) === String(assetid)` when searching.

### 3. `src/classes/MyHandler/MyHandler.ts`

Add a private field near the other private fields:

```typescript
private pendingUntradableJunkDelete = false;
```

In `onReady()`, replace the immediate delete block:

```typescript
if (this.isDeletingUntradableJunk) {
    this.pendingUntradableJunkDelete = true;
    setTimeout(() => this.tryDeleteUntradableJunk(), 30000);
}
```

In `onTF2QueueCompleted()`, after `gamesPlayed(...)`, add:

```typescript
this.tryDeleteUntradableJunk();
```

Replace `deleteUntradableJunk()` with:

```typescript
tryDeleteUntradableJunk(): void {
    if (!this.pendingUntradableJunkDelete || !this.isDeletingUntradableJunk) {
        return;
    }

    const inventory = this.bot.inventoryManager?.getInventory;
    if (!inventory) {
        return;
    }

    this.pendingUntradableJunkDelete = false;
    this.deleteUntradableJunk();
}

deleteUntradableJunk(): void {
    const inventory = this.bot.inventoryManager?.getInventory;
    if (!inventory) {
        log.warn('Skipping untradable junk deletion — inventory not loaded yet');
        this.pendingUntradableJunkDelete = true;
        return;
    }

    const assetidsToDelete = inventory.findUntradableJunk();
    if (assetidsToDelete.length === 0) {
        log.debug('No untradable junk items found to delete');
        return;
    }

    log.info(`Deleting ${assetidsToDelete.length} untradable junk item(s)...`);
    for (const assetid of assetidsToDelete) {
        log.debug(`Deleting junk item ${assetid}`);
        this.bot.tf2gc.deleteItem(assetid, err => {
            if (err) {
                log.warn(`Error deleting untradable junk ${assetid}:`, err);
            }
        });
    }
}
```

### 4. GUI IPC handler (in your bot’s GUI connection code)

Where your bot listens for GUI IPC events, add:

```typescript
ipc.of.autobot_gui.on('deleteUntradableJunk', (_data, socket) => {
    bot.handler.deleteUntradableJunk();
    ipc.of.autobot_gui.emit(socket, 'untradableJunkDeleted', { success: true });
});
```

This repo’s GUI sends `deleteUntradableJunk` when you enable **Misc Settings → Delete Untradable Junk** and save.

## After patching

```bash
npm run build
pm2 restart <your-bot>
```

Ensure `miscSettings.deleteUntradableJunk.enable` is `true` in the bot’s options (Settings page in the GUI, or `options.json`).

## Verify

Watch bot logs for:

- `Deleting N untradable junk item(s)...`
- No remaining junk items in the backpack for supported defindexes

Manual fallback (admin chat to the bot):

`!delete sku=5923;6;untradable`
