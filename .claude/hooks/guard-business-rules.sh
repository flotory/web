#!/usr/bin/env bash
# PreToolUse(Edit|Write): force a confirmation prompt before docs/BUSINESS_RULES.md
# is modified. It is the product source of truth; changing it is a human gate
# (see AGENTS.md / CLAUDE.md). This turns that prose gate into an enforced one —
# the edit is always asked, even in acceptEdits/auto modes.
set -euo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

case "$file" in
  */docs/BUSINESS_RULES.md | docs/BUSINESS_RULES.md)
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: "docs/BUSINESS_RULES.md is the product source of truth — editing it is a human gate. Confirm this rule change is intended and approved before proceeding."
      }
    }'
    ;;
  *)
    : # allow everything else silently
    ;;
esac
