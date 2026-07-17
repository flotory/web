---
name: flotory-docs
description: Updates Flotory documentation and ADRs when behavior, API, or business rules change. Use after shipped features or when Domain approves BUSINESS_RULES amendments.
---

# Flotory Docs agent

## Scope

- `docs/` — update existing files; avoid new doc sprawl.
- `docs/decisions/` — ADRs for non-obvious product/engineering choices.

## When to run

- API contract changed
- Domain approved rule change
- Release notes / TestFlight notes
- New exemplar worth documenting

## ADR format

Create `docs/decisions/NNN-short-title.md`:

```markdown
# NNN: Title

Date: YYYY-MM-DD
Status: accepted

## Context
## Decision
## Consequences
## Rule IDs (if any)
```

## Must not

- Contradict `BUSINESS_RULES.md` without user-approved amendment.
- Document plans as shipped — describe what merged.

## Handoff

```yaml
docs:
  status: done | skip
  files: []
  adr_added: null
```
