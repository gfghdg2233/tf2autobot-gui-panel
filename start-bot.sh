#!/bin/bash
# Start the TF2Autobot trading bot (PriceDB fork).
set -euo pipefail
BOT_DIR="$(cd "$(dirname "$0")/.." && pwd)/tf2autobot"
cd "$BOT_DIR"

if [ ! -f dist/app.js ]; then
    echo ">> Bot not built — run: cd tf2bot && ./setup-bot.sh"
    exit 1
fi

if [ ! -f .env ]; then
    echo ">> Missing .env — create it first:"
    echo "   cp .env.example .env && nano .env"
    exit 1
fi

if ! grep -q '^STEAM_PASSWORD=.\+' .env 2>/dev/null; then
    echo ">> Add your Steam credentials to $BOT_DIR/.env"
    echo "   (STEAM_PASSWORD, STEAM_SHARED_SECRET, STEAM_IDENTITY_SECRET)"
    exit 1
fi

echo "Starting TF2Autobot (PriceDB)..."
exec node dist/app.js
