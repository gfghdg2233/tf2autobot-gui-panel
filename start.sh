#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi
PORT="${PORT:-3000}"

echo ""
echo "=========================================="
echo "  TF2Autobot GUI  (web panel)"
echo "  NOT the Steam trading bot"
echo "=========================================="
echo ""
echo "Panel URL: http://localhost:${PORT}"
echo "Trading bot: cd ../tf2autobot && node dist/app.js"
echo ""

if [ ! -f dist/server/index.js ]; then
    echo ">> First run — building..."
    npm run build
fi

if command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    echo ">> Port ${PORT} is busy — stopping old process..."
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 1
fi

exec node dist/server/index.js
