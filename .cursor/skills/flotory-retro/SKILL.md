---
name: flotory-retro
description: Runs post-task retrospective for Flotory agents and proposes updates to skills, ADRs, tests, and golden tasks. Use after merge or when the user asks to improve agent workflow.
---

# Flotory Retro agent

Makes the agent system **smarter over time** — not via chat memory, via repo artifacts.

## When

- After task marked `done` in task yaml.
- After TestFlight bug found.
- Monthly agent workflow review.

## Process

1. Read `.cursor/tasks/<id>.yaml` and what actually shipped.
2. Ask: What failed, surprised, or was slow?
3. Propose **concrete artifact updates** (user approves each).

## Output template

Copy to task yaml `retro` section + present to user:

```yaml
retro:
  completed: true
  what_worked: []
  what_failed: []
  proposed_updates:
    - type: skill | adr | test | golden_task | exemplar | AGENTS
      file: path
      change: one-line description
  golden_tasks_rerun: [] # ids from docs/agent/golden-tasks.md
  skill_changelog:
    - skill: flotory-mobile
      version: v2
      note: applies_now gates active campaign UI
```

## Rules for learning

| Failure type | Update |
|--------------|--------|
| Wrong business behavior | ADR + maybe BUSINESS_RULES (user approves) |
| Agent didn't know convention | Skill line + optional exemplar |
| Will regress | PHPUnit or golden task |
| Bad handoff | AGENTS.md or orchestrator skill |
| Off-brand UI | design/*.md + design skill |

## Golden tasks

After skill/rule changes, list which golden tasks from `docs/agent/golden-tasks.md` must be re-run.

## Must not

- Auto-merge skill/doc changes without user approval.
- Store learnings only in chat.
