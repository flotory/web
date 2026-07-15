# Flotory agent golden tasks

Re-run relevant items **before TestFlight** and **after skill/rule changes**.

Mark pass/fail manually or via agent checklist.

## GT-01 — Happy Hour inactive outside window

**Setup:** Demo Cafe, Fri 20:51 `Europe/Warsaw` (or API test time frozen).

| Check | Expected |
|-------|----------|
| PHPUnit | `test_demo_happy_hour_is_inactive_outside_window_even_with_quiet_day_campaign` passes |
| Home carousel | Happy Hour card = Scheduled, no 2× badge |
| Card detail | No pulsing 2× STAMPS ACTIVE |

**Rule IDs:** C6, C11

---

## GT-02 — Happy Hour active inside window

**Setup:** Fri 16:00 Warsaw, Happy Hour campaign active.

| Check | Expected |
|-------|----------|
| PHPUnit | multiplier = 2 |
| Home carousel | Happy Hour `applies_now: true`, dark card, 2× badge |
| Card detail | Promotion sticker visible |

**Rule IDs:** C6, C11

---

## GT-03 — Domain rejects multiplier stacking

**Prompt Domain agent:** "Stack Happy Hour 2× and Quiet Day 2× for 4× stamps."

| Check | Expected |
|-------|----------|
| Domain verdict | REJECT |
| Rule IDs cited | C3, C4 |
| User decision | Options A/B/C presented |

---

## GT-04 — Mobile typecheck

```bash
cd apps/mobile && npm run typecheck
```

Expected: exit 0.

---

## GT-05 — Release version sync

When shipping iOS build:

| Check | Expected |
|-------|----------|
| `apps/mobile/app.json` | version + buildNumber bumped |
| `apps/mobile/ios/Flotory/Info.plist` | CFBundleShortVersionString + CFBundleVersion match |

---

## GT-06 — NFC stamp base case

**Rule:** S* — NFC-only stamping, 1 base stamp per tap (C5).

Manual or API test: single tap adds 1 stamp (× multiplier if campaign matches).

---

## GT-07 — Forms use shared components only

Run when UI adds or changes forms, **before merge**, and in **flotory-retro** after design-system tasks.

```bash
bash scripts/check-gt07-forms.sh
```

### Mobile

| Check | Expected |
|-------|----------|
| Text fields | `FormField` + `AppTextInput` (not raw `TextInput` in screens) |
| Search | `SearchInput` (not duplicated search bar markup) |
| Submit / danger CTAs | `AppButton` (`primary` / `danger` / `ghost`) — not inline `Pressable` + `colors.primary` |
| Allowed raw `TextInput` | Only inside `AppTextInput.tsx`, `SearchInput.tsx` |

### Web

| Check | Expected |
|-------|----------|
| Text / email / password | `AppInput` + `FormLabel` |
| Textarea | `FormTextarea` |
| Select | `FormSelect`, `PhoneInput`, or `VenueAddressInput` |
| Errors / success | `AppAlert` — not `rounded-2xl bg-danger-soft p-3` copy-paste |
| Destructive actions | `AppButton variant="danger"` |

### Reviewer

On any PR touching `apps/mobile/app/**`, `resources/js/pages/**`, or form components:

- [ ] GT-07 checks pass (run script or equivalent grep)
- [ ] No new inline hex/rgba when `colors.*` / `overlays.*` / `--flotory-*` exist

**Rule IDs:** Y1, Y2 · **ADR:** [002](../decisions/002-design-system-unification.md)

---

## Adding golden tasks

Retro agent proposes new GT-* entries after production bugs. Keep each task **observable** and tie to **rule_ids**.
