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

## Usage

```bash
npm install
npm run collect             # both collectors + combined summary
npm run collect:appstore    # App Store only (17 storefronts, iTunes RSS)
npm run collect:googleplay  # Google Play only (10 lang/country locales)
```

Output lands in `data/` as JSON with a normalized review schema
(`source, id, country, lang, rating, title, text, author, date, appVersion, thumbsUp`)
plus per-source summaries (`data/summary.json`). Collectors are proxy-aware
(honors `HTTPS_PROXY`) and pace requests politely.

### Latest collection snapshot (2026-07-13)

- **App Store:** 482 unique written reviews across 17 storefronts (top: us 158, pk 111, eg 82, gb 47, ng 39), avg 3.8.
- **Google Play:** 420 unique written reviews across en/ar/bn/tr/fr locales, avg 3.62; listing shows score 4.39 from 4,583 ratings, 500,000+ installs.
- Written-review averages sit well below the star-rating averages on both stores — text reviews skew toward complaints (1★ is the second-largest bucket on both).

## Plan

1. **Stage 1 (hours 0–8):** App Store RSS feed across target storefronts (us, gb, eg, pk, bd, ng, tr, dz, ma, ar) + Google Play reviews.
2. **Stage 2 (hours 8–16):** Canny wishlist posts via Playwright; Product Hunt reviews.
3. **Stage 3 (hours 16–24):** Trustpilot (polite, demo-only), YouTube comments, curated LinkedIn fixture.

## Docs

- [LinkedIn feedback-surface research](docs/linkedin-research.md)
