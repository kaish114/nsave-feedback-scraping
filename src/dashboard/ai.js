// Claude integration for the dashboard: an executive summary of the feedback
// and a grounded Q&A endpoint. Uses the official Anthropic SDK.
import Anthropic from '@anthropic-ai/sdk';
import { buildCorpus, buildAggregates } from './aggregate.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client;
function getClient() {
  // The SDK resolves ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN from the env.
  client ??= new Anthropic();
  return client;
}

const SYSTEM = `You are a product-and-operations analyst for nsave, a fintech offering USD/EUR/GBP accounts to people in high-inflation economies (Egypt, Pakistan, Bangladesh, Nigeria, and others).

You are given real user feedback scraped from public surfaces (Apple App Store, Google Play, Trustpilot, Product Hunt, a Canny wishlist board, and curated public LinkedIn comments). Ground every claim in that feedback. Do not invent statistics that aren't supported by the data provided. Be concrete and specific — quote short representative phrases where useful. Write for a busy product lead: lead with the takeaway, keep it tight.

When you cite where a theme appears, use a short inline square-bracket tag so it can be linked to the underlying reviews. Format: [surface], [surface/country], or [surface/country N★] — e.g. [trustpilot/eg 1★], [appstore/pk], [googleplay/eg], [canny], [linkedin]. Surface names must be one of: appstore, googleplay, trustpilot, producthunt, canny, linkedin. Use the two-letter country code from the data. Place a tag right after the point it supports; don't wrap tags in parentheses.`;

async function contextBlock() {
  const [agg, corpus] = await Promise.all([buildAggregates(), buildCorpus()]);
  const k = agg.kpis;
  const stats = [
    `Aggregate stats:`,
    `- ${k.totalReviews} written reviews across the app stores, Trustpilot and Product Hunt; ${k.totalItems} total feedback items including Canny posts and LinkedIn comments.`,
    `- Average written-review rating: ${k.avgRating}/5. ${k.negativePct}% of written reviews are 1–2★.`,
    `- Google Play listing: ${k.googlePlayScore}/5 from ${k.googlePlayRatings} ratings, ${k.googlePlayInstalls} installs.`,
    `- Trustpilot TrustScore: ${agg.trustScore}. Product Hunt: ${agg.productHuntScore}/5.`,
    `- Rating distribution (1★→5★): ${agg.ratingDistribution.map((r) => r.count).join(', ')}.`,
    `- Top countries by review volume: ${agg.topCountries.slice(0, 6).map((c) => `${c.name} (${c.count})`).join(', ')}.`,
  ].join('\n');
  return `${stats}\n\n### Feedback corpus\n${corpus}`;
}

export async function generateSummary() {
  const context = await contextBlock();
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `${context}\n\n---\nWrite a concise executive summary of nsave's public feedback. Use exactly these sections as markdown H3 headings:\n### Headline\nOne or two sentences: the overall state of sentiment.\n### Top complaints\n3–5 bullets, each naming the theme, roughly how prominent it is, and which surfaces it shows up on.\n### What users praise\n2–4 bullets.\n### Most-wanted features\n2–4 bullets drawn from the Canny wishlist and comments.\n### Recommended focus\n2–3 bullets: what the team should fix or ship first, and why.`,
    }],
  });
  return textOf(res);
}

export async function answerQuestion(question) {
  const context = await contextBlock();
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `${context}\n\n---\nAnswer this question using only the feedback above. If the data doesn't support an answer, say so plainly. Name the surfaces backing your points and quote short phrases where helpful.\n\nQuestion: ${question}`,
    }],
  });
  return textOf(res);
}

function textOf(res) {
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}
