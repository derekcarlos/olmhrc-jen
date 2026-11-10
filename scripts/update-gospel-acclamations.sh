#!/usr/bin/env bash
set -euo pipefail
ACCLAMATION_PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -x "$ACCLAMATION_PROJECT_ROOT/.local-tools/node_modules/.bin/node" ]]; then
  export PATH="$ACCLAMATION_PROJECT_ROOT/.local-tools/node_modules/.bin:$PATH"
fi
exec node "$ACCLAMATION_PROJECT_ROOT/scripts/update-gospel-acclamations.mjs" "$@"
