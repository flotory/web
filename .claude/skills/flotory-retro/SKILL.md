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

1. Read `.claude/tasks/<id>.yaml` and what actually shipped.
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
| **Every gate passed and the bug shipped anyway** | A rule is **missing**, not violated. Propose the S/Z line **first**, then the test. Ask why no agent was chartered to notice — that answer usually belongs in a skill. |
| Wrong business behavior | ADR + maybe BUSINESS_RULES (user approves) |
| Agent didn't know convention | Skill line + optional exemplar |
| Will regress | PHPUnit or golden task |
| Bad handoff | AGENTS.md or orchestrator skill |
| Off-brand UI | design/*.md + design skill |

The first row is the expensive one. A violated rule is a bug; a **missing** rule
is a blind spot the whole pipeline shares, and it will keep shipping until
someone writes the rule down. See [ADR 003](../../../docs/decisions/003-nfc-presence-geofence.md).

## Golden tasks

After skill/rule changes, list which golden tasks from `docs/agent/golden-tasks.md` must be re-run.

| Task type | Re-run |
|-----------|--------|
| Campaign / stamp logic | GT-01, GT-02, GT-03, GT-06 |
| NFC / geofence / value thresholds | **GT-09** |
| Mobile UI / release | GT-04, GT-05 |
| Forms / design system | **GT-07** (`bash scripts/check-gt07-forms.sh`) |
| Full pre-TestFlight | GT-01 – GT-05 + GT-07 + GT-09 |

If GT-07 fails after a UI task, propose skill update in `flotory-mobile` / `flotory-web` / `flotory-design` — do not weaken the check.

## Must not

- Auto-merge skill/doc changes without user approval.
- Store learnings only in chat.
