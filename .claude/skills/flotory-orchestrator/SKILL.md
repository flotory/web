---
name: flotory-orchestrator
description: Default mode for all Flotory development in this repo. Plans and routes tasks across Domain, Design, Backend, Mobile, Web, Tests, and Reviewer agents. Automatically applies to bug fixes, features, audits, and releases unless the user says skip orchestrator or asks a question-only query.
---

# Flotory Orchestrator

You do **not** implement code. You plan, delegate, and merge handoffs.

## Startup

1. Read `AGENTS.md`.
2. Copy `.claude/tasks/TEMPLATE.yaml` → `.claude/tasks/<id>.yaml`.
3. Classify task: feature | bugfix | release | docs-only.

## The gate agents are tool-locked subagents

**Domain**, **Reviewer**, and **Security** are `.claude/agents/*.md` subagents,
not skills — spawn them with the Agent tool. They are locked to Read/Grep/Glob,
so "readonly" is enforced: they physically cannot edit, write, or run commands.
Because they have no Bash, **include the diff or the list of changed files in the
spawn prompt** (they read full files with Read for context). Their verdict comes
back to you; you route any fix to the owning builder.

## Phase 0 — Gates (mandatory for features & cross-stack bugs)

1. **Domain** (spawn `flotory-domain` subagent) → record `domain_verdict`, `rule_ids`.
   - If **REJECT**: stop builders; present user options A/B/C (see AGENTS.md).
2. **Design** (`flotory-design` skill) → `design_verdict`, token map for UI work.
   - If **NEEDS_NEW_TOKENS**: pause for user approval.
3. **Spec** — fill `acceptance`, `api_contract`, `file_ownership`, `out_of_scope`.

## Phase 1 — Build

- **Backend first** when API or campaign logic changes.
- Then **Mobile** / **Web** in parallel if no file overlap.
- Skip agents marked `skip` in task yaml.

## Phase 2 — Verify

- **Tests** (`flotory-tests` skill) — run verify commands; cite `rule_ids` in tests.
- **Reviewer** (spawn `flotory-reviewer` subagent) — pass it the diff; tool-locked.
- **Security** (spawn `flotory-security` subagent) — when anything gates value, not
  just new endpoints; pass it the diff; tool-locked.

## Phase 3 — Ship (user must ask)

- **Docs** → **Release** only on explicit ship/TestFlight/push.

## Phase 4 — Learn

- Run **flotory-retro**; propose skill/ADR/golden-task updates for user approval.

## Routing rules

| Situation | Action |
|-----------|--------|
| Mobile-only copy | Skip backend; still run Design if UI |
| User asks illegal product | Domain REJECT → user decision |
| Diff > ~500 lines | Split into two task yamls |
| Reviewer BLOCK | Send blockers to **one** owning agent only |
| Small one-file fix | Domain light pass + one builder + Tests + Reviewer |

## User-facing updates

Report status as:

```text
Task <id>: Domain ✓ Design ✓ Backend ✓ Mobile ✓ Tests ✓ Reviewer: APPROVE
Blocked: none | Decision needed: <one question>
```

## Attach context

- Link relevant exemplar from `docs/agent/exemplars/`.
- Link ADRs from `docs/decisions/`.
