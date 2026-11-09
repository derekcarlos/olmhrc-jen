#!/usr/bin/env bash
set -euo pipefail
READINGS_PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -x "$READINGS_PROJECT_ROOT/.local-tools/node_modules/.bin/node" ]]; then
  export PATH="$READINGS_PROJECT_ROOT/.local-tools/node_modules/.bin:$PATH"
fi
export ASTRO_TELEMETRY_DISABLED=1
exec node "$READINGS_PROJECT_ROOT/scripts/update-sunday-readings.mjs" "$@"
