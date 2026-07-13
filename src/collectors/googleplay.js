// Google Play reviews via the unofficial google-play-scraper package.
// Play serves reviews per language; we loop over the languages of nsave's
// target markets and dedupe by review id.
import gplay from 'google-play-scraper';
import { gotAgent, sleep } from '../lib/http.js';
import { saveJson, summarize } from '../lib/store.js';

const APP_ID = 'com.nsave.app';
// [lang, country] pairs covering nsave's markets.
const LOCALES = [
  ['en', 'us'], ['en', 'gb'], ['en', 'pk'], ['en', 'ng'],
  ['ar', 'eg'], ['ar', 'sa'], ['bn', 'bd'], ['tr', 'tr'],
  ['fr', 'ma'], ['ur', 'pk'],
];
const PER_LOCALE = 200;
const DELAY_MS = 800;

function normalize(r, lang, country) {
  return {
    source: 'googleplay',
    id: r.id,
    country,
    lang,
    rating: r.score,
    title: r.title ?? '',
    text: r.text ?? '',
    author: r.userName ?? '',
    date: r.date ?? '',
    appVersion: r.version ?? '',
    thumbsUp: r.thumbsUp ?? 0,
    replyText: r.replyText ?? null,
  };
}

export async function collectGooglePlay() {
  console.log('Google Play: collecting app metadata...');
  const app = await gplay.app({ appId: APP_ID, requestOptions: gotAgent });
  const meta = {
    title: app.title,
    score: app.score,
    ratings: app.ratings,
    reviews: app.reviews,
    installs: app.installs,
    histogram: app.histogram,
    updated: app.updated,
    version: app.version,
  };
  console.log(`  ${meta.title}: score ${meta.score}, ${meta.ratings} ratings, ${meta.installs} installs`);

  const all = [];
  const seen = new Set();
  for (const [lang, country] of LOCALES) {
    try {
      const res = await gplay.reviews({
        appId: APP_ID,
        sort: gplay.sort.NEWEST,
        num: PER_LOCALE,
        lang,
        country,
        requestOptions: gotAgent,
      });
      let added = 0;
      for (const r of res.data.map((x) => normalize(x, lang, country))) {
        if (r.id && seen.has(r.id)) continue;
        if (r.id) seen.add(r.id);
        all.push(r);
        added++;
      }
      console.log(`  ${lang}-${country}: ${res.data.length} fetched, ${added} new`);
    } catch (err) {
      console.log(`  ${lang}-${country}: failed (${err.message})`);
    }
    await sleep(DELAY_MS);
  }

  const summary = summarize(all);
  const file = await saveJson('googleplay.json', { collectedAt: new Date().toISOString(), app: meta, summary, reviews: all });
  console.log(`Google Play: ${summary.total} unique reviews, avg ${summary.avgRating} -> ${file}`);
  return { app: meta, summary, reviews: all };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectGooglePlay().catch((e) => { console.error(e); process.exit(1); });
}
