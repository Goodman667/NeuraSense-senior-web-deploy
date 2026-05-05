#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}"
TARGET_ROOT="/opt/neurasense-senior-web-deploy"
TARGET_BACKEND="$TARGET_ROOT/backend"
TARGET_FRONTEND="/var/www/neurasense"
BACKEND_SRC="$WORKSPACE_DIR/backend"
FRONTEND_SRC="$WORKSPACE_DIR/frontend"
STATIC_DATA_SRC="$BACKEND_SRC/data"
BACKEND_VENV="$TARGET_BACKEND/.venv"

log() {
  echo "[deploy] $1"
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
require_file "$FRONTEND_SRC/dist/index.html"

log "Preparing target directories"
mkdir -p "$TARGET_ROOT" "$TARGET_BACKEND" "$TARGET_BACKEND/data" "$TARGET_FRONTEND"

log "Syncing backend application files"
rsync -a   --delete   --exclude '.env'   --exclude '.venv'   --exclude '__pycache__'   --exclude '*.pyc'   --exclude 'data/'   "$BACKEND_SRC/" "$TARGET_BACKEND/"

log "Syncing bundled backend data files without touching runtime-generated data"
rsync -a   --include '*/'   --include '*.json'   --exclude '*'   "$STATIC_DATA_SRC/" "$TARGET_BACKEND/data/"

log "Syncing frontend static files"
rsync -a --delete "$FRONTEND_SRC/dist/" "$TARGET_FRONTEND/"

if [ ! -x "$BACKEND_VENV/bin/python" ]; then
  log "Creating backend virtual environment"
  python3 -m venv "$BACKEND_VENV"
fi

log "Installing backend dependencies"
"$BACKEND_VENV/bin/pip" install --upgrade pip
"$BACKEND_VENV/bin/pip" install -r "$TARGET_BACKEND/requirements.txt"

log "Restarting backend service"
sudo systemctl restart neurasense-backend.service
sleep 5

log "Running health checks"
bash "$WORKSPACE_DIR/scripts/healthcheck.sh"

log "Deployment completed successfully"
