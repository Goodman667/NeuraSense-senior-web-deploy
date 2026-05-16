#!/usr/bin/env bash
set -euo pipefail

check() {
  local url="$1"
  local attempts="${2:-10}"
  local delay="${3:-2}"
  local attempt=1

  while [ "$attempt" -le "$attempts" ]; do
    echo "[healthcheck] GET $url (attempt $attempt/$attempts)"
    if curl --fail --silent --show-error --max-time 20 "$url" > /dev/null; then
      return 0
    fi

    if [ "$attempt" -lt "$attempts" ]; then
      sleep "$delay"
    fi

    attempt=$((attempt + 1))
  done

  echo "[healthcheck] FAILED: $url" >&2
  return 1
}

if [ "${CHECK_LOCAL:-0}" = "1" ]; then
  check "http://127.0.0.1:8000/health" 20 2
  check "http://127.0.0.1/api/v1/health" 10 2
  check "http://127.0.0.1/" 10 2
fi

check "https://neura.ha7e.com/" 10 2
check "https://neura.ha7e.com/senior" 10 2
check "https://neura.ha7e.com/api/v1/health" 10 2

echo "[healthcheck] All checks passed"
