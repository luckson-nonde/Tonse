# Onboarding role banners

Drop the finished role-banner artwork in THIS folder and the carousel on the
role-selection screen picks it up automatically (no code change, hot-reload).

## File names (exact stems)

| Role             | File name                          |
| ---------------- | ---------------------------------- |
| Buyer            | `buyer.png` / `.jpg` / `.webp`     |
| Seller           | `seller.png` / `.jpg` / `.webp`    |
| Service Provider | `provider.png` / `.jpg` / `.webp`  |

## Artwork spec

- 16:9 aspect (e.g. **1600 × 900 px**); displayed at 100% width × ~220px.
- ALL content baked into the image: character artwork, headline, description,
  trust badges, CTA button. The app overlays nothing — it only rounds the
  corners (24px), clips overflow, and adds a soft shadow.
- Keep critical content away from the outer ~24px (corner clipping).
- Prefer < 300 KB per image (webp recommended).

Until a file exists here, the app renders a designed in-code fallback banner
for that role.

## Company position photos ("Your Position" step)

The four company-account positions (tier-2, after picking **Company Account** as
a buyer) become photo-led cards when artwork is present in the
**`company onboarding/`** subfolder. `getPositionImage(title)` in
[`RoleSelection.tsx`](../../../pages/RoleSelection.tsx) keys them with the shared
`normalizeSpecialtyKey`, so a file named for the position **label** resolves to
the card title with no rename:

- `Procurement Officer.webp`, `Secretary.webp`, `Receptionist.webp`,
  `Manager  Owner.webp` (→ card "Manager / Owner")

A position becomes image-led once its file is present; otherwise it keeps the
icon chip. `16:9` crop, `object-cover`, photo on top with an eyebrow/title/
description footer.
