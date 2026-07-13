// Run all automated collectors, then rebuild the combined summary.
// LinkedIn is intentionally NOT collected automatically — it is a
// hand-curated fixture (data/linkedin-curated.json); see docs/linkedin-research.md.
import { collectAppStore } from './collectors/appstore.js';
import { collectGooglePlay } from './collectors/googleplay.js';
import { collectCanny } from './collectors/canny.js';
import { collectProductHunt } from './collectors/producthunt.js';
import { collectTrustpilot } from './collectors/trustpilot.js';

await collectAppStore();
await collectGooglePlay();
await collectCanny();
await collectProductHunt();
await collectTrustpilot();

await import('./summarize.js');
