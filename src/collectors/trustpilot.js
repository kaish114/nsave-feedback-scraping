// Trustpilot reviews (trustpilot.com/review/www.nsave.com) — DEMO ONLY.
// Trustpilot is bot-protected (plain HTTP gets blocked; the browser gets a
// 403 status but still receives the full SSR page). Reviews ship in the
// page's __NEXT_DATA__ JSON, so we paginate politely and read that.
// Production use requires the paid Trustpilot Business API.
import { launchBrowser } from '../lib/browser.js';
import { saveJson, summarize } from '../lib/store.js';

const BASE = 'https://www.trustpilot.com/review/www.nsave.com';
const MAX_PAGES = 10;
const DELAY_MS = 2500;

function normalize(r) {
  return {
    source: 'trustpilot',
    id: r.id,
    country: r.consumer?.countryCode?.toLowerCase() ?? '',
    rating: r.rating,
    title: r.title ?? '',
    text: r.text ?? '',
    author: r.consumer?.displayName ?? '',
    date: r.dates?.publishedDate ?? '',
    verified: r.labels?.verification?.isVerified ?? false,
    replyText: r.reply?.message ?? null,
  };
}

export async function collectTrustpilot() {
  console.log('Trustpilot: collecting (demo-only, bot-protected surface)...');
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();

  const all = [];
  const seen = new Set();
  let meta = null;

  for (let n = 1; n <= MAX_PAGES; n++) {
    const url = n === 1 ? BASE : `${BASE}?page=${n}`;
    try {
      await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#__NEXT_DATA__', { state: 'attached', timeout: 20000 });
    } catch (err) {
      console.log(`  page ${n}: failed (${err.message.split('\n')[0]})`);
      break;
    }
    const pp = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el) return null;
      const j = JSON.parse(el.textContent);
      const p = j?.props?.pageProps;
      return p ? {
        reviews: p.reviews ?? [],
        total: p.filters?.totalNumberOfReviews ?? p.businessUnit?.numberOfReviews ?? null,
        trustScore: p.businessUnit?.trustScore ?? null,
      } : null;
    });
    if (!pp || pp.reviews.length === 0) {
      console.log(`  page ${n}: no reviews in payload, stopping`);
      break;
    }
    meta ??= { totalReported: pp.total, trustScore: pp.trustScore };
    let added = 0;
    for (const r of pp.reviews.map(normalize)) {
      if (r.id && seen.has(r.id)) continue;
      if (r.id) seen.add(r.id);
      all.push(r);
      added++;
    }
    console.log(`  page ${n}: ${pp.reviews.length} reviews, ${added} new`);
    if (added === 0 || (meta.totalReported && all.length >= meta.totalReported)) break;
    await page.waitForTimeout(DELAY_MS);
  }
  await browser.close();

  const summary = { ...summarize(all), site: meta };
  const file = await saveJson('trustpilot.json', { collectedAt: new Date().toISOString(), summary, reviews: all });
  console.log(`Trustpilot: ${summary.total} reviews (site reports ${meta?.totalReported} at TrustScore ${meta?.trustScore}) -> ${file}`);
  return { summary, reviews: all };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectTrustpilot().catch((e) => { console.error(e); process.exit(1); });
}
