#!/usr/bin/env bash
# PreToolUse(Bash, git *): hard-block the git footguns your rules forbid —
#   - --no-verify (skips commit/push hooks and CI gates)
#   - force-push (except the safer --force-with-lease)
#   - committing secret-like tokens (scans the staged diff)
# Enforcement for AGENTS.md "no --force, no --no-verify, no secrets in commits".
set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# Inspect only the git INVOCATION, not message bodies — otherwise a commit whose
# message merely mentions "--no-verify" or "--force" would trip the guard.
# Drop everything from the first heredoc marker, then strip -m/-F/-c/--message args.
inv="${cmd%%<<*}"
inv="$(printf '%s' "$inv" | sed -E "s/(--message|--file|-m|-F|-c)[= ]+('[^']*'|\"[^\"]*\"|[^ ]+)//g")"

# 1. Never skip hooks/CI.
if printf '%s' "$inv" | grep -Eq -- '--no-verify'; then
  deny "git --no-verify bypasses commit/push hooks and CI gates. Blocked by policy — run the check, do not skip it."
fi

# 2. No destructive force-push (allow the safe --force-with-lease).
if printf '%s' "$inv" | grep -Eq 'git[[:space:]]+push'; then
  if ! printf '%s' "$inv" | grep -Eq -- '--force-with-lease'; then
    if printf '%s' "$inv" | grep -Eq -- '(--force|(^|[[:space:]])-f([[:space:]]|$))'; then
      deny "Force-push is blocked by policy. If you truly need it, use --force-with-lease and run it yourself."
    fi
  fi
fi

# 3. No secrets in a commit — scan what is actually staged.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit'; then
  staged="$(git diff --cached 2>/dev/null || true)"
  if printf '%s' "$staged" | grep -Eq 'AIza[0-9A-Za-z_-]{20,}|GOCSPX-[0-9A-Za-z_-]{10,}|github_pat_[0-9A-Za-z_]{20,}|ghp_[0-9A-Za-z]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'; then
    deny "A secret-like token appears in your staged changes. Unstage it and use .env / secrets storage — credentials must never be committed."
  fi
fi

: # allow
