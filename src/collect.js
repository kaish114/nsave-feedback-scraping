// Run all Stage 1 collectors and write a combined summary.
import { collectAppStore } from './collectors/appstore.js';
import { collectGooglePlay } from './collectors/googleplay.js';
import { saveJson } from './lib/store.js';

const appstore = await collectAppStore();
const googleplay = await collectGooglePlay();

const combined = {
  collectedAt: new Date().toISOString(),
  totalReviews: appstore.summary.total + googleplay.summary.total,
  appstore: appstore.summary,
  googleplay: { app: googleplay.app, ...googleplay.summary },
};
const file = await saveJson('summary.json', combined);
console.log(`\nCombined: ${combined.totalReviews} reviews -> ${file}`);
