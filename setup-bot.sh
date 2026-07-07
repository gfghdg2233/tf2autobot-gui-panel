#!/usr/bin/env bash
# Install TF2Autobot (PriceDB fork) trading bot next to the GUI folder.
set -euo pipefail

GUI_DIR="$(cd "$(dirname "$0")" && pwd)"
BOT_DIR="$(dirname "$GUI_DIR")/tf2autobot"
BOT_REPO="https://github.com/uwu6967/tf2autobot-pricedb.git"
ACCOUNT_DIR="$GUI_DIR/files"

echo ""
echo "=========================================="
echo "  TF2Autobot (PriceDB) trading bot"
echo "=========================================="
echo ""
echo "GUI panel:   $GUI_DIR"
echo "Bot install: $BOT_DIR"
echo ""

if [ ! -f "$BOT_DIR/dist/app.js" ]; then
    if [ ! -d "$BOT_DIR/.git" ]; then
        echo ">> Cloning tf2autobot-pricedb..."
        git clone --depth 1 "$BOT_REPO" "$BOT_DIR"
    fi
    echo ">> Installing dependencies..."
    (cd "$BOT_DIR" && npm install)
    echo ">> Building..."
    (cd "$BOT_DIR" && npm run build)
else
    echo "Bot already built at $BOT_DIR"
fi

# Share pricelist/polldata with the GUI
if [ ! -e "$BOT_DIR/files" ]; then
    echo ">> Linking bot files/ -> GUI files/"
    ln -s "$GUI_DIR/files" "$BOT_DIR/files"
fi

if [ ! -f "$BOT_DIR/.env" ]; then
    echo ""
    echo ">> Creating .env from template — add your Steam credentials:"
    cp "$BOT_DIR/template.env" "$BOT_DIR/.env"
    # Enable GUI IPC bridge by default
    if ! grep -q '^IPC=' "$BOT_DIR/.env"; then
        echo 'IPC=true' >> "$BOT_DIR/.env"
    else
        sed -i 's/^IPC=.*/IPC=true/' "$BOT_DIR/.env"
    fi
fi

# Per-account options.json lives under files/<steam account>/
if [ -d "$ACCOUNT_DIR" ]; then
    for acct in "$ACCOUNT_DIR"/*; do
        [ -d "$acct" ] || continue
        if [ ! -f "$acct/options.json" ]; then
            echo ">> Copying default options.json -> $acct/"
            cp "$BOT_DIR/.example/options.json" "$acct/options.json"
        fi
    done
fi

echo ""
echo "=========================================="
echo "  Next steps"
echo "=========================================="
echo ""
echo "1. Edit bot credentials:"
echo "   nano $BOT_DIR/.env"
echo ""
echo "2. Edit bot options for your account (add your SteamID as admin):"
echo "   nano $ACCOUNT_DIR/<account>/options.json"
echo ""
echo "3. Start the TRADING BOT:"
echo "   cd $BOT_DIR && node dist/app.js"
echo "   # or: pm2 start dist/app.js --name thebot --cwd $BOT_DIR"
echo ""
echo "4. Start the WEB PANEL (separate terminal):"
echo "   cd $GUI_DIR && ./start.sh"
echo ""
