// Vercel serverless function: POST /api/ask
import { aiEnabled, answerQuestion } from '../src/dashboard/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const question = (req.body?.question || '').toString().trim();
  if (!question) return res.status(400).json({ error: 'Missing question.' });
  if (question.length > 500) return res.status(400).json({ error: 'Question too long.' });
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'AI is not configured. Set ANTHROPIC_API_KEY to enable.' });
  }
  try {
    res.status(200).json({ answer: await answerQuestion(question) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
