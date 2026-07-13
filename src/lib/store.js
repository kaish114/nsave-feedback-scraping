import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = new URL('../../data/', import.meta.url).pathname;

export async function saveJson(name, payload) {
  await mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, name);
  await writeFile(file, JSON.stringify(payload, null, 2));
  return file;
}

export function summarize(reviews) {
  const byRating = {};
  const byCountry = {};
  for (const r of reviews) {
    byRating[r.rating] = (byRating[r.rating] || 0) + 1;
    byCountry[r.country] = (byCountry[r.country] || 0) + 1;
  }
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  return { total: reviews.length, avgRating: Number(avg.toFixed(2)), byRating, byCountry };
}
