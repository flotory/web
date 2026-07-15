# ADR 003 — Geofence NFC taps to establish presence

**Status:** Accepted (interim) · **Date:** 2026-07-15 · **Rules:** S9, S10, S11, Z9, Z10

## Context

Stamping was `POST /api/nfc/t/{token}/stamp` guarded only by Sanctum auth and the
tag token. The token is a static `Str::random(32)` printed on a stand in a public
room, and every modern phone reads NFC URLs without our app installed.

So the token is a **public bearer credential**. A customer taps once at the
counter, reads the URL off their screen, and can stamp from their sofa forever.
The rate limit permitted 10 stamps per 120 seconds — 300/hour at a venue whose
top milestone is 15 stamps.

Nothing caught this, and the reason is instructive. `Z7` framed tag tokens as a
*confidentiality* concern ("must not allow cross-user data access"), and the
security skill asked only that tokens not leak into client logs. We implemented
that control faithfully — `nfcReader.ts` has a `maskToken()` helper — and it
protects a value printed on a public counter. The invariant that actually
mattered, *a stamp means someone was here*, was never written down, so no gate
could check it. Missing rules, not violated ones.

## Decision

1. **Write the invariant first** (S9). Everything else is downstream of it.
2. **Geofence the tap** (S10): the client sends coordinates, the server rejects
   awards further than `loyalty.nfc.geofence.radius_meters` from the venue.
3. **Fail closed** where the fence cannot be evaluated.
4. **Re-charter security review** (Z10) to ask what a motivated customer could do
   to profit, not only whether a diff violates Z1–Z9.

## What this does and does not buy

Coordinates are **client-asserted**. A mock-location app forges them; on Android
that is a free download. This raises the attack cost from "read a URL off your
screen" to "install a spoofing app and look up the cafe's coordinates."

That filters approximately all casual freeloaders and no determined ones. It is a
**mitigation, not proof**, and it is explicitly a bridge to NTAG 424 DNA tags,
which emit a fresh CMAC and an incrementing counter per physical tap and make
replay impossible rather than merely inconvenient.

**The cost of that migration scales with deployed venues.** Today it is a box of
tags and an afternoon. Do not let this ADR become the permanent answer.

## Consequences

- Customers must grant location permission. A denied permission means no stamp
  once enforcement is on — a real support cost, accepted deliberately.
- Radius is 200 m plus a capped accuracy allowance (≤100 m). Generous on purpose:
  a false rejection at the counter costs more than a rare false accept. Indoor
  GPS is poor; tune from `nfc.geofence.out_of_range` logs, not from intuition.
- The accuracy allowance is clamped so a client cannot widen its own fence by
  claiming absurd accuracy.
- A venue without coordinates cannot be tapped at all, because publication
  requires a mapped address (S11). The fence depends on that; if `isPublic` ever
  drops the requirement, S10 silently stops protecting anything —
  `test_venue_without_coordinates_cannot_be_tapped_at_all` pins it.

## Rollout

Enforcement ships **off** (`LOYALTY_NFC_GEOFENCE_ENFORCE=false`). While off, the
geofence protects nothing: an attacker simply omits the coordinates.

1. Deploy the server in monitor mode.
2. Ship the mobile build that sends coordinates.
3. Watch `nfc.geofence.missing_coordinates` drain as old clients update.
4. Set `LOYALTY_NFC_GEOFENCE_ENFORCE=true`.
5. Watch `nfc.geofence.out_of_range` for false rejections before tightening the
   radius.

Step 4 is the one that matters. Monitor mode is not a destination either.

## Rejected alternatives

- **Tighten the rate limit alone** — a cheater capped at 4/day still farms a free
  cake every 4 days from their sofa. Worth doing (S6 window is still far too
  generous against "one stamp = one visit"), but it is damage control.
- **Staff confirmation** — the 2026 pivot removed the staff scanner; reintroducing
  a counter interaction contradicts the product.
- **IP geolocation** — venue Wi-Fi and mobile carrier NAT make this both
  bypassable and prone to false rejections.
