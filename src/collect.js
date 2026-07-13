// Run all collectors and write a combined summary.
import { collectAppStore } from './collectors/appstore.js';
import { collectGooglePlay } from './collectors/googleplay.js';
import { collectCanny } from './collectors/canny.js';
import { collectProductHunt } from './collectors/producthunt.js';
import { saveJson } from './lib/store.js';

const appstore = await collectAppStore();
const googleplay = await collectGooglePlay();
const canny = await collectCanny();
const producthunt = await collectProductHunt();

const combined = {
  collectedAt: new Date().toISOString(),
  totalItems:
    appstore.summary.total + googleplay.summary.total +
    canny.summary.total + producthunt.summary.total,
  appstore: appstore.summary,
  googleplay: { app: googleplay.app, ...googleplay.summary },
  canny: canny.summary,
  producthunt: producthunt.summary,
};
const file = await saveJson('summary.json', combined);
console.log(`\nCombined: ${combined.totalItems} items -> ${file}`);
