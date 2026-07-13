# nsave · Feedback Intelligence

Collects nsave's public user feedback from every scrapeable surface, normalizes it
into one dataset, and presents it in an **nsave-themed dashboard with Claude AI
analysis** built in.

**~1,294 feedback items across 6 surfaces** (App Store, Google Play, Trustpilot,
Product Hunt, a Canny wishlist board, and curated public LinkedIn comments).

![Dashboard](docs/screenshots/dashboard-light.png)

## Quick start

```bash
npm install

# 1. Collect the data (or use the snapshots already committed in data/)
npm run collect

# 2. Run the dashboard
export ANTHROPIC_API_KEY=sk-ant-...   # optional — turns on the AI features
npm run dashboard                     # http://localhost:3000
```

## Where the data lives

All collected feedback is stored as JSON in the **`data/` directory, committed to
this repo** — so the dashboard runs immediately after cloning, no scrape required:

| File | Contents |
|---|---|
| `data/appstore.json` | 482 App Store reviews (17 storefronts) |
| `data/googleplay.json` | 420 Google Play reviews + listing metadata |
| `data/trustpilot.json` | 140 Trustpilot reviews |
| `data/producthunt.json` | 8 Product Hunt reviews |
| `data/canny.json` | 214 Canny wishlist posts + votes/status |
| `data/linkedin-curated.json` | 6 posts, 30 curated public comments |
| `data/summary.json` | Combined cross-surface summary |

Reviews share a normalized schema: `source, id, country, lang, rating, title, text,
author, date, appVersion, thumbsUp`. Re-running a collector overwrites its file;
`npm run summarize` rebuilds `data/summary.json` from whatever is on disk.

## Dashboard

A small Express app (`src/dashboard/`) serving a single-page dashboard.

- **Themed after [nsave.com](https://www.nsave.com)** — white surfaces, near-black
  ink, the nsave crimson accent (`#d60505`), and a Suisse-style grotesque font,
  built on Material Design 3 tokens. Light + dark themes (dark is stepped for the
  dark surface, not an inverted flip); responsive.
- **Charts** are hand-built SVG/CSS bars on a colourblind-validated palette with
  every bar directly labelled: rating distribution (diverging red→blue), sentiment
  split, volume by surface and country, and the Canny wishlist.
- **KPI cards**: total items, average rating, negative-review share, installs,
  TrustScore.

### AI integration (Claude)

Set `ANTHROPIC_API_KEY` and the dashboard unlocks two features backed by
`claude-opus-4-8`:

- **Executive summary** — headline, top complaints, praise, most-wanted features,
  and recommended focus, generated on load.
- **Grounded Q&A** — ask a question (or use a suggested one) and Claude answers
  *only* from the collected feedback, naming the surfaces behind each point.

Both are grounded in a compact corpus (`src/dashboard/aggregate.js` → `buildCorpus`)
sampled from the real reviews, Canny asks, and LinkedIn comments, plus the aggregate
stats — so answers are anchored to the data, not the model's priors. Without a key
the dashboard still runs fully; the AI panel shows a "set `ANTHROPIC_API_KEY`" notice.

Endpoints: `/api/data`, `/api/summary`, `/api/ask`. Files: `aggregate.js` (data →
chart aggregates + AI corpus), `ai.js` (Anthropic SDK calls), `server.js` (Express),
`public/index.html` (the SPA).

## Feedback surfaces

| Surface | Volume collected | Approach | Risk |
|---|---|---|---|
| Apple App Store (id 6471736519) | 482 reviews, 17 storefronts | Free iTunes RSS reviews feed | Low |
| Google Play (`com.nsave.app`) | 420 reviews; 4.39/5, 500k+ installs | `google-play-scraper` | Low–medium |
| Trustpilot | 140 reviews, TrustScore 3.3 | Headless Chromium (`__NEXT_DATA__`), demo-only | High |
| Canny (nsave.canny.io) | 214 wishlist posts, 1,193 votes | Headless Chromium (intercepts `/api/posts/get`) | Low |
| Product Hunt | 8 reviews, 3.0/5 | Headless Chromium (Cloudflare-fronted) | Low–medium |
| LinkedIn | 6 posts, 30 comments | Curated / owner-authorized only — [research](docs/linkedin-research.md) | Highest |
| Reddit | none — no indexed content | Skipped | — |

## Collectors

```bash
npm run collect              # all automated collectors + summary
npm run collect:appstore     # App Store (iTunes RSS, 17 storefronts)
npm run collect:googleplay   # Google Play (10 lang/country locales)
npm run collect:canny        # Canny wishlist (headless Chromium)
npm run collect:producthunt  # Product Hunt reviews (headless Chromium)
npm run collect:trustpilot   # Trustpilot reviews (headless Chromium, demo-only)
npm run summarize            # rebuild data/summary.json from disk
```

Collectors are proxy-aware (honour `HTTPS_PROXY`) and pace requests politely.
LinkedIn is deliberately **not** automated — its ToS prohibit scraping and LinkedIn
actively litigates; the fixture is hand-curated from public logged-out post pages.
See [`docs/linkedin-research.md`](docs/linkedin-research.md).

**Browser collectors:** Canny and Product Hunt are client-side rendered (Product
Hunt is also Cloudflare-fronted), so they drive headless Chromium via
`playwright-core` (`CHROMIUM_PATH` overrides the default `/opt/pw-browsers/chromium`).
Behind an intercepting HTTPS proxy the browser→proxy hop is capped at TLS 1.2
(`--ssl-version-max=tls1.2`) because the proxy resets Chromium's TLS 1.3 hello;
certificate verification stays enabled.

## What the data shows

Sentiment is sharply polarized. The 4.39 Google Play average masks a Trustpilot 3.3
and Product Hunt 3.0, and **30% of written reviews are 1–2★**. The dominant
complaints — consistent across App Store, Google Play, and Trustpilot — are frozen
funds and long "account under review" holds, unresponsive support, and failed/stuck
transfers, especially in the Egyptian, Pakistani, and Bangladeshi markets. Praise
centres on fast transfers, strong FX rates, and escaping local inflation. The Canny
board's top asks are Apple/Google Pay (104 votes, planned), payment links, and
physical cards.

## Docs

- [LinkedIn feedback-surface research](docs/linkedin-research.md)
- Dashboard screenshots: [`docs/screenshots/`](docs/screenshots/)
