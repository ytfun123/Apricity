// Vercel serverless function — lives at api/proxy.js in your project root.
// Vercel auto-detects anything in /api as a function, no config needed.
//
// SETUP:
// 1. Vercel dashboard → your project → Settings → Environment Variables → add:
//      YOUTUBE_API_KEY = AIzaSy...
//      TMDB_API_KEY    = ee533eb...
//      GROQ_API_KEY    = gsk_...
//    (Add to Production, Preview, and Development so it works everywhere.)
// 2. Redeploy (env var changes need a redeploy to take effect).
// 3. Your function is live at:  https://your-project.vercel.app/api/proxy
//    Same-origin if index.html is served from the same Vercel project — so
//    the frontend can just call "/api/proxy" with no URL/key to configure.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const service = String(req.query.service || '').toLowerCase();

  try {
    if (service === 'youtube') return res.status(200).json(await handleYoutube(req.query));
    if (service === 'tmdb')    return res.status(200).json(await handleTmdb(req.query));
    if (service === 'groq')    return res.status(200).json(await handleGroq(req.body));
    return res.status(400).json({ error: 'Unknown or missing service: ' + service });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

async function handleYoutube(query) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { error: 'YOUTUBE_API_KEY not set in Vercel env vars' };

  const endpoint = query.endpoint || 'search';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (k === 'service' || k === 'endpoint') continue;
    qs.set(k, v);
  }
  qs.set('key', key);

  const r = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`);
  return r.json();
}

async function handleTmdb(query) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { error: 'TMDB_API_KEY not set in Vercel env vars' };

  const path = query.path || '/movie/popular';
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`https://api.themoviedb.org/3${path}${sep}api_key=${key}`);
  return r.json();
}

async function handleGroq(body) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { error: 'GROQ_API_KEY not set in Vercel env vars' };

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  return r.json();
}
