#!/bin/bash
set -euo pipefail

if OUTPUT=$(vue-tsc --noEmit --pretty false 2>&1); then
  echo "✓ Type check passed"
  exit 0
fi

# Ignore all diagnostics from @rancher/shell and fail only on project errors.
# The pattern matches lines that either originate from node_modules/@rancher/shell/
# or reference a @rancher/shell module (e.g. TS7016 for un-typed shell JS files).
FILTERED_OUTPUT=$(printf '%s\n' "$OUTPUT" | grep -v 'node_modules/@rancher/shell/' || true)

if printf '%s\n' "$FILTERED_OUTPUT" | grep -q 'error TS'; then
  echo "$FILTERED_OUTPUT"
  exit 1
fi

echo "✓ Type check passed (ignoring @rancher/shell diagnostics)"
exit 0
