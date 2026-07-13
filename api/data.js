// Vercel serverless function: GET /api/data
import { buildAggregates } from '../src/dashboard/aggregate.js';
import { aiEnabled } from '../src/dashboard/ai.js';

let cache;

export default async function handler(_req, res) {
  try {
    cache ??= await buildAggregates();
    res.status(200).json({ ...cache, aiEnabled: aiEnabled() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
