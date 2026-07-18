# Flotory — Claude Code

Hospitality loyalty platform. Laravel 12 + Vue 3 monolith, Expo mobile app.
Setup, stack, and demo accounts: [README.md](./README.md).

## Read before changing behaviour

| File | Why |
|------|-----|
| [docs/BUSINESS_RULES.md](./docs/BUSINESS_RULES.md) | **Source of truth.** Numbered invariants (S*, B*, R*, C*, Z*). Cite rule IDs in tests. |
| [AGENTS.md](./AGENTS.md) | The agent pipeline, decision gates, and layer ownership. |
| [docs/decisions/](./docs/decisions/) | ADRs — why it is this way, and what already went wrong. |

**Your intent does not override `BUSINESS_RULES.md`.** If a task needs a rule
changed, say so and get explicit approval — do not quietly build around it.

## The rules are the floor, not the ceiling

The pipeline checks code against written rules. It cannot catch a rule that was
never written, and that is exactly how the NFC replay hole shipped: a customer
could stamp from home forever because *"a stamp means the customer was here"* was
not written down, so every gate passed. See
[ADR 003](./docs/decisions/003-nfc-presence-geofence.md).

So when you touch anything that gates value — stamps, rewards, rate limits,
thresholds, publication — ask **what could a motivated customer do to profit
here?** If the answer reveals a missing invariant, propose it as an S/Z rule
before writing code. A missing rule is worth more than a passing test.

## Verify

| Layer | Command |
|-------|---------|
| Backend | `docker compose exec -T app php artisan test --filter=<TestName>` |
| Mobile | `cd apps/mobile && npm run typecheck && npm run test:unit` |
| Full local CI | `./scripts/ci-local.sh` (what `push-prod.sh` runs) |

Tests alone are not verification — drive the real flow when there is one. The app
runs at http://localhost:8000 (not the Vite port). Demo logins are in the README;
customers are **mobile-only**, so API login needs `device_name` set to something
other than `web`/`browser` or `WebLoginGateService` rejects it with the same
message as a wrong password.

## Conventions

- Business logic lives in `app/Services/`; controllers stay thin.
- Never commit `.env` or `.env.secrets`. Never print secrets, or parts of them,
  into output.
- Commit and push only when asked. Deploys are `./deploy/push-prod.sh` and go to
  production — never run one unprompted.

## The pipeline (default for all dev work)

For **any implementation, bug fix, audit, or release**, act as **Orchestrator
first** — the user does not need to say "Orchestrate." Full pipeline and gates:
[AGENTS.md](./AGENTS.md).

1. Create/update a task yaml in `.claude/tasks/` from `TEMPLATE.yaml`.
2. **Domain** → **Design** (when UI/product) → **Spec** before code.
3. Implement via the layer skills (backend / mobile / web), then **Tests** → **Reviewer**.
4. **Security** when auth, customer data, or anything that gates value changes.
5. After merge-worthy work, propose **flotory-retro**.

**Skip the full pipeline only when** the user asks a question/review with no code
change, or says **"skip orchestrator"** / **"quick fix only"**. Even then: obey
`BUSINESS_RULES.md`, keep the diff minimal, honour the human gates below.

**Human gates — pause and ask:** Domain REJECT · a `BUSINESS_RULES.md` amendment ·
new design tokens · migrations · auth/PII changes · Reviewer BLOCK · any release.

**Git:** commit / push / TestFlight only when asked. No `--force`, no
`--no-verify`, no secrets in commits.

## Skills and agents

Builder/support roles are skills in `.claude/skills/flotory-*/SKILL.md`, invokable
as `/flotory-<role>`. The three gate roles — **Domain, Reviewer, Security** — are
tool-locked **subagents** in `.claude/agents/`, restricted to Read/Grep/Glob and
spawned with the Agent tool, so their readonly review is enforced, not requested.
Read the relevant role before acting in it; `flotory-security` is worth reading
before any change that gates value.
Layer-specific conventions load automatically from the nested `CLAUDE.md` in
`app/`, `apps/mobile/`, and `resources/js/`.
