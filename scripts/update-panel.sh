#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATA_DIR="$ROOT/data"
LOG="$DATA_DIR/panel-update.log"
JOB="$DATA_DIR/panel-update-job.json"
BRANCH="${PANEL_GIT_BRANCH:-main}"
PM2_NAME="${PANEL_PM2_NAME:-GUI}"

mkdir -p "$DATA_DIR"

log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$LOG"
}

fail() {
    log "ERROR: $*"
    printf '{"status":"failed","finishedAt":%s,"error":"%s"}\n' "$(date +%s)000" "$*" > "$JOB"
    exit 1
}

log "Starting panel update in $ROOT"
log "Branch: $BRANCH"

if ! command -v git >/dev/null 2>&1; then
    fail "git is not installed"
fi

if [ -n "$(git status --porcelain)" ]; then
    fail "Working tree has local changes"
fi

git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG" || fail "git fetch failed"
git pull --ff-only origin "$BRANCH" 2>&1 | tee -a "$LOG" || fail "git pull failed"

if command -v npm >/dev/null 2>&1; then
    npm install 2>&1 | tee -a "$LOG" || fail "npm install failed"
    npm run build 2>&1 | tee -a "$LOG" || fail "npm run build failed"
else
    fail "npm is not installed"
fi

log "Build complete."

if command -v pm2 >/dev/null 2>&1; then
    log "Restarting PM2 process: $PM2_NAME"
    if pm2 restart "$PM2_NAME" 2>&1 | tee -a "$LOG"; then
        log "PM2 restart succeeded."
    elif pm2 restart all 2>&1 | tee -a "$LOG"; then
        log "PM2 restart all succeeded."
    else
        log "PM2 restart failed — restart the panel manually."
    fi
else
    log "PM2 not found — restart the panel manually (./start.sh or npm start)."
fi

printf '{"status":"done","finishedAt":%s}\n' "$(date +%s)000" > "$JOB"
log "Update finished."
