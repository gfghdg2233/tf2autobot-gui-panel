# TF2Autobot GUI Panel

A web panel for managing your [TF2Autobot](https://github.com/TF2Autobot/tf2autobot) trading bot. Add and edit pricelist items, compare your prices against backpack.tf, review trades, tune bot settings, and track profit — all from your browser.

**Current version:** 3.3.3

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

---

## Features

- **Pricelist management** — search, filter, grid/list views, bulk add, manual and autopriced items
- **Live backpack.tf prices** — reference buy/sell prices from [pricedb.io](https://pricedb.io), auto-refresh, and a “differs from bptf” filter
- **Trades** — browse completed and active trades
- **Settings** — edit bot options from the browser (webhooks, misc settings, and more)
- **Profit** — profit tracking and reporting
- **Mann Co. UI** — TF2-themed layout with release notes page
- **Multi-bot** — pick which connected bot to manage when several are online
- **Steam login** — optional admin-only access via Steam OpenID

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18+ recommended (22 supported) |
| **npm** | Comes with Node.js |
| **TF2Autobot bot** | Must be running separately and connected via IPC |
| **Steam Web API key** | Only if `STEAM_AUTH=true` |

The GUI does **not** log into Steam or trade by itself. It talks to your bot over IPC while the bot handles Steam.

---

## Quick start

```bash
git clone https://github.com/gfghdg2233/tf2autobot-gui-panel.git
cd tf2autobot-gui-panel
npm install
cp template.env .env
# Edit .env — at minimum set API_KEY and SESSION_SECRET if using Steam auth
npm run build
npm start
```

Open **http://localhost:3000** (or the port you set in `.env`).

On Linux you can also use `./start.sh`. On Windows, run `start.bat` after building.

For a full walkthrough — bot setup, IPC, first login, and troubleshooting — see **[TUTORIAL.md](TUTORIAL.md)**.

---

## Environment variables

Copy `template.env` to `.env`. Never commit `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | *(empty)* | Steam Web API key (needed for Steam login) |
| `STEAM_AUTH` | `true` | Require Steam login to use the panel |
| `PORT` | `3000` | HTTP port |
| `SSL` | `false` | Enable HTTPS |
| `PORT_HTTPS` | `443` | HTTPS port when `SSL=true` |
| `CERT_FILE` | `local.crt` | TLS certificate path |
| `CERT_KEY` | `local.key` | TLS private key path |
| `VPS` | `false` | Set `true` on a public server |
| `ADDRESS` | `localhost` | Public hostname/IP when `VPS=true` |
| `SESSION_SECRET` | — | Random string for express sessions |

Bot Steam credentials (`STEAM_PASSWORD`, shared secrets, etc.) belong in the **bot’s** `.env`, not the GUI `.env`.

---

## How it connects to your bot

```
┌─────────────┐     IPC (node-ipc)     ┌──────────────┐
│  Web GUI    │ ◄──────────────────► │  TF2Autobot  │
│  (this repo)│                      │  (separate)  │
└─────────────┘                      └──────────────┘
       │                                      │
       │  Browser                             │  Steam / TF2 GC
       ▼                                      ▼
   You (admin)                          Trading & inventory
```

1. Start your TF2Autobot bot with IPC enabled (`IPC=true` in the bot `.env`).
2. Start this GUI panel.
3. The bot registers over IPC; you pick it in the panel (or it auto-selects if there is only one).
4. Bot data (pricelist, options, polldata) lives under `files/<steam-account>/`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build backend + frontend |
| `npm run build-back` | Compile TypeScript server |
| `npm run build-front` | Bundle Vue frontend with webpack |
| `npm start` | Run the panel (`node dist/server/index.js`) |
| `npm run build-front-watch` | Rebuild frontend on file changes |
| `npm run build-back-watch` | Rebuild backend on file changes |

---

## Project layout

```
tf2autobot-gui-panel/
├── src/server/          # Express API, IPC, routes
├── panel/               # Vue frontend + Nunjucks views
├── public/              # Static images
├── assets/              # Legacy static CSS/JS
├── files/               # Per-bot data (gitignored)
├── patches/tf2autobot/  # Optional bot patches (untradable junk fix)
├── template.env         # Example environment file
├── start.sh / start.bat # Convenience launchers
└── TUTORIAL.md          # Full setup guide
```

---

## Optional bot patches

The `patches/tf2autobot/` folder documents fixes for untradable junk deletion in TF2Autobot. The GUI can trigger junk deletion from **Settings → Misc** once the bot is patched. See [patches/tf2autobot/README.md](patches/tf2autobot/README.md).

---

## Security notes

- Keep `.env`, `files/`, and SSL keys **out of git** (already in `.gitignore`).
- Only Steam IDs listed as bot admins can manage a bot when `STEAM_AUTH=true`.
- Run behind HTTPS (`SSL=true` or a reverse proxy) if exposed to the internet.

---

## Credits

Based on [TF2Autobot GUI](https://github.com/TF2Autobot/tf2autobot-gui) by Zeus_Junior and contributors.

Uses [TF2Autobot](https://github.com/TF2Autobot/tf2autobot), [@tf2autobot/tf2-schema](https://www.npmjs.com/package/@tf2autobot/tf2-schema), and [pricedb.io](https://pricedb.io) for reference prices.

---

## License

ISC — see [LICENSE.txt](LICENSE.txt).
