// Unified review/feedback index for the "Reviews explorer" drawer.
// Flattens every surface (app stores, Trustpilot, Product Hunt, Canny posts,
// LinkedIn comments) into one queryable shape, and filters/searches/paginates.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
const countryName = (c) => COUNTRY_NAMES[c] || (c ? c.toUpperCase() : '');

// Cheap script detection so the language filter is useful across surfaces
// that don't carry a lang field (App Store, Trustpilot).
function detectLang(text) {
  if (!text) return 'en';
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/[ঀ-৿]/.test(text)) return 'bn';
  return 'en';
}

const SURFACE_LABELS = {
  appstore: 'App Store', googleplay: 'Google Play', trustpilot: 'Trustpilot',
  producthunt: 'Product Hunt', canny: 'Canny', linkedin: 'LinkedIn',
};

let indexCache;

// Build the flat, normalized item list once.
export async function buildReviewIndex() {
  if (indexCache) return indexCache;
  const [appstore, googleplay, trustpilot, producthunt, canny, linkedin] =
    await Promise.all([
      load('appstore.json'), load('googleplay.json'), load('trustpilot.json'),
      load('producthunt.json'), load('canny.json'), load('linkedin-curated.json'),
    ]);

  const items = [];
  const pushReview = (r) => {
    const text = (r.text || '').trim();
    items.push({
      source: r.source,
      rating: r.rating >= 1 && r.rating <= 5 ? Math.round(r.rating) : null,
      country: r.country || '',
      countryName: countryName(r.country),
      // Detect from the actual text (more truthful than a stored query locale).
      lang: detectLang((r.title || '') + ' ' + text),
      title: (r.title || '').trim(),
      text,
      author: r.author || '',
      date: r.date || '',
      replied: Boolean(r.replyText),
    });
  };

  for (const r of appstore?.reviews ?? []) pushReview(r);
  for (const r of googleplay?.reviews ?? []) pushReview(r);
  for (const r of trustpilot?.reviews ?? []) pushReview(r);
  for (const r of producthunt?.reviews ?? []) pushReview(r);

  for (const p of canny?.posts ?? []) {
    items.push({
      source: 'canny', rating: null, country: '', countryName: '',
      lang: detectLang(p.title + ' ' + (p.text || '')),
      title: p.title || '', text: (p.text || '').trim(), author: p.author || '',
      date: p.date || '', replied: false, votes: p.votes ?? 0, status: p.status || 'open',
    });
  }

  for (const post of linkedin?.posts ?? []) {
    for (const c of post.comments ?? []) {
      if (!c.text || c.text.length < 4) continue;
      items.push({
        source: 'linkedin', rating: null, country: '', countryName: '',
        lang: detectLang(c.text), title: '', text: c.text.trim(),
        author: c.author || '', date: post.url ? '' : '', replied: false,
        topic: post.topic || '', signal: c.signal || null,
      });
    }
  }

  // Assign a stable id and a numeric sort key for dates (unknown dates sort last).
  items.forEach((it, i) => {
    it.id = `${it.source}-${i}`;
    it._t = it.date ? Date.parse(it.date) || 0 : 0;
  });

  indexCache = items;
  return items;
}

// Facets for the filter controls (computed once over the whole index).
export async function reviewFacets() {
  const items = await buildReviewIndex();
  const bySource = {};
  const byCountry = {};
  const byLang = {};
  for (const it of items) {
    bySource[it.source] = (bySource[it.source] || 0) + 1;
    if (it.country) byCountry[it.country] = (byCountry[it.country] || 0) + 1;
    byLang[it.lang] = (byLang[it.lang] || 0) + 1;
  }
  return {
    total: items.length,
    sources: Object.entries(bySource)
      .map(([id, count]) => ({ id, label: SURFACE_LABELS[id] || id, count }))
      .sort((a, b) => b.count - a.count),
    countries: Object.entries(byCountry)
      .map(([code, count]) => ({ code, name: countryName(code), count }))
      .sort((a, b) => b.count - a.count),
    languages: Object.entries(byLang)
      .map(([id, count]) => ({ id, label: { en: 'English/Latin', ar: 'Arabic', bn: 'Bengali' }[id] || id, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// Filter + search + sort + paginate.
export async function queryReviews(params = {}) {
  const items = await buildReviewIndex();
  const {
    source, rating, country, lang, q,
    sort = 'newest', limit = 30, offset = 0,
  } = params;

  const sources = source ? String(source).split(',').filter(Boolean) : null;
  const ratings = rating != null && rating !== ''
    ? new Set(String(rating).split(',').map(Number).filter((n) => n >= 1 && n <= 5))
    : null;
  const needle = q ? String(q).toLowerCase().trim() : '';

  let filtered = items.filter((it) => {
    if (sources && !sources.includes(it.source)) return false;
    if (ratings && (it.rating == null || !ratings.has(it.rating))) return false;
    if (country && it.country !== country) return false;
    if (lang && it.lang !== lang) return false;
    if (needle && !(it.title + ' ' + it.text).toLowerCase().includes(needle)) return false;
    return true;
  });

  const cmp = {
    newest: (a, b) => b._t - a._t,
    oldest: (a, b) => a._t - b._t,
    'rating-low': (a, b) => (a.rating ?? 9) - (b.rating ?? 9) || b._t - a._t,
    'rating-high': (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b._t - a._t,
    votes: (a, b) => (b.votes ?? -1) - (a.votes ?? -1),
  }[sort] || (() => 0);
  filtered.sort(cmp);

  const total = filtered.length;
  const off = Math.max(0, Number(offset) || 0);
  const lim = Math.min(100, Math.max(1, Number(limit) || 30));
  const page = filtered.slice(off, off + lim).map((it) => {
    const { _t, ...rest } = it;
    return rest;
  });

  return { total, offset: off, limit: lim, hasMore: off + lim < total, items: page };
}
