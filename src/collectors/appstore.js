// Apple App Store reviews via the free public iTunes RSS customer-reviews feed.
// Reviews are per-storefront; we loop over nsave's supported countries.
// The feed caps at ~500 most recent reviews per storefront (10 pages x 50).
import { fetchJson, sleep } from '../lib/http.js';
import { saveJson, summarize } from '../lib/store.js';

const APP_ID = '6471736519'; // nsave: Global USD Accounts
const STOREFRONTS = [
  'us', 'gb', 'ae', 'ar', 'bd', 'bh', 'dz', 'eg',
  'jo', 'kw', 'ma', 'ng', 'om', 'pk', 'qa', 'sa', 'tr',
];
const MAX_PAGES = 10;
const DELAY_MS = 400;

function normalize(entry, country) {
  return {
    source: 'appstore',
    id: entry.id?.label,
    country,
    rating: Number(entry['im:rating']?.label),
    title: entry.title?.label ?? '',
    text: entry.content?.label ?? '',
    author: entry.author?.name?.label ?? '',
    date: entry.updated?.label ?? '',
    appVersion: entry['im:version']?.label ?? '',
    thumbsUp: Number(entry['im:voteSum']?.label ?? 0),
  };
}

async function collectStorefront(country) {
  const reviews = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${APP_ID}/sortby=mostrecent/json`;
    let feed;
    try {
      feed = (await fetchJson(url)).feed;
    } catch (err) {
      // Storefronts with zero reviews 404 or return an empty feed; stop paging.
      if (page === 1) console.log(`  ${country}: no feed (${err.message})`);
      break;
    }
    let entries = feed?.entry ?? [];
    if (!Array.isArray(entries)) entries = [entries];
    const pageReviews = entries.filter((e) => e['im:rating']).map((e) => normalize(e, country));
    if (pageReviews.length === 0) break;
    reviews.push(...pageReviews);
    await sleep(DELAY_MS);
  }
  console.log(`  ${country}: ${reviews.length} reviews`);
  return reviews;
}

export async function collectAppStore() {
  console.log('App Store: collecting reviews per storefront...');
  const all = [];
  const seen = new Set();
  for (const country of STOREFRONTS) {
    for (const r of await collectStorefront(country)) {
      if (r.id && seen.has(r.id)) continue;
      if (r.id) seen.add(r.id);
      all.push(r);
    }
    await sleep(DELAY_MS);
  }
  const summary = summarize(all);
  const file = await saveJson('appstore.json', { collectedAt: new Date().toISOString(), summary, reviews: all });
  console.log(`App Store: ${summary.total} unique reviews, avg ${summary.avgRating} -> ${file}`);
  return { summary, reviews: all };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectAppStore().catch((e) => { console.error(e); process.exit(1); });
}
