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
| `.cursor/rules/` | Global + layer rules (auto-applied) |
| `.cursor/skills/flotory-*/` | Invoke per agent role |
| `.cursor/tasks/` | Per-feature task yaml |
| `design/tokens.md` | Design agent token map |
| `docs/decisions/` | ADRs |

## Quick start

```
Use flotory-orchestrator. Task: <your intent>
```

After merge:

```
Use flotory-retro for task <id>
```

Before TestFlight:

```
Run golden tasks GT-01 through GT-05 from docs/agent/golden-tasks.md
```
