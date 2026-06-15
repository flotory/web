# NFC venue setup

How to turn on stamp collection at a venue after the product pivot (NFC-only stamps, no staff scanner).

Related: [ARCHITECTURE.md](./ARCHITECTURE.md#nfc-stamping-nfcstampservice), [apps/mobile/README.md](../apps/mobile/README.md), [ADMIN_ACCESS.md](./ADMIN_ACCESS.md).

---

## Prerequisites

| Requirement | Why |
|-------------|-----|
| Venue **published** | Customers cannot join or stamp at `draft` / `pending_review` venues |
| At least one **active reward** milestone | Stamps need a program to count toward |
| Customer in **Flotory mobile app** (iOS native build for in-app NFC) | Expo Go cannot run Core NFC on the Stamp tab |
| Physical **NFC tag** (NTAG213/215/216 or similar) | Encoded with the Flotory tap URL |

---

## 1. Create the NFC stand (platform admin)

1. Log in as **platform admin** (`admin@flotory.com` locally).
2. Open **Manage venues** → select the venue → **NFC stamp stands**.
3. Click **Add stand** (label e.g. `Counter stand`).
4. Copy the **tap URL** — format: `https://flotory.com/t/{token}`  
   Local Docker: `http://localhost:8000/t/{token}`

**Demo Cafe (after `db:seed`):** token is fixed for local testing:

```text
democafenfcstandlocaltest00001
```

Tap URL: `http://localhost:8000/t/democafenfcstandlocaltest00001` (local) or `https://flotory.com/t/...` (production).

---

## 2. Program the physical tag

Use any NDEF URI writer (e.g. **NFC Tools** on iPhone/Android):

1. Create a new **URI / URL** record.
2. Paste the full tap URL from step 1.
3. Write to a blank NFC sticker or card.
4. Label the stand visibly (“Tap for stamp”).

**iOS:** Settings → general NFC must be on.  
**Android:** Tapping the tag opens the URL in the browser / app link — in-app Stamp tab NFC is iOS-native only for now.

---

## 3. Customer join flow

1. Guest scans the venue **QR** at the counter → web page `/v/{slug}` → **Open in Flotory app**.
2. Register or sign in (`customer@example.com` / `password` in demo).
3. App auto-joins the venue on first stamp (or join via **Venues** tab when published).

---

## 4. Collect stamps

| Method | Steps |
|--------|--------|
| **Tap the stand** | Phone on NFC tag → app opens `/t/{token}` → stamp awarded automatically when signed in |
| **Stamp tab (iOS)** | Open center **Stamp** tab → hold phone on programmed stand when NFC sheet appears |

Each successful tap = **+1 stamp** (campaign multipliers may apply).

**Rate limits:** ~2s debounce per user per tag; burst limit per venue (see `config/loyalty.php` → `nfc`).

---

## 5. Redeem rewards

When a milestone unlocks, the customer sees **READY TO REDEEM** on **Home** or **Wallet**.

1. Open the reward card.
2. **Slide to redeem →** (self-serve — no staff scanner).
3. Success shows **REDEEMED** / “Enjoy your reward!”

API: `POST /api/customer/rewards/unlocks/{unlock}/redeem`

---

## 6. Owner checklist

- [ ] Venue listing **published** (admin approved)
- [ ] At least one active reward configured (`/rewards`)
- [ ] NFC stand created and tag programmed
- [ ] Test with your own phone: join → tap → see stamp → test redeem if a reward is ready
- [ ] Place QR for **join** and NFC for **stamps** at the counter

Owners configure rewards and campaigns on the web. NFC stand provisioning is **admin** today — contact Flotory support or use admin access during venue onboarding.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| “Venue not available” / join fails | Venue must be `published` |
| “NFC stand is turned off” | Admin → reactivate tag |
| “Please wait a moment before tapping again” | 2s debounce — wait and retry |
| Stamp tab says unsupported | Use a **development build** on a real iPhone, not Expo Go |
| Tag opens browser but not app | Register `flotory://` deep links; use full `https://flotory.com/t/...` URL on tag |
| No reward to redeem | Customer may not have enough stamps yet; check Wallet journey |

---

## Local verification

```bash
# Reset demo data (includes Demo Cafe NFC token + customer@example.com with ready reward)
docker compose exec app php artisan migrate:fresh --seed

# Maestro smoke (simulator + dev build)
APP_ID=com.flotory.mobile \
CUSTOMER_EMAIL=customer@example.com \
CUSTOMER_PASSWORD=password \
NFC_TAP_TOKEN=democafenfcstandlocaltest00001 \
npm run test:mobile:e2e
```

See `.maestro/mobile/03-stamp-redeem.yaml` for the stamp + slide-redeem flow.
