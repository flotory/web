# App Store (iOS)

Ops guide for Flotory on App Store Connect (`com.flotory.mobile`).

## Current status

| Item | Status |
|------|--------|
| Apple Developer Program | Enrolled |
| Legal URLs | Live — https://flotory.com/privacy · https://flotory.com/terms |
| Version **1.0.15** submitted for review | Build **16** (in review; manual release selected) |
| Local `app.json` | Build **17**, `supportsTablet: false` (for next upload if Apple rejects or you ship an update) |
| Team ID | `U353R2K2MJ` |

**While waiting for review:** confirm production demo login works (`customer@example.com` / `password` on https://flotory.com).

## After approval (do first)

1. App Store Connect → **Release this version** (manual release was selected at submit).
2. Copy the public App Store URL.
3. Set `FLOTORY_IOS_UPDATE_URL` in production `.env` (or keep `https://flotory.com/app` as redirect until you paste the real link).
4. Update landing, `/app`, and venue bridge CTAs with the install link.
5. Share the app link with venues you are onboarding.

## Resubmit or new version

Bump `apps/mobile/app.json` **buildNumber** before every upload (must increase). Bump **version** when shipping user-facing release notes.

### Listing copy

Paste from `apps/mobile/store-listing/en-US/`:

| Field | File |
|-------|------|
| Name | `name.txt` |
| Subtitle | `subtitle.txt` |
| Description | `description.txt` |
| Keywords | `keywords.txt` |
| Promotional text | `promotional_text.txt` |
| Review notes | `review_notes.txt` |

### Screenshots (iPhone)

Upload for **6.7"** and **6.1"** at minimum. iPad screenshots are **not** required — `supportsTablet` is `false`.

| # | Screen | Why |
|---|--------|-----|
| 1 | Home — reward carousel + NFC CTA | Core value |
| 2 | Wallet — stamp progress card | Loyalty loop |
| 3 | Stamp tab — NFC ready state | Differentiator |
| 4 | Slide to redeem | Redemption UX |
| 5 | Venues — nearby discovery | Optional |

Capture on a physical iPhone. Resize with `apps/mobile/store-listing/resize-for-app-store.sh` if needed. Output goes to `store-listing/ready-*/` (gitignored).

### App Information

| Field | Value |
|-------|--------|
| Primary category | Food & Drink |
| Privacy Policy URL | `https://flotory.com/privacy` |
| Support URL | `https://flotory.com/app` |
| Marketing URL | `https://flotory.com` |
| Copyright | `© 2026 Narek Divdaryan` |
| Age rating | **13+** (completed at submit) |
| Encryption | No (`ITSAppUsesNonExemptEncryption: false`) |

Contact entity: `resources/js/lib/legalConfig.ts` · public email `flotoryapp@gmail.com`.

### App Privacy (nutrition labels)

Declare per `PRIVACY_POLICY.md` **as implemented today**:

- **Contact info** — email; name if provided or from Google sign-in
- **Identifiers** — user ID
- **Location** — coarse (nearby venues) when permission granted — linked to user, not used for tracking
- **Product interaction** — loyalty stamps and redemptions
- **Do not declare:** push tokens, payment info, advertising analytics

### Upload build

**Option A — Xcode**

```bash
cd apps/mobile
npm run prebuild:ios
cd ios && pod install
# Archive + export in Xcode, or:
apps/mobile/scripts/submit-app-store.sh
```

**Option B — EAS**

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest --profile production
```

### Submit for review

1. Connect → **Distribution** → iOS App → version row
2. Attach the new build (not TestFlight-only)
3. Paste review notes + demo account (`customer@example.com` / `password`)
4. **Submit for Review**

Typical review: 24–48 hours.

## Checklist (new submit)

```
□ legalConfig.ts current (entity, address, emails)
□ /privacy and /terms live on flotory.com
□ iPhone screenshots (6.7" + 6.1")
□ Listing copy from store-listing/en-US/
□ Privacy nutrition labels match PRIVACY_POLICY.md
□ buildNumber incremented in app.json
□ Review notes + demo account attached
□ Submit for Review
```

See also: [apps/mobile/README.md](../apps/mobile/README.md).
