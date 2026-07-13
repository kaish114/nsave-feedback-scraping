# nsave Feedback Scraping

Scraping intelligence and demo collectors for nsave's public feedback surfaces.

## Confirmed feedback surfaces

| Surface | Volume | Approach | Risk |
|---|---|---|---|
| Apple App Store (id 6471736519) | 408 US ratings, 4.2/5, per-country storefronts | Free iTunes RSS reviews feed / `app-store-scraper` | Low |
| Google Play (`com.nsave.app`) | ~4,400 ratings, ~4.36/5, 500k+ installs | `google-play-scraper` npm | Low–medium |
| Canny (nsave.canny.io) | ~215 wishlist posts | Playwright headless render | Low |
| Product Hunt | Dozens of reviews | Browser automation / GraphQL API | Low–medium |
| Trustpilot | 110 reviews, 3.5/5 | Playwright, demo-only (bot-protected) | High |
| LinkedIn | Company page + founder posts, public comments | Curated / owner-authorized only — see [docs/linkedin-research.md](docs/linkedin-research.md) | Highest |
| YouTube | Arabic + English review videos | YouTube Data API v3 comments | Low |
| Reddit | Negligible — no indexed content | Skip | — |

## Plan

1. **Stage 1 (hours 0–8):** App Store RSS feed across target storefronts (us, gb, eg, pk, bd, ng, tr, dz, ma, ar) + Google Play reviews.
2. **Stage 2 (hours 8–16):** Canny wishlist posts via Playwright; Product Hunt reviews.
3. **Stage 3 (hours 16–24):** Trustpilot (polite, demo-only), YouTube comments, curated LinkedIn fixture.

## Docs

- [LinkedIn feedback-surface research](docs/linkedin-research.md)
