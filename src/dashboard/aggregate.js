// Reads the collected data/*.json files and produces the aggregates the
// dashboard renders, plus a compact corpus used to ground the AI features.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve data/ robustly: the path relative to this module works locally and in
// most bundlers; process.cwd()/data is the fallback for Vercel's function bundle
// (where data/** is shipped via includeFiles at the task root).
const DATA_DIRS = [
  fileURLToPath(new URL('../../data/', import.meta.url)),
  path.join(process.cwd(), 'data'),
];

async function load(name) {
  for (const dir of DATA_DIRS) {
    try {
      return JSON.parse(await readFile(path.join(dir, name), 'utf8'));
    } catch { /* try next candidate */ }
  }
  return null;
}

const COUNTRY_NAMES = {
  us: 'United States', gb: 'United Kingdom', pk: 'Pakistan', eg: 'Egypt',
  bd: 'Bangladesh', ng: 'Nigeria', ae: 'UAE', sa: 'Saudi Arabia', tr: 'Turkey',
  dz: 'Algeria', ma: 'Morocco', jo: 'Jordan', kw: 'Kuwait', qa: 'Qatar',
  bh: 'Bahrain', om: 'Oman', ar: 'Argentina', lb: 'Lebanon', it: 'Italy',
  fr: 'France', nl: 'Netherlands', de: 'Germany', ca: 'Canada', br: 'Brazil',
  uy: 'Uruguay', tn: 'Tunisia', ie: 'Ireland',
};
const countryName = (c) => COUNTRY_NAMES[c] || (c ? c.toUpperCase() : 'Unknown');

export async function buildAggregates() {
  const [appstore, googleplay, trustpilot, producthunt, canny, linkedin] =
    await Promise.all([
      load('appstore.json'), load('googleplay.json'), load('trustpilot.json'),
      load('producthunt.json'), load('canny.json'), load('linkedin-curated.json'),
    ]);

  // Unified review pool (everything that has a star rating).
  const reviews = [
    ...(appstore?.reviews ?? []),
    ...(googleplay?.reviews ?? []),
    ...(trustpilot?.reviews ?? []),
    ...(producthunt?.reviews ?? []),
  ];

  const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const bySurface = {};
  const byCountry = {};
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) byRating[Math.round(r.rating)]++;
    bySurface[r.source] = (bySurface[r.source] || 0) + 1;
    if (r.country) byCountry[r.country] = (byCountry[r.country] || 0) + 1;
  }

  const rated = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  const avgRating = rated.length
    ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
  const negative = byRating[1] + byRating[2];
  const positive = byRating[4] + byRating[5];
  const neutral = byRating[3];

  const surfaceLabels = {
    appstore: 'App Store', googleplay: 'Google Play',
    trustpilot: 'Trustpilot', producthunt: 'Product Hunt',
  };

  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([code, count]) => ({ code, name: countryName(code), count }));

  const cannyTop = (canny?.posts ?? []).slice(0, 8).map((p) => ({
    title: p.title, votes: p.votes, status: p.status,
  }));

  const linkedinComments = (linkedin?.posts ?? [])
    .reduce((s, p) => s + p.comments.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalReviews: reviews.length,
      totalItems: reviews.length + (canny?.summary?.total ?? 0) + linkedinComments,
      avgRating: Number(avgRating.toFixed(2)),
      negativePct: rated.length ? Math.round((negative / rated.length) * 100) : 0,
      surfaces: Object.keys(bySurface).length + (canny ? 1 : 0) + (linkedin ? 1 : 0),
      googlePlayRatings: googleplay?.app?.ratings ?? null,
      googlePlayInstalls: googleplay?.app?.installs ?? null,
      googlePlayScore: googleplay?.app?.score ?? null,
    },
    ratingDistribution: [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: byRating[n] })),
    sentiment: { positive, neutral, negative },
    bySurface: Object.entries(bySurface)
      .map(([source, count]) => ({ source, label: surfaceLabels[source] || source, count }))
      .sort((a, b) => b.count - a.count),
    topCountries,
    cannyTop,
    cannySummary: canny?.summary ?? null,
    linkedin: { posts: linkedin?.posts?.length ?? 0, comments: linkedinComments },
    trustScore: trustpilot?.summary?.site?.trustScore ?? null,
    productHuntScore: producthunt?.summary?.siteReported?.avg ?? null,
  };
}

// A compact, representative corpus used as grounding context for the AI.
// We sample the most useful signal: negative reviews (the actionable ones),
// a slice of positives, top Canny asks, and LinkedIn product-signal comments.
export async function buildCorpus({ perBucket = 40 } = {}) {
  const [appstore, googleplay, trustpilot, producthunt, canny, linkedin] =
    await Promise.all([
      load('appstore.json'), load('googleplay.json'), load('trustpilot.json'),
      load('producthunt.json'), load('canny.json'), load('linkedin-curated.json'),
    ]);

  const reviews = [
    ...(appstore?.reviews ?? []),
    ...(googleplay?.reviews ?? []),
    ...(trustpilot?.reviews ?? []),
    ...(producthunt?.reviews ?? []),
  ].filter((r) => (r.text || '').trim().length > 0);

  const clip = (t) => (t || '').replace(/\s+/g, ' ').trim().slice(0, 320);
  const fmt = (r) => `[${r.source}${r.country ? '/' + r.country : ''} ${r.rating}★] ${clip(r.title ? r.title + ' — ' : '')}${clip(r.text)}`;

  const neg = reviews.filter((r) => r.rating <= 2);
  const pos = reviews.filter((r) => r.rating >= 4);
  const mid = reviews.filter((r) => r.rating === 3);
  const sample = (arr, n) => {
    if (arr.length <= n) return arr;
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
  };

  const lines = [
    '### Negative reviews (1–2★)',
    ...sample(neg, perBucket * 2).map(fmt),
    '',
    '### Positive reviews (4–5★)',
    ...sample(pos, perBucket).map(fmt),
    '',
    '### Neutral reviews (3★)',
    ...sample(mid, Math.floor(perBucket / 2)).map(fmt),
    '',
    '### Canny wishlist — top feature requests (by votes)',
    ...(canny?.posts ?? []).slice(0, 25).map(
      (p) => `[canny ${p.votes} votes, ${p.status}] ${p.title}${p.text ? ' — ' + clip(p.text) : ''}`),
    '',
    '### LinkedIn — public comments on nsave/founder posts',
    ...(linkedin?.posts ?? []).flatMap((post) =>
      post.comments
        .filter((c) => c.text && c.text.length > 8)
        .map((c) => `[linkedin, on "${post.topic}"] ${c.author}: ${clip(c.text)}${c.signal ? ' (signal: ' + c.signal + ')' : ''}`)),
  ];

  return lines.join('\n');
}
