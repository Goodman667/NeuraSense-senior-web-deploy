#!/usr/bin/env bash
set -euo pipefail

check() {
  local url="$1"
  echo "[healthcheck] GET $url"
  curl --fail --silent --show-error --max-time 20 "$url" > /dev/null
}

check "http://127.0.0.1:8000/health"
check "http://127.0.0.1/api/v1/health"
check "http://127.0.0.1/"
check "https://neura.ha7e.com/"
check "https://neura.ha7e.com/senior"

echo "[healthcheck] All checks passed"
