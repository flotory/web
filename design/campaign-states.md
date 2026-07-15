# Campaign UI states

Design reference for customer campaign surfaces. See ADR 001.

## States

### Active now (`applies_now: true`)

| Surface | Treatment |
|---------|-----------|
| Home carousel card | Dark (`campaignBg`), **Active** badge (flash), 2× stamp badge on thumbnail |
| Card detail header | Pulsing `CardPromotionSticker` when API `promotion` present and multiplier > 1 |
| Copy | Headline may use "× stamps active" from API |

### Scheduled (`applies_now: false`)

| Surface | Treatment |
|---------|-----------|
| Home carousel card | Light (`surface`), **Scheduled** badge (time-outline), **no** 2× overlay |
| Card detail header | **No** promotion sticker (API returns null or no promotion) |
| Copy | Schedule summary from API message |

## Forbidden

- Using carousel `featured` (first index) as proxy for active.
- Pulsing animation on scheduled campaigns.
- Inline hex instead of `colors.*` tokens.

## API notes

- Home carousel: each campaign has its own `applies_now`.
- Card detail: `promotion` is **venue-wide** winning campaign at request time — not the campaign tile the user tapped.

## Changelog

| Date | Change |
|------|--------|
| 2026-07-15 | Documented active vs scheduled; tied to applies_now |
