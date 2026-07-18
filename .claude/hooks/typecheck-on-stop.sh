#!/usr/bin/env bash
# Stop hook: when a turn ends, if any TS/Vue files changed, typecheck them and
# block the stop on failure so broken types get fixed, not shipped. Runs once
# per turn (not per edit) — vue-tsc is too heavy to run on every edit — and only
# when there is actually something to check.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT" || exit 0

changed="$(
  { git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
)"
[ -z "$changed" ] && exit 0

web=false
mobile=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    apps/mobile/*.ts | apps/mobile/*.tsx) mobile=true ;;
    *.ts | *.tsx | *.vue) web=true ;;
  esac
done <<< "$changed"

fail=""
if $web; then
  if ! out="$(npm run --silent typecheck 2>&1)"; then
    fail="${fail}Web typecheck failed:
${out}
"
  fi
fi
if $mobile; then
  if ! out="$(cd apps/mobile && npm run --silent typecheck 2>&1)"; then
    fail="${fail}Mobile typecheck failed:
${out}
"
  fi
fi

if [ -n "$fail" ]; then
  jq -n --arg r "$fail" '{decision: "block", reason: ($r + "\nFix the type errors before finishing.")}'
  exit 0
fi

exit 0
