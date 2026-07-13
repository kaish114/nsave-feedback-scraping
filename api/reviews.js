// Vercel serverless function: GET /api/reviews
// Filter/search/paginate over the committed feedback dataset.
import { queryReviews, reviewFacets } from '../src/dashboard/reviews.js';

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const [result, facets] = await Promise.all([
      queryReviews(q),
      Number(q.offset || 0) === 0 ? reviewFacets() : Promise.resolve(null),
    ]);
    res.status(200).json(facets ? { ...result, facets } : result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
