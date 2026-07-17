# Agent workflow

How we develop Flotory with orchestrated agents, rules, and continuous learning.

| Doc | Purpose |
| --- | --- |
| [../AGENTS.md](../AGENTS.md) | **Start here** — 12 agents, pipeline, human gates |
| [golden-tasks.md](./golden-tasks.md) | Regression exam before TestFlight |
| [retro-template.yaml](./retro-template.yaml) | Post-task learning template |
| [exemplars/campaign-applies-now.md](./exemplars/campaign-applies-now.md) | Reference vertical slice |

## Cursor setup

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` (root) | Global agent laws (always loaded) |
| `app/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `resources/js/CLAUDE.md` | Layer rules (auto-load in that dir) |
| `.claude/skills/flotory-*/` | Invoke per agent role (`/flotory-<role>`) |
| `.claude/tasks/` | Per-feature task yaml |
| `design/tokens.md` | Design agent token map |
| `docs/decisions/` | ADRs |

## Quick start

**Default:** describe what you want in chat — orchestration runs automatically (`alwaysApply` global rule + `AGENTS.md`).

Optional: `Orchestrate: …` · Skip: `quick fix only` or `skip orchestrator`

After merge: `flotory-retro` for task `<id>`

Before TestFlight: golden tasks GT-01–GT-05 + GT-07 (`bash scripts/check-gt07-forms.sh`)
