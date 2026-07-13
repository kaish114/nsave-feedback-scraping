# LinkedIn as an nsave Feedback Surface — Research Notes

Supplement to the main scraping intelligence report. Researched 2026-07-13.

## TL;DR

- **LinkedIn is a confirmed, publicly viewable feedback surface for nsave** — the company page
  (linkedin.com/company/nsavecom, ~18,300 followers) and individual posts by the company and both
  founders render to logged-out visitors, **including comment texts**, via LinkedIn's
  server-side-rendered public post pages.
- **Comments on nsave/founder posts contain genuine product signal**: spot-checked posts showed users
  asking for waitlist updates, suggesting card design changes (vertical card orientation), and reacting
  to feature launches — the same feedback categories seen on Canny and the app stores, at lower volume.
- **Scraping risk is the highest of any surface surveyed.** LinkedIn's public rendering is a *soft*
  authwall that hardens quickly (IP-reputation-based redirects to `/authwall`, HTTP 999). LinkedIn sued
  Proxycurl — the largest LinkedIn-scraping API — in January 2025 (N.D. Cal. 3:25-cv-00828) and the
  service shut down in 2026 after settling. Treat LinkedIn as a **manual/curated or owner-authorized
  surface, not an automated scraping target**.

## Confirmed surfaces and content

### 1. Company page — linkedin.com/company/nsavecom

Publicly viewable without login: about section, industry (Financial Services), size (11–50), founded
2022, HQ London, follower count (~18,271), funding note ($18M Series A, Feb 2025), and a feed of recent
posts. Post themes: international-payment promos and welcome bonuses, raffle winners from Bangladesh and
Pakistan (confirming target-market engagement), product teasers, physical-card launch, hiring.

### 2. Founder profiles and posts

- **Amer Baroudi (CEO)** — linkedin.com/in/amer-baroudi. Posts frequently: product launches
  ("nsave — A Global USD Account", "nsave, redesigned"), the Syria expansion announcement, hiring,
  award mentions. His posts attract comments from users and fintech peers.
- **Abdallah AbuHashem (CTO/co-founder)** — linkedin.com/in/aabuhash. Posts about team, hiring
  (Backend Engineer posts with ~10 comments), and company milestones.
- **Edward Yee (co-founder)** — has historical nsave launch posts.

### 3. Comment signal (spot-checked, logged out)

Two sampled public posts (a company card-launch post and a founder hiring post, 55–57 reactions,
4 comments each) showed fully readable comment texts including:

- a user **requesting a waitlist update** (activation/onboarding friction signal),
- a user **suggesting vertical card orientation** (product/design feedback),
- congratulatory/community comments (low signal).

Volume per post is low (single-digit comments typical), but announcement posts (Series A, card launch,
Syria expansion) likely carry more. Expect a few hundred harvestable comments across the page + founder
history — smaller than Canny (~215 structured posts) but with unique audience overlap (diaspora
professionals, investors, fintech operators).

## Scrapeability assessment

| Aspect | Finding |
|---|---|
| Logged-out visibility | Post text, reaction/comment counts, and comment bodies render server-side for SEO |
| Authwall behavior | Soft and **inconsistent** — hardens with repeat requests, datacenter IPs, missing cookies; redirects to `/authwall` or returns HTTP 999 |
| Official API | Partner-gated. Community Management / Marketing APIs can read comments **only on pages the authenticated org owns** — i.e., nsave itself could export its own page comments legitimately; a third party cannot |
| Third-party APIs | Proxycurl sued by LinkedIn (Jan 2025), settled, shut down July 2026 and deleted its data. Remaining commercial scrapers carry the same exposure |
| ToS / legal | Automated collection explicitly prohibited by LinkedIn ToS. hiQ precedent means public scraping isn't automatically unlawful, but LinkedIn actively litigates and wins settlements |

## Recommendation

Do **not** build an automated LinkedIn collector into the demo pipeline. Instead:

1. **Manual/curated ingestion (hours, not days):** hand-collect the ~10–20 highest-engagement nsave and
   founder posts via logged-out public URLs, paste comment texts into a small JSON fixture, and ingest
   that into the dashboard labeled "LinkedIn (curated)". Zero legal/technical risk, real signal.
2. **Owner-authorized path (production):** if this dashboard is built *for* nsave, have them connect
   their own LinkedIn org account via the Community Management API to export comments on their own
   posts — the only ToS-clean automated route.
3. If light automation is unavoidable for the demo, cap it at a one-time Playwright pass over a handful
   of public post URLs with real-browser fingerprint and generous pacing, and flag it as
   demo-only/non-production — same caveat class as Trustpilot, but with a demonstrated litigation record
   behind it.

## Sources

- [nsave company page](https://www.linkedin.com/company/nsavecom)
- [Amer Baroudi profile](https://www.linkedin.com/in/amer-baroudi/) and posts
  ([Global USD Account](https://www.linkedin.com/posts/amer-baroudi_nsave-a-global-account-for-the-rest-of-activity-7358932393308606465-vmtK),
  [redesign](https://www.linkedin.com/posts/amer-baroudi_nsave-redesigned-activity-7287555736962760704-C5vw),
  [Syria announcement](https://www.linkedin.com/posts/amer-baroudi_nsave-announcement-fintech-activity-7328409756719607809-2anX))
- [Abdallah AbuHashem profile](https://uk.linkedin.com/in/aabuhash) and
  [posts](https://www.linkedin.com/posts/aabuhash_nsave-is-the-best-group-of-people-i-have-activity-7266877240850747392-rAuG)
- [nsave card-launch post (comments verified publicly readable)](https://www.linkedin.com/posts/nsavecom_fintech-customerfirst-tech-activity-7379881113541820416-9rMS)
- [LinkedIn v. Proxycurl coverage — Social Media Today](https://www.socialmediatoday.com/news/linkedin-wins-legal-case-data-scrapers-proxycurl/756101/),
  [Nubela's own account](https://nubela.co/blog/is-scraping-linkedin-legal-in-2026/),
  [StartupHub.ai](https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down)
- [Bloomberg Law on LinkedIn anti-bot enforcement](https://news.bloomberglaw.com/artificial-intelligence/linkedins-war-against-bot-scrapers-ramps-up-as-ai-gets-smarter)
