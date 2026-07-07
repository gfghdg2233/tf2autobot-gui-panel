# Discord webhooks (TF2Autobot v15+)

Trade and alert Discord embeds are sent by the **bot**, not the GUI panel. Configure them in **Settings → discordWebhook** in the panel, or edit `files/<account>/options.json`.

This matches [TF2Autobot v15.0.0](https://github.com/TF2Autobot/tf2autobot/releases/tag/v15.0.0) `discordWebhook` options.

## Bot webhook URLs (Settings page)

| Option | Type | Purpose |
|--------|------|---------|
| `discordWebhook.tradeSummary.url` | **List** (one URL per line) | Accepted trade summaries |
| `discordWebhook.declinedTrade.url` | **List** | Declined trades |
| `discordWebhook.offerReview.url` | Text | Invalid / review offers |
| `discordWebhook.messages.url` | Text | Partner messages |
| `discordWebhook.priceUpdate.url` | Text | Pricelist update results |
| `discordWebhook.sendAlert.url.main` | Text | General alerts |
| `discordWebhook.sendAlert.url.partialPriceUpdate` | Text | Partial price-update alerts |
| `discordWebhook.sendStats.url` | Text | Stats reports |
| `discordWebhook.sendTf2Events.*.url` | Text | TF2 system / item events |

Also set:

- `discordWebhook.ownerID` — Discord user IDs to mention (comma-separated in panel)
- `discordWebhook.displayName` / `avatarURL` — webhook username and avatar
- `discordWebhook.embedColor` — decimal embed color (default `9171753` in v15)
- `*.enable` toggles per webhook type

After saving in the panel, the bot reloads options over IPC.

## Panel update webhook (`.env`)

To announce **new GUI panel releases** to Discord (separate from trade webhooks):

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_ENABLED=true
DISCORD_WEBHOOK_ALWAYS=false
```

Optional:

```env
DISCORD_WEBHOOK_NAME=TF2Autobot GUI
DISCORD_WEBHOOK_AVATAR=https://...
DISCORD_EMBED_COLOR=9171753
```

Manual post:

```bash
npm run notify-discord
npm run notify-discord -- --force
```

Preview the embed on **Update Logs** in the panel.

## Recommended bot

Use [tf2autobot-pricedb](https://github.com/uwu6967/tf2autobot-pricedb) with TF2Autobot v15+ Discord webhook code for trade embeds like the main release.
