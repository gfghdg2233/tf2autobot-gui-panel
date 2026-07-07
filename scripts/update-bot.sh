#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOT_DIR="${BOT_DIR:-$(dirname "$ROOT")/tf2autobot}"
BRANCH="${BOT_GIT_BRANCH:-master}"
PM2_NAME="${BOT_PM2_NAME:-thebot}"
DATA_DIR="$ROOT/data"
LOG="$DATA_DIR/bot-update.log"
JOB="$DATA_DIR/bot-update-job.json"

mkdir -p "$DATA_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG"
}

fail() {
  log "ERROR: $*"
  printf '{"status":"failed","finishedAt":%s,"error":"%s"}\n' "$(date +%s000)" "$1" > "$JOB"
  exit 1
}

log "Starting bot update in $BOT_DIR"
log "Branch: $BRANCH"

[[ -d "$BOT_DIR" ]] || fail "Bot directory not found: $BOT_DIR"
cd "$BOT_DIR"

command -v git >/dev/null || fail 'git is not installed'
[[ -z "$(git status --porcelain)" ]] || fail 'Bot working tree has local changes'

git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG"
git pull --ff-only origin "$BRANCH" 2>&1 | tee -a "$LOG"

command -v npm >/dev/null || fail 'npm is not installed'
npm install --no-audit 2>&1 | tee -a "$LOG"
npm run build 2>&1 | tee -a "$LOG"

log 'Bot build complete.'

if command -v pm2 >/dev/null; then
  log "Restarting PM2 process: $PM2_NAME"
  pm2 restart "$PM2_NAME" 2>&1 | tee -a "$LOG" || pm2 restart all 2>&1 | tee -a "$LOG" || true
else
  log 'PM2 not found — restart the bot manually.'
fi

printf '{"status":"done","finishedAt":%s}\n' "$(date +%s000)" > "$JOB"
log 'Bot update finished.'
