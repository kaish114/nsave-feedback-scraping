// Product Hunt reviews (producthunt.com/products/nsave/reviews).
// Cloudflare-fronted, so we render with headless Chromium. Review cards
// have no stable ids; we locate each 5-star readonly rating widget and
// climb to its card container.
import { launchBrowser } from '../lib/browser.js';
import { saveJson } from '../lib/store.js';

const REVIEWS_URL = 'https://www.producthunt.com/products/nsave/reviews';

export async function collectProductHunt() {
  console.log('Product Hunt: rendering reviews page...');
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();
  await page.goto(REVIEWS_URL, { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(800);
  }

  const result = await page.evaluate(() => {
    const header = document.body.innerText.match(/([\d.]+)\s*\n?•?\s*(\d+)\s+reviews/);
    // Each review card contains one readonly star widget: star-1..star-5.
    const firstStars = [...document.querySelectorAll('[data-test="star-1-readonly"]')]
      // Skip the header rating widget and the rating-filter sidebar widgets.
      .filter((el) => !el.closest('[data-test^="rating-filter"]'));
    const seen = new Set();
    const reviews = [];
    for (const s1 of firstStars) {
      // The widget is the parent that holds all five stars.
      let widget = s1.parentElement;
      while (widget && widget.querySelectorAll('[data-test$="-readonly"]').length < 5) {
        widget = widget.parentElement;
      }
      if (!widget) continue;
      const rating = widget.querySelectorAll('[data-test$="-filled"]:not([data-test*="not-filled"])').length;
      // A real review card is the nearest ancestor containing the
      // "Helpful" action; page-chrome star widgets never have one.
      let card = widget;
      while (card.parentElement && !/\bHelpful\b/.test(card.innerText)) {
        card = card.parentElement;
      }
      if (card === document.body || !/\bHelpful\b/.test(card.innerText)) continue;
      const text = card.innerText.replace(/\s+\n/g, '\n').trim();
      if (text.length > 2000 || seen.has(text)) continue;
      seen.add(text);
      reviews.push({ rating, rawText: text });
    }
    return { header: header ? { avg: Number(header[1]), count: Number(header[2]) } : null, reviews };
  });

  await browser.close();

  const reviews = result.reviews.map((r, i) => {
    const lines = r.rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    // Author is the line immediately before the @handle line.
    const handleIdx = lines.findIndex((l) => /^@[\w.]+/.test(l));
    const author = handleIdx > 0 ? lines[handleIdx - 1] : '';
    const body = lines
      .filter((l, idx) => idx !== handleIdx && idx !== handleIdx - 1)
      .filter((l) => !/^(Helpful|Share|Report|·|•|@|\d+ views?|\d+ review|Follow)/.test(l))
      .join(' ');
    return {
      source: 'producthunt',
      id: `ph-${i}`,
      rating: r.rating,
      author,
      text: body,
      rawText: r.rawText,
    };
  });

  const summary = {
    total: reviews.length,
    siteReported: result.header,
    avgRating: reviews.length
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
      : 0,
  };
  const file = await saveJson('producthunt.json', { collectedAt: new Date().toISOString(), summary, reviews });
  console.log(`Product Hunt: ${summary.total} reviews (site reports ${result.header?.count ?? '?'} at ${result.header?.avg ?? '?'}) -> ${file}`);
  return { summary, reviews };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectProductHunt().catch((e) => { console.error(e); process.exit(1); });
}
