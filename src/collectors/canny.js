// Canny wishlist board (nsave.canny.io) — public but client-side rendered.
// We drive headless Chromium, intercept the SPA's own /api/posts/get
// responses to harvest structured JSON, and scroll until all posts load.
import { chromium } from 'playwright-core';
import { saveJson } from '../lib/store.js';

const BOARD_URL = 'https://nsave.canny.io/wishlist?sort=newest';
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;

function normalize(p) {
  return {
    source: 'canny',
    id: p._id,
    title: p.title ?? '',
    text: p.details ?? '',
    votes: p.score ?? 0,
    commentCount: p.commentCount ?? 0,
    status: p.status ?? 'open',
    category: p.category?.name ?? null,
    author: p.author?.name ?? '',
    date: p.created ?? '',
    url: p.urlName ? `https://nsave.canny.io/wishlist/p/${p.urlName}` : null,
  };
}

export async function collectCanny() {
  console.log('Canny: rendering wishlist board...');
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
    // The session's intercepting proxy resets Chromium's TLS 1.3 ClientHello;
    // cap the browser->proxy hop at TLS 1.2 (verification stays enabled).
    args: proxyUrl ? ['--ssl-version-max=tls1.2'] : [],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 2000 } })).newPage();

  const posts = new Map();
  let expected = null;

  page.on('response', async (res) => {
    if (!res.url().includes('/api/posts/get')) return;
    try {
      const body = await res.json();
      const items = body?.result?.posts ?? body?.posts ?? [];
      for (const p of items) if (p?._id) posts.set(p._id, normalize(p));
    } catch { /* non-JSON or aborted response */ }
  });

  await page.goto(BOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Board metadata (activePostCount) is in the SSR'd initial state.
  expected = await page.evaluate(() =>
    window.__data?.boards?.items?.wishlist?.activePostCount ?? null);
  console.log(`  board reports ${expected ?? '?'} active posts`);

  // Infinite scroll until the post count stops growing.
  let stagnant = 0;
  for (let i = 0; i < 60 && stagnant < 4; i++) {
    const before = posts.size;
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(1200);
    stagnant = posts.size > before ? 0 : stagnant + 1;
    if (expected && posts.size >= expected) break;
  }
  await browser.close();

  const all = [...posts.values()].sort((a, b) => b.votes - a.votes);
  const byStatus = {};
  for (const p of all) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  const summary = { total: all.length, expected, byStatus, totalVotes: all.reduce((s, p) => s + p.votes, 0) };
  const file = await saveJson('canny.json', { collectedAt: new Date().toISOString(), summary, posts: all });
  console.log(`Canny: ${summary.total} posts (${summary.totalVotes} votes) -> ${file}`);
  return { summary, posts: all };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectCanny().catch((e) => { console.error(e); process.exit(1); });
}
