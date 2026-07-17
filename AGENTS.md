# Flotory agent workflow

**One front door:** you describe intent → **Orchestrator** runs the pipeline → specialists implement → gates verify → you approve ship.

Read this file first. Use skills in `.claude/skills/flotory-*/SKILL.md` for each role.

## The 12 agents

| # | Agent | Skill | Writes code? |
|---|--------|-------|--------------|
| 1 | **Orchestrator** | `flotory-orchestrator` | No |
| 2 | **Domain** | `flotory-domain` | No (rules gate) |
| 3 | **Design** | `flotory-design` | No (token gate) |
| 4 | **Spec** | (part of orchestrator) | No |
| 5 | **Backend** | `flotory-backend` | Yes — `app/`, `database/`, `routes/`, `tests/` |
| 6 | **Mobile** | `flotory-mobile` | Yes — `apps/mobile/` |
| 7 | **Web** | `flotory-web` | Yes — `resources/js/` |
| 8 | **Tests** | `flotory-tests` | Yes — tests only |
| 9 | **Reviewer** | `flotory-reviewer` | **Readonly** |
| 10 | **Security** | `flotory-security` | **Readonly** |
| 11 | **Docs** | `flotory-docs` | Docs / ADRs only |
| 12 | **Release** | `flotory-release` | `app.json`, plist, submit scripts |

**Learning loop:** `flotory-retro` after every task → update skills, ADRs, golden tasks.

## Pipeline

```
You
 → 1 Orchestrator (create .claude/tasks/<id>.yaml)
 → 2 Domain (ALLOW / REJECT + rule_ids)     ← blocks illegal product
 → 3 Design (tokens + UX states)            ← blocks off-brand UI
 → 4 Spec (acceptance + API contract)
 → 5–7 Backend → Mobile / Web (parallel when safe)
 → 8 Tests
 → 9 Reviewer (readonly)
 → 10 Security (readonly, when auth/API/PII)
 → 11 Docs (if behavior or rules changed)
 → 12 Release (only when you say ship / TestFlight / push)
 → flotory-retro (propose learning artifacts)
 → You approve merge / ship
```

Skip agents when N/A (e.g. web on mobile-only copy fix).

## Human decision gates (always pause)

| Trigger | Options |
|---------|---------|
| Domain **REJECT** | A) work within rules B) amend `BUSINESS_RULES.md` (you approve) C) cancel |
| Design proposes **new tokens** | Approve token additions or use existing |
| Migration / auth / PII / push | Explicit approval before apply |
| Reviewer **BLOCK** | Fix blockers → re-run Tests + Reviewer |
| Security **BLOCK** | Fix or escalate — never auto-merge |
| Commit / push / TestFlight | Explicit user request only |

**User intent does not override `docs/BUSINESS_RULES.md` unless you explicitly approve a documented rule change.**

## Task memory

Each feature: `.claude/tasks/<task-id>.yaml` (copy from `.claude/tasks/TEMPLATE.yaml`).

Permanent memory lives in the repo — not chat:

| Artifact | Purpose |
|----------|---------|
| `docs/BUSINESS_RULES.md` | Domain source of truth (rule IDs) |
| `docs/decisions/` | ADRs — why we built it this way |
| `design/tokens.md`, `design/campaign-states.md` | Design constraints |
| `docs/agent/golden-tasks.md` | Regression exam before TestFlight |
| `docs/agent/exemplars/` | Merged patterns to copy |
| `.claude/skills/flotory-*/` | Agent instructions (version in skill changelog) |

## Layer ownership

| Path | Owner agent |
|------|-------------|
| `app/`, `database/`, `routes/` | Backend |
| `apps/mobile/` | Mobile |
| `resources/js/` | Web |
| `apps/mobile/app.json`, `apps/mobile/ios/` | Release |
| `docs/BUSINESS_RULES.md` | Domain (propose) + you (approve) |
| `apps/mobile/src/theme.ts`, `design/` | Design (propose) + you (approve new tokens) |

**One writer per file** per parallel batch. Orchestrator serializes conflicts.

## Verify commands

| Layer | Command |
|-------|---------|
| Backend | `docker compose run --rm app php artisan test --filter=<TestName>` |
| Mobile | `cd apps/mobile && npm run typecheck` |
| Forms / design (GT-07) | `bash scripts/check-gt07-forms.sh` |
| Golden tasks | See `docs/agent/golden-tasks.md` |

## How to start a task

**Default:** just describe what you want — orchestration runs automatically.

Examples:
- "Fix guest venue tap refreshing"
- "Add birthday campaign"
- "Bump TestFlight"

Optional explicit trigger still works: `Orchestrate: …`

**Skip pipeline:** say `quick fix only` or `skip orchestrator` for trivial one-line changes.

Read `AGENTS.md` and maintain `.claude/tasks/<id>.yaml` for every dev task.

## Getting smarter

After every merged task, run **flotory-retro**:

1. What failed or surprised us?
2. Update skill / ADR / test / golden task (you approve).
3. Re-run golden tasks before next TestFlight.

See `docs/agent/retro-template.yaml`.
