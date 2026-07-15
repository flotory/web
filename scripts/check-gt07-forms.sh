#!/usr/bin/env bash
# GT-07 — Forms use shared components only (see docs/agent/golden-tasks.md)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

fail() {
  echo "GT-07 FAIL: $1"
  FAILED=1
}

pass() {
  echo "GT-07 OK: $1"
}

# --- Mobile: no raw TextInput outside shared UI internals ---
MOBILE_RAW=$(rg -l '<TextInput' "$ROOT/apps/mobile/app" "$ROOT/apps/mobile/src" \
  --glob '*.tsx' \
  --glob '!**/ui/AppTextInput.tsx' \
  --glob '!**/ui/SearchInput.tsx' \
  2>/dev/null || true)

if [[ -n "$MOBILE_RAW" ]]; then
  fail "Mobile raw TextInput outside AppTextInput/SearchInput:"
  echo "$MOBILE_RAW"
else
  pass "Mobile uses AppTextInput/SearchInput (no stray TextInput)"
fi

# --- Mobile: auth submit should use AppButton ---
if rg -q "backgroundColor: colors\.primary" "$ROOT/apps/mobile/app/login.tsx" 2>/dev/null; then
  fail "login.tsx still uses inline primary Pressable — use AppButton"
else
  pass "Mobile login submit uses AppButton"
fi

# --- Web: no duplicated danger-soft error blocks in pages ---
WEB_ERRORS=$(rg -l 'rounded-2xl bg-danger-soft p-3' "$ROOT/resources/js/pages" 2>/dev/null || true)
if [[ -n "$WEB_ERRORS" ]]; then
  fail "Web pages still use inline error blocks — use AppAlert:"
  echo "$WEB_ERRORS"
else
  pass "Web page errors use AppAlert (no bg-danger-soft p-3 blocks)"
fi

# --- Web: raw text-like inputs in pages (warn; checkboxes/file/hidden OK) ---
WEB_RAW=""
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if rg -q 'AppInput|PhoneInput|VenueAddressInput' "$f" 2>/dev/null; then
    continue
  fi
  if rg -q '<input[^>]+type="(text|email|password|search|tel|url|number)"' "$f" 2>/dev/null; then
    WEB_RAW+="${f}"$'\n'
  fi
done < <(rg -l '<input' "$ROOT/resources/js/pages" --glob '*.vue' 2>/dev/null || true)

if [[ -n "$WEB_RAW" ]]; then
  echo "GT-07 WARN: Web pages with raw text-like <input> — prefer AppInput:"
  echo "$WEB_RAW"
else
  pass "Web pages have no raw text-like inputs"
fi

if [[ "$FAILED" -eq 1 ]]; then
  exit 1
fi

echo ""
echo "GT-07 passed."
