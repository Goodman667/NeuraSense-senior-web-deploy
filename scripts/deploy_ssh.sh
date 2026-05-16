#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}"
TARGET_ROOT="${TARGET_ROOT:-/opt/neurasense-senior-web-deploy}"
TARGET_BACKEND="${TARGET_BACKEND:-$TARGET_ROOT/backend}"
TARGET_FRONTEND="${TARGET_FRONTEND:-/var/www/neurasense}"
BACKEND_SRC="$WORKSPACE_DIR/backend"
FRONTEND_SRC="$WORKSPACE_DIR/frontend"
FRONTEND_DIST_DIR="${FRONTEND_DIST_DIR:-$FRONTEND_SRC/dist}"
STATIC_DATA_SRC="$BACKEND_SRC/data"
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_SSH_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-$HOME/.ssh/neurasense_deploy_key}"
DEPLOY_SSH_KEY_PATH="${DEPLOY_SSH_KEY_PATH/#\~/$HOME}"
REMOTE_STAGE="${REMOTE_STAGE:-/tmp/neurasense-deploy-stage}"

SSH_OPTS=(
  -i "$DEPLOY_SSH_KEY_PATH"
  -p "$DEPLOY_PORT"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
)
RSYNC_SSH="ssh ${SSH_OPTS[*]}"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

log() {
  echo "[deploy:ssh] $1"
}

require_file() {
  local path="$1"
  if [ ! -e "$path" ]; then
    echo "Missing required path: $path" >&2
    exit 1
  fi
}

log "Verifying source tree"
require_file "$BACKEND_SRC/requirements.txt"
require_file "$FRONTEND_DIST_DIR/index.html"

log "Preparing remote staging directory"
ssh "${SSH_OPTS[@]}" "$REMOTE" "rm -rf '$REMOTE_STAGE' && mkdir -p '$REMOTE_STAGE/backend' '$REMOTE_STAGE/frontend-dist'"

log "Uploading backend source"
rsync -az --delete \
  --exclude '.env' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'data/' \
  -e "$RSYNC_SSH" \
  "$BACKEND_SRC/" "$REMOTE:$REMOTE_STAGE/backend/"

log "Uploading bundled backend data"
rsync -az \
  --include '*/' \
  --include '*.json' \
  --exclude '*' \
  -e "$RSYNC_SSH" \
  "$STATIC_DATA_SRC/" "$REMOTE:$REMOTE_STAGE/backend/data/"

log "Uploading frontend dist"
rsync -az --delete \
  -e "$RSYNC_SSH" \
  "$FRONTEND_DIST_DIR/" "$REMOTE:$REMOTE_STAGE/frontend-dist/"

log "Applying release on remote server"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "REMOTE_STAGE='$REMOTE_STAGE' TARGET_ROOT='$TARGET_ROOT' TARGET_BACKEND='$TARGET_BACKEND' TARGET_FRONTEND='$TARGET_FRONTEND' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

log() {
  echo "[remote] $1"
}

BACKEND_VENV="$TARGET_BACKEND/.venv"

log "Preparing production directories"
mkdir -p "$TARGET_ROOT" "$TARGET_BACKEND" "$TARGET_BACKEND/data" "$TARGET_FRONTEND"

log "Syncing backend application files"
rsync -a --delete \
  --exclude '.env' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'data/' \
  "$REMOTE_STAGE/backend/" "$TARGET_BACKEND/"

log "Syncing bundled backend data files without touching runtime-generated data"
if [ -d "$REMOTE_STAGE/backend/data" ]; then
  rsync -a \
    --include '*/' \
    --include '*.json' \
    --exclude '*' \
    "$REMOTE_STAGE/backend/data/" "$TARGET_BACKEND/data/"
fi

log "Syncing frontend static files"
rsync -a --delete "$REMOTE_STAGE/frontend-dist/" "$TARGET_FRONTEND/"

if [ ! -x "$BACKEND_VENV/bin/python" ]; then
  log "Creating backend virtual environment"
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.11 "$BACKEND_VENV"
  else
    python3 -m venv "$BACKEND_VENV"
  fi
fi

log "Installing backend dependencies"
if command -v uv >/dev/null 2>&1; then
  uv pip install --python "$BACKEND_VENV/bin/python" -r "$TARGET_BACKEND/requirements.txt"
else
  "$BACKEND_VENV/bin/pip" install --upgrade pip
  "$BACKEND_VENV/bin/pip" install -r "$TARGET_BACKEND/requirements.txt"
fi

log "Restarting backend service"
systemctl restart neurasense-backend.service
sleep 5

log "Running health checks"
curl --fail --silent --show-error --max-time 20 http://127.0.0.1:8000/health >/dev/null
curl --fail --silent --show-error --max-time 20 http://127.0.0.1/api/v1/health >/dev/null
curl --fail --silent --show-error --max-time 20 http://127.0.0.1/ >/dev/null

log "Cleaning remote staging directory"
rm -rf "$REMOTE_STAGE"

log "Deployment completed successfully"
REMOTE_SCRIPT

log "Checking public endpoints"
bash "$WORKSPACE_DIR/scripts/healthcheck.sh"

log "SSH deployment completed successfully"
