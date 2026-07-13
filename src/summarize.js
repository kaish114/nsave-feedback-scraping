// Build data/summary.json from whatever collector outputs exist on disk,
// so the summary can be refreshed without re-scraping every surface.
import { readFile } from 'node:fs/promises';
import { saveJson } from './lib/store.js';

const DATA = new URL('../data/', import.meta.url);

async function load(name) {
  try {
    return JSON.parse(await readFile(new URL(name, DATA), 'utf8'));
  } catch {
    return null;
  }
}

const [appstore, googleplay, canny, producthunt, trustpilot, linkedin] =
  await Promise.all([
    load('appstore.json'), load('googleplay.json'), load('canny.json'),
    load('producthunt.json'), load('trustpilot.json'), load('linkedin-curated.json'),
  ]);

const summary = { generatedAt: new Date().toISOString(), surfaces: {} };
let total = 0;

if (appstore) { summary.surfaces.appstore = { collectedAt: appstore.collectedAt, ...appstore.summary }; total += appstore.summary.total; }
if (googleplay) { summary.surfaces.googleplay = { collectedAt: googleplay.collectedAt, app: googleplay.app, ...googleplay.summary }; total += googleplay.summary.total; }
if (canny) { summary.surfaces.canny = { collectedAt: canny.collectedAt, ...canny.summary }; total += canny.summary.total; }
if (producthunt) { summary.surfaces.producthunt = { collectedAt: producthunt.collectedAt, ...producthunt.summary }; total += producthunt.summary.total; }
if (trustpilot) { summary.surfaces.trustpilot = { collectedAt: trustpilot.collectedAt, ...trustpilot.summary }; total += trustpilot.summary.total; }
if (linkedin) {
  const comments = linkedin.posts.reduce((s, p) => s + p.comments.length, 0);
  summary.surfaces.linkedin = { method: 'curated', curatedAt: linkedin.curatedAt, posts: linkedin.posts.length, comments };
  total += comments;
}

summary.totalItems = total;
const file = await saveJson('summary.json', summary);
console.log(`Summary: ${total} items across ${Object.keys(summary.surfaces).length} surfaces -> ${file}`);
