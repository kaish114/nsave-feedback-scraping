// Vercel serverless function: GET /api/summary
import { aiEnabled, generateSummary } from '../src/dashboard/ai.js';

let cache;

export default async function handler(_req, res) {
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'AI is not configured. Set ANTHROPIC_API_KEY to enable.' });
  }
  try {
    cache ??= await generateSummary();
    res.status(200).json({ summary: cache });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
