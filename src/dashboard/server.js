// Small Express server for the nsave feedback dashboard.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { buildAggregates } from './aggregate.js';
import { aiEnabled, generateSummary, answerQuestion } from './ai.js';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));

// Cache the aggregates and AI summary in memory (data is static per run).
let aggCache;
let summaryCache;

app.get('/api/data', async (_req, res) => {
  try {
    aggCache ??= await buildAggregates();
    res.json({ ...aggCache, aiEnabled: aiEnabled() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summary', async (_req, res) => {
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'AI is not configured. Set ANTHROPIC_API_KEY to enable.' });
  }
  try {
    summaryCache ??= await generateSummary();
    res.json({ summary: summaryCache });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ask', async (req, res) => {
  const question = (req.body?.question || '').toString().trim();
  if (!question) return res.status(400).json({ error: 'Missing question.' });
  if (question.length > 500) return res.status(400).json({ error: 'Question too long.' });
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'AI is not configured. Set ANTHROPIC_API_KEY to enable.' });
  }
  try {
    res.json({ answer: await answerQuestion(question) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`nsave feedback dashboard on http://localhost:${PORT}`);
  console.log(`AI features: ${aiEnabled() ? 'enabled' : 'disabled (set ANTHROPIC_API_KEY)'}`);
});
