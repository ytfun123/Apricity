// Vercel serverless function — lives at api/proxy.js in your project root.
// Vercel auto-detects anything in /api as a function, no config needed.
//
// SETUP:
// 1. Vercel dashboard → your project → Settings → Environment Variables → add:
//      YOUTUBE_API_KEY = AIzaSy...
//      TMDB_API_KEY    = ee533eb...
//      GROQ_API_KEY    = gsk_...
//      SUPABASE_URL    = https://xxxx.supabase.co
//      SUPABASE_KEY    = sb_publishable_...  (or a service_role key if you need one later)
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
    if (service === 'youtube')  return res.status(200).json(await handleYoutube(req.query));
    if (service === 'tmdb')     return res.status(200).json(await handleTmdb(req.query));
    if (service === 'groq')     return res.status(200).json(await handleGroq(req.body));
    if (service === 'supabase') {
      const { status, data } = await handleSupabase(req);
      return res.status(status).json(data);
    }
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

// Paths that MUST have a freshly-verified captcha token before we forward
// them to Supabase. This is the real gate — a bot skipping the browser
// entirely and POSTing straight to this proxy has no client-side JS to
// bypass, so the check has to live here, not just in index.html.
const CAPTCHA_PROTECTED_PATHS = [
  '/rest/v1/rpc/register_user',
  '/rest/v1/rpc/login_user',
];

async function verifyHcaptcha(token, remoteip) {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, error: 'HCAPTCHA_SECRET_KEY not set in Vercel env vars' };
  if (!token || typeof token !== 'string') return { ok: false, error: 'Missing captcha token' };

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (remoteip) params.append('remoteip', remoteip);

  try {
    const r = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await r.json();
    return data.success ? { ok: true } : { ok: false, error: 'Captcha verification failed', codes: data['error-codes'] || [] };
  } catch (err) {
    return { ok: false, error: 'Captcha verification request failed' };
  }
}

// Same blocklist as index.html — kept in sync manually since these run in
// separate environments (browser vs serverless function). This is the real
// enforcement point: a bot hitting this proxy directly, skipping the
// browser entirely, has no client-side JS to bypass.
const USERNAME_BLOCKLIST = ['fuck','shit','bitch','cunt','asshole','bastard','dick','pussy','whore','slut','nigger','nigga','faggot','fag','retard','rape','nazi','hitler','porn'];
function containsBlockedWord(str) {
  const normalized = String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return USERNAME_BLOCKLIST.some(w => normalized.includes(w));
}

// Generic Supabase passthrough. The client sends { path, method, body, headers, captchaToken }
// (path is anything under Supabase's REST API, e.g. '/rest/v1/users?id=eq.123'
// or '/rest/v1/rpc/login_user'). This function injects the real apikey/
// Authorization headers server-side and forwards Supabase's actual status
// code + body back untouched, so existing client code that checks
// response.ok / response.status keeps working exactly as before.
async function handleSupabase(req) {
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_KEY;
  if (!supaUrl || !supaKey) {
    return { status: 500, data: { error: 'SUPABASE_URL/SUPABASE_KEY not set in Vercel env vars' } };
  }

  const { path, method, body, headers: extraHeaders, captchaToken } = req.body || {};
  if (!path || typeof path !== 'string' || !path.startsWith('/rest/v1/')) {
    return { status: 400, data: { error: 'Missing or invalid path (must start with /rest/v1/)' } };
  }

  const bareePath = path.split('?')[0];
  let parsedBody = null;
  if (body) {
    try { parsedBody = JSON.parse(body); } catch (e) { /* not JSON, leave as null */ }
  }

  // Username content filter — covers both new signups (register_user's
  // p_username param) and username changes (PATCH /rest/v1/users with a
  // username field), enforced here so it can't be skipped by calling the
  // proxy directly instead of using index.html.
  if (bareePath === '/rest/v1/rpc/register_user' && parsedBody && containsBlockedWord(parsedBody.p_username)) {
    return { status: 400, data: { error: "That username isn't allowed, please choose another" } };
  }
  if (bareePath === '/rest/v1/users' && parsedBody && 'username' in parsedBody && containsBlockedWord(parsedBody.username)) {
    return { status: 400, data: { error: "That username isn't allowed, please choose another" } };
  }

  if (CAPTCHA_PROTECTED_PATHS.includes(bareePath)) {
    const remoteip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const check = await verifyHcaptcha(captchaToken, remoteip);
    if (!check.ok) {
      return { status: 403, data: { error: check.error || 'Captcha verification failed' } };
    }
  }

  const fetchHeaders = {
    apikey: supaKey,
    Authorization: `Bearer ${supaKey}`,
    ...(extraHeaders || {}),
  };
  if (body) fetchHeaders['Content-Type'] = 'application/json';

  const upstream = await fetch(`${supaUrl}${path}`, {
    method: method || 'GET',
    headers: fetchHeaders,
    body: body || undefined,
  });

  const text = await upstream.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  return { status: upstream.status, data };
}
