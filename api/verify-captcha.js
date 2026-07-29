// /api/verify-captcha.js
// Vercel serverless function. Deployed automatically by Vercel because it
// lives in the /api folder at the project root.
//
// This is where the REAL secret lives: it is only ever read from the
// server-side environment variable HCAPTCHA_SECRET_KEY, and it is never
// sent to the browser.
//
// Set it in Vercel: Project -> Settings -> Environment Variables
//   Name:  HCAPTCHA_SECRET_KEY
//   Value: (the "Secret Key" from your hCaptcha dashboard)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = body.token;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing captcha token' });
  }

  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('HCAPTCHA_SECRET_KEY is not set in the environment');
    return res.status(500).json({ success: false, error: 'Server misconfigured' });
  }

  const remoteip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteip) params.append('remoteip', remoteip);

    // hCaptcha's siteverify endpoint expects application/x-www-form-urlencoded
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await verifyRes.json();

    if (!data.success) {
      return res.status(400).json({
        success: false,
        error: 'Captcha verification failed',
        codes: data['error-codes'] || [],
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('hCaptcha verification request failed:', err);
    return res.status(500).json({ success: false, error: 'Verification request failed' });
  }
};
