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
npm run collect:canny       # Canny wishlist board (headless Chromium)
npm run collect:producthunt # Product Hunt reviews (headless Chromium)
```

Output lands in `data/` as JSON with a normalized review schema
(`source, id, country, lang, rating, title, text, author, date, appVersion, thumbsUp`)
plus per-source summaries (`data/summary.json`). Collectors are proxy-aware
(honors `HTTPS_PROXY`) and pace requests politely.

### Latest collection snapshot (2026-07-13)

- **App Store:** 482 unique written reviews across 17 storefronts (top: us 158, pk 111, eg 82, gb 47, ng 39), avg 3.8.
- **Google Play:** 420 unique written reviews across en/ar/bn/tr/fr locales, avg 3.62; listing shows score 4.39 from 4,583 ratings, 500,000+ installs.
- Written-review averages sit well below the star-rating averages on both stores — text reviews skew toward complaints (1★ is the second-largest bucket on both).
- **Canny:** 214 of 215 wishlist posts captured (1,193 votes). Statuses: 210 open, 2 planned, 2 in progress. Top asks: Apple/Google Pay (104 votes, planned), payment links (85), physical card (83), EUR/SEPA accounts (67), more currencies (52).
- **Product Hunt:** 8 of the site's 9 reviews captured, 3.0 site average — polarized between mission-driven 5★ and account-freeze/support 1★ complaints.

### Browser-based collectors

Canny and Product Hunt are client-side rendered (Product Hunt is also
Cloudflare-fronted), so those collectors drive headless Chromium via
`playwright-core` (`CHROMIUM_PATH` env overrides the default
`/opt/pw-browsers/chromium`). The Canny collector intercepts the SPA's own
`/api/posts/get` responses rather than parsing the DOM. Behind an
intercepting HTTPS proxy the browser hop is capped at TLS 1.2
(`--ssl-version-max=tls1.2`) because the proxy resets Chromium's TLS 1.3
ClientHello; certificate verification remains enabled.

## Plan

1. **Stage 1 (hours 0–8):** App Store RSS feed across target storefronts (us, gb, eg, pk, bd, ng, tr, dz, ma, ar) + Google Play reviews.
2. **Stage 2 (hours 8–16):** Canny wishlist posts via Playwright; Product Hunt reviews.
3. **Stage 3 (hours 16–24):** Trustpilot (polite, demo-only), YouTube comments, curated LinkedIn fixture.

## Docs

- [LinkedIn feedback-surface research](docs/linkedin-research.md)
