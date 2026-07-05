# Discord trade webhooks (tf2autobot-pricedb)

Trade notifications like the screenshot below are sent by your **trading bot**, not the GUI panel.

The GUI only edits the bot webhook URLs under **Settings**. The bot (`uwu6967/tf2autobot-pricedb`) builds and posts the embed when a trade is accepted or countered.

## Enable trade summary webhooks

1. Run [**tf2autobot-pricedb**](https://github.com/uwu6967/tf2autobot-pricedb) with IPC enabled.
2. Open the GUI → **Settings**.
3. Search for `discord` or expand **Discord Webhook**.
4. Set **Trade Summary → URL** to your Discord channel webhook URL.
   - You can add multiple URLs (one per line / array entry depending on your options shape).
5. Optional toggles in the same section:
   - `misc.showKeyRate` — show key rate and autokeys status
   - `misc.showPureStock` — show keys and metal stock
   - `misc.showInventory` — show backpack item count
   - `misc.showQuickLinks` — Steam / backpack.tf / rep.tf links
   - `embedColor` — left accent bar color (green is common for accepted trades)
6. Click **Save Changes**.

## What the embed contains

| Section | Source |
|---------|--------|
| Summary (offer - countered) | Bot trade handler |
| Asked / Offered values | Pricelist + PriceDB.IO key rates |
| Time taken | Bot timers (process / counter / complete) |
| Partner links | Steam, backpack.tf, rep.tf |
| Item list & prices | Bot pricelist |
| Status (keys, stock, slots) | Live bot inventory |
| Footer (`#offerId • steamId • time • v5.x`) | Bot version |

## GUI vs bot webhooks

| Webhook | Configured in | Purpose |
|---------|---------------|---------|
| **Trade summary** | Bot `options.json` via GUI **Settings** | Every accepted/countered trade |
| **GUI version update** | GUI `.env` → `DISCORD_WEBHOOK_URL` | New panel release announcements |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No Discord messages on trades | Check `discordWebhook.tradeSummary.url` is set and saved |
| Webhook URL won't save | Use GUI v3.3.3+ (webhook URL save fix) |
| Wrong format / missing fields | Update [tf2autobot-pricedb](https://github.com/uwu6967/tf2autobot-pricedb) — embed code is in `src/classes/DiscordWebhook/sendTradeSummary.ts` |
| Only GUI update posts | Trade webhooks need the **bot** running; GUI `.env` webhook is separate |

## Preview in the panel

Open **Trades** in the GUI to see a sample of how the bot trade webhook looks in Discord.
