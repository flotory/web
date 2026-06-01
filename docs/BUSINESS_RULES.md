# Business Rules

Core product invariants for Flotory. These describe **what the system must guarantee**, not how it is implemented.

Read alongside [MVP_DECISIONS.md](./MVP_DECISIONS.md) (approved engineering decisions) and [PRODUCT.md](./PRODUCT.md) (user journeys).

---

## Loyalty Rules

- Customers earn progress through **stamps** toward milestone **rewards**.
- Rewards unlock when a customer reaches the configured stamp threshold for that milestone.
- A reward unlock is unique per **customer**, **reward**, and **cycle**. The same customer may earn the same reward again in a later cycle.
- A reward unlock may only be **claimed once**. After claim, it is consumed and removed from the customer wallet.
- Customers must **never lose rewards they have already earned**. Earned-but-unclaimed rewards remain available until redeemed or explicitly handled by a documented exception (e.g. venue closure policy communicated to customers).
- Unlock and claim state live on the same record. **Reward unlocks are the single source of truth** for what a customer has earned and what they have used.
- Stamps are **not deducted** when a reward is claimed. Claiming marks the unlock as used; stamp balance is unchanged.
- When a customer completes a full loyalty cycle (reaches the highest active milestone), their stamp balance resets and a new cycle begins. Unclaimed rewards from prior cycles remain redeemable.
- Redeeming a reward always consumes the **oldest unclaimed unlock** for that reward type (first-in, first-out across cycles).

---

## Stamp Rules

- **Stamps** are customer-facing. Customers see stamps on their loyalty card and progress toward the next reward.
- **Visits** are owner-facing analytics. A visit is recorded when staff award stamps at the counter.
- Customer-facing UI must use **“stamps”** terminology, never “visits.”
- A venue may award **multiple stamps in one staff action** (e.g. double stamp Tuesday).
- Each staff stamp action creates one visit record for analytics, regardless of how many stamps were awarded.
- The same customer must not receive duplicate stamp awards from accidental double-scanning within a short window.

---

## Reward Rules

- Rewards are configured as **milestones** with a required stamp threshold.
- Each active milestone threshold must be unique per venue. Two rewards cannot share the same stamp requirement while both exist in configuration.
- Owners may **archive** rewards to stop new customers from earning them. Archiving is reversible.
- Owners may **permanently delete** only archived rewards, and only when no customers hold unclaimed unlocks for that reward.
- Archiving or deleting a reward must **never silently remove** rewards customers have already earned.
- Customers should always understand whether a reward is available to earn, available to redeem, already used, or no longer offered.
- Reward thresholds represent **milestone progression** on the loyalty card, not visit counts.

---

## Invitation Rules

- Staff join a venue through **email invitation links**, not shared passwords or owner-created credentials.
- Invitations belong to a **specific venue** and a **specific email address**.
- Invitations **expire** after a limited period. Expired invitations may be resent with a new link.
- **Accepted** invitations cannot be reused or resent.
- **Cancelled** invitations cannot be accepted; a new invitation must be sent.
- Only the email address that received the invitation may accept it.
- **Deleted or closed venues cannot accept new staff invitations.**
- Venue owners cannot be invited as staff to their own venue.
- Users who are already active staff at a venue cannot receive a duplicate invitation.

---

## Customer Rules

- A customer enrolls at a venue by scanning its QR code or joining through the venue landing page.
- A user may have **one loyalty card per venue**. Joining the same venue again returns the existing card.
- Customers may belong to **multiple venues** simultaneously.
- Customers redeem rewards **at the venue** by opening **Rewards → Claim**, showing the **claim QR** to staff, and staff scanning it on the same scanner used for stamps (not the stamp card QR).
- Customers may only view and redeem **their own** loyalty cards and rewards.
- Customers may only interact with rewards and stamps for venues where they are enrolled.

---

## Ownership Rules

- Venue ownership and staff membership live in the **venue membership** relationship, not on the user account itself.
- The user account table does **not** store global owner, staff, or customer roles.
- A single user may be **owner at one venue**, **staff at another**, and **customer at many**.
- Each venue has one or more owners through membership. Owners manage rewards, team, settings, and analytics.
- Staff may scan customers and view customer lists for their venue; they may not perform owner-only configuration.
- The venue owner **cannot remove themselves** from the team or demote themselves to staff.
- **Platform administration** (`is_admin`) is separate from venue roles and is for Flotory operators only.

---

## Security Rules

- **Backend authorization is always the source of truth.** Frontend route guards improve UX but do not enforce security.
- All venue-scoped actions must verify the authenticated user’s membership and role for that venue.
- **Cross-venue access must always be denied** unless the user legitimately belongs to both venues (e.g. customer at A, staff at B).
- Customers cannot access scanner, reward management, team management, or venue settings.
- Staff cannot perform owner-only actions, even via direct API calls or URL manipulation.
- Owners cannot access venues they do not belong to.
- QR codes and API identifiers must not allow one user to read or modify another user’s loyalty data.
- Dangerous operations (delete venue, purge reward, remove team member) require explicit confirmation in the UI.

---

## UX Rules

- Form saves follow **Save → Saving… → Saved ✓** so users know their action completed.
- Cross-page success and errors use **toasts**; form field errors use **inline validation**.
- **Dangerous actions** require a confirmation step before proceeding.
- **Empty states** must explain what happened and what to do next (e.g. “No rewards yet — create your first milestone”).
- Owner **Rewards** page shows the same stamp grid guests see; owners manage milestones by tapping gift slots on that grid (not a separate card list).
- **Error states** must offer recovery (retry, go back, contact support) where possible.
- Customer loyalty surfaces use **stamps**, **rewards**, and **progress** language consistently.
- Owner analytics surfaces use **visits**, **customers**, and **loyalty activity** language consistently.
- After staff scans the claim QR, customers receive clear **success feedback** on the claim screen before returning to their wallet.
- If staff scan the **stamp card** while the customer has unclaimed rewards, staff see a **warning** to ask for the claim QR instead.
