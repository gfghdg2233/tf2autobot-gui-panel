# TF2Autobot GUI — Setup Tutorial

This guide walks you through installing the web panel, connecting it to your TF2Autobot bot, and using it day to day.

**Time needed:** ~20–30 minutes for a first-time setup.

---

## What you are installing

You need **two separate programs**:

1. **TF2Autobot** — the Steam trading bot (runs `node dist/app.js`). **Recommended:** [**tf2autobot-pricedb**](https://github.com/uwu6967/tf2autobot-pricedb)
2. **This GUI panel** — the website you open in a browser (runs `node dist/server/index.js`)

The panel reads and writes your bot’s pricelist and settings. It does not replace the bot.

---

## Step 1 — Install Node.js

1. Download Node.js **18 or newer** from [nodejs.org](https://nodejs.org/).
2. Verify in a terminal:

```bash
node -v
npm -v
```

---

## Step 2 — Clone and build the GUI

```bash
git clone https://github.com/uwu6967/tf2autobot-gui-panel.git
cd tf2autobot-gui-panel
npm install
npm run build
```

`npm run build` compiles the TypeScript server and bundles the Vue frontend. You only need to re-run it after pulling updates or changing source code.

---

## Step 3 — Configure the GUI environment

```bash
cp template.env .env
```

Edit `.env` with a text editor.

### Local testing (recommended first)

```env
NODE_ENV=production
API_KEY=your_steam_web_api_key
STEAM_AUTH=true
PORT=3000
SSL=false
VPS=false
ADDRESS=localhost
SESSION_SECRET=pick-a-long-random-string-here
```

### Get a Steam Web API key

1. Log in at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey).
2. Register a key (domain can be `localhost` for local use).
3. Paste it into `API_KEY=` in `.env`.

### Disable Steam login (local only)

If you are testing on the same machine and want to skip login:

```env
STEAM_AUTH=false
```

Only do this on a trusted local setup. Anyone who can reach the port can manage your bot.

---

## Step 4 — Set up TF2Autobot (the bot)

If you do not already have a bot running:

1. Clone and build [**tf2autobot-pricedb**](https://github.com/uwu6967/tf2autobot-pricedb) (recommended for this panel) into a folder **next to** or **anywhere on the server**:

```bash
git clone https://github.com/uwu6967/tf2autobot-pricedb.git
cd tf2autobot-pricedb
npm install
npm run build
```

The upstream [TF2Autobot](https://github.com/TF2Autobot/tf2autobot) repo also works, but **tf2autobot-pricedb** is what this GUI is tested against for pricedb.io pricing and IPC.

2. Create the bot `.env` with your Steam credentials:

```env
STEAM_ACCOUNT_NAME=your@email.com
STEAM_PASSWORD=your_password
STEAM_SHARED_SECRET=...
STEAM_IDENTITY_SECRET=...
STEAM_API_KEY=...

IPC=true
ENABLE_SOCKET=true
```

3. Add your SteamID64 to `ADMINS` in the bot `.env`.
4. Build and start the bot:

```bash
cd /path/to/tf2autobot-pricedb
npm install
npm run build
node dist/app.js
```

The bot must stay running while you use the GUI.

---

## Step 5 — Share bot data with the GUI

The GUI stores per-account data under:

```
tf2autobot-gui-panel/files/<steam-account-name>/
├── pricelist.json
├── options.json
├── polldata.json
└── ...
```

### Option A — GUI creates data when the bot connects

If the bot is new, start the GUI first. When the bot connects over IPC it will sync pricelist and options into `files/`.

### Option B — Point the bot at the GUI `files/` folder

Symlink or copy your existing bot `files/` directory so both use the same data:

```bash
# Example: bot uses GUI files folder
ln -s /path/to/tf2autobot-gui-panel/files /path/to/tf2autobot/files
```

On Windows, use a directory junction or copy the folder instead of `ln -s`.

**Important:** Bot secrets stay in the **bot** `.env`. The GUI `.env` only configures the website.

---

## Step 6 — Start the GUI

**Linux / macOS:**

```bash
./start.sh
```

**Windows:**

```bat
start.bat
```

**Or with npm:**

```bash
npm start
```

You should see something like:

```
server listening on port 3000
Open http://localhost:3000 in your browser
```

---

## Step 7 — Log in and pick your bot

1. Open **http://localhost:3000** in your browser.
2. If `STEAM_AUTH=true`, click **Sign in through Steam** and log in with an admin account.
3. If multiple bots are connected, choose the one you want to manage.
4. If you see **No bots**, the GUI cannot reach a bot — see [Troubleshooting](#troubleshooting) below.

---

## Using the panel

### Items (pricelist)

- **Search** by item name or SKU (e.g. `5021;6` for a Mann Co. Supply Crate Key).
- **Add Item** — set buy/sell prices manually or enable autopricing.
- **Bulk Add** — paste multiple SKUs at once.
- **Grid / List** — switch views with the toolbar button.
- **Live backpack.tf prices** — reference prices refresh automatically; use **Refresh backpack.tf prices** for a manual update.
- **Differs from bptf** filter — find items where your prices do not match backpack.tf.
- In the edit modal, **Use bptf buy/sell** copies reference prices into your manual fields.

### Trades

View trade history and details for the selected bot.

### Settings

Change bot options (alerts, webhooks, misc settings, etc.). Changes are saved to `files/<account>/options.json` and sent to the bot.

### Profit

Review profit stats when your bot exposes them through IPC.

### Updates

The **Updates** page lists version history for this panel.

---

## Hosting on a VPS (public server)

1. Set in `.env`:

```env
VPS=true
ADDRESS=your.domain.com
PORT=3000
STEAM_AUTH=true
SESSION_SECRET=use-a-strong-random-secret
```

2. Put **nginx** or **Caddy** in front with HTTPS, or set `SSL=true` and provide `CERT_FILE` / `CERT_KEY`.
3. Open the firewall only for HTTP/HTTPS — not for raw IPC.
4. Keep the bot and GUI on the same machine (IPC uses local sockets).

---

## Troubleshooting

### “No bots” after login

| Check | Fix |
|-------|-----|
| Bot not running | Start `node dist/app.js` in your TF2Autobot folder |
| IPC disabled | Set `IPC=true` in the bot `.env` |
| Wrong admin | Your SteamID64 must be in the bot `ADMINS` list |
| Bot crashed | Read the bot console for errors |

### Port already in use

```bash
# Linux — free port 3000
fuser -k 3000/tcp
```

Or change `PORT=` in `.env`.

### Steam login redirect fails

- `API_KEY` must be set in `.env`.
- With `VPS=true`, `ADDRESS` must match the URL you use in the browser.
- Steam OpenID return URL must match your public hostname.

### Settings will not save

- Confirm the bot is connected (not just the GUI running).
- Check write permissions on `files/<account>/`.
- See bot logs for IPC errors.

### Live prices show “unavailable”

- The panel fetches bulk prices from [pricedb.io](https://pricedb.io).
- Some SKUs have no backpack.tf listing — that is normal.
- Check your server can reach the internet (outbound HTTPS).

### `npm run build` fails on Node 22

Pull the latest version of this repo — server TypeScript uses `skipLibCheck` for compatibility.

---

## Updating

```bash
cd tf2autobot-gui-panel
git pull
npm install
npm run build
npm start
```

Restart the bot as well if IPC message formats changed between versions.

---

## Security checklist

- [ ] `.env` is never committed to git
- [ ] `files/` is never committed to git
- [ ] `SESSION_SECRET` is a long random value
- [ ] `STEAM_AUTH=true` on any shared or public host
- [ ] Only trusted SteamIDs are bot admins
- [ ] HTTPS enabled when exposed to the internet

---

## Need more help?

- Bot issues: [TF2Autobot wiki / issues](https://github.com/TF2Autobot/tf2autobot)
- GUI fork: [gfghdg2233/tf2autobot-gui-panel](https://github.com/gfghdg2233/tf2autobot-gui-panel/issues)

Happy trading!
