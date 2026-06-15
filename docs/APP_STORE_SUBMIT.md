# App Store submission (iOS)

Step 2 after Apple Developer enrollment: publish legal URLs, complete App Store Connect listing, and submit a production build for review.

## Prerequisites

| Item | Status |
|------|--------|
| Apple Developer Program ($99/yr) | Enrolled |
| App in App Store Connect (`com.flotory.mobile`) | Created |
| Team ID `U353R2K2MJ` | In `app.json` / Xcode signing |
| TestFlight build processing | Build 16 (1.0.15) or newer |

## 1. Deploy legal pages (required)

App Store Connect requires a **public privacy policy URL**.

After deploying web changes:

- https://flotory.com/privacy
- https://flotory.com/terms

Update contact details in `resources/js/lib/legalConfig.ts` before production deploy (entity name, registered address). Public contact is currently `flotoryapp@gmail.com`.

## 2. App Store Connect listing

Open [App Store Connect → Flotory → App Information](https://appstoreconnect.apple.com).

Copy from `apps/mobile/store-listing/en-US/`:

| Field | File |
|-------|------|
| Name | `name.txt` |
| Subtitle | `subtitle.txt` |
| Description | `description.txt` |
| Keywords | `keywords.txt` |
| Promotional text | `promotional_text.txt` |

### Screenshots (required)

Upload for **6.7"** (iPhone 15 Pro Max) and **6.1"** (iPhone 15 Pro) at minimum:

| # | Screen | Why |
|---|--------|-----|
| 1 | Home — reward carousel + NFC CTA | Core value |
| 2 | Wallet — stamp progress card | Loyalty loop |
| 3 | Stamp tab — NFC ready state | Differentiator |
| 4 | Slide to redeem | Redemption UX |
| 5 | Venues — nearby discovery | Optional |

Capture on a physical iPhone (Simulator screenshots are not accepted for device frames). Xcode → Window → Devices and Simulators → Screenshot, or iPhone side button + volume.

### App Information

| Field | Value |
|-------|--------|
| Primary category | Food & Drink (or Lifestyle) |
| Privacy Policy URL | `https://flotory.com/privacy` |
| Support URL | `https://flotory.com/app` |
| Marketing URL | `https://flotory.com` |
| Copyright | `© 2026 Flotory` |
| Age rating | Complete questionnaire → likely **4+** |
| Encryption | No (`ITSAppUsesNonExemptEncryption: false` in `app.json`) |

### App Privacy (nutrition labels)

Declare data collected per `PRIVACY_POLICY.md` **as implemented today**:

- **Contact info** — email (account); name if provided or from Google sign-in
- **Identifiers** — user ID
- **Location** — coarse (nearby venues) when permission granted — linked to user, not used for tracking
- **Do not declare yet:** push notification data, payment info, third-party advertising analytics

NFC: tag URL only; no payment data in the guest app. Google sign-in: disclose third-party authentication if Connect asks.

## 3. Upload a production build

Bump version in `apps/mobile/app.json` before each App Store submit (build number must increase).

### Option A — Xcode (current workflow)

```bash
cd apps/mobile
npm run prebuild:ios
cd ios && pod install

xcodebuild -workspace Flotory.xcworkspace -scheme Flotory \
  -configuration Release -archivePath /tmp/Flotory.xcarchive \
  -destination 'generic/platform=iOS' DEVELOPMENT_TEAM=U353R2K2MJ \
  -allowProvisioningUpdates archive

xcodebuild -exportArchive -archivePath /tmp/Flotory.xcarchive \
  -exportPath /tmp/Flotory-export \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```

Or run `apps/mobile/scripts/submit-app-store.sh`.

### Option B — EAS

```bash
cd apps/mobile
eas login
eas build --platform ios --profile production
eas submit --platform ios --latest --profile production
```

## 4. Submit for review

1. App Store Connect → **Distribution** → iOS App → **+ Version**
2. Select the uploaded build (not only TestFlight)
3. Paste **App Review Information** from `store-listing/en-US/review_notes.txt`
4. Add demo account credentials if prompted
5. **Submit for Review**

Typical review: 24–48 hours.

## 5. After approval

1. Copy the App Store URL from Connect
2. Set `FLOTORY_IOS_UPDATE_URL` in production `.env` to that URL (or keep `https://flotory.com/app` until Play Store ships)
3. Update venue join bridge and landing CTAs with the install link
4. Share the app link with venues you are onboarding

## Checklist

```
□ legalConfig.ts updated (entity, address, emails)
□ /privacy and /terms live on flotory.com
□ Screenshots uploaded (6.7" + 6.1")
□ Listing copy pasted from store-listing/
□ Privacy nutrition labels completed
□ New build uploaded (build number incremented)
□ Review notes + demo account submitted
□ Submit for Review clicked
```

See also: [apps/mobile/README.md](../apps/mobile/README.md).
