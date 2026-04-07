const express = require('express');
const app = express();
app.use(express.json());

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const PROXY_SECRET   = process.env.PROXY_SECRET;
const FLW_BASE       = 'https://api.flutterwave.com/v3';
const PORT           = process.env.PORT || 8080;

if (!FLW_SECRET_KEY) console.error('[flw-proxy] FLUTTERWAVE_SECRET_KEY not set');
if (!PROXY_SECRET)   console.error('[flw-proxy] PROXY_SECRET not set');

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'flw-proxy' }));

// GET /verify-ip — returns the outbound IP (public, no auth needed)
app.get('/verify-ip', async (req, res) => {
  try {
    const r = await fetch('https://api64.ipify.org?format=json');
    const data = await r.json();
    return res.json({ outboundIp: data.ip, service: 'flw-proxy' });
  } catch (err) {
    return res.status(500).json({ error: err?.message });
  }
});

// Middleware: verify shared secret
app.use((req, res, next) => {
  const secret = req.headers['x-proxy-secret'] || req.body?.proxySecret;
  if (!PROXY_SECRET || secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// POST /bill — create a Flutterwave bill payment
app.post('/bill', async (req, res) => {
  try {
    const { proxySecret, ...payload } = req.body;
    console.log('[flw-proxy] POST /bill payload:', JSON.stringify(payload));

    const flwRes = await fetch(`${FLW_BASE}/bills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await flwRes.text();
    console.log('[flw-proxy] FLW response status:', flwRes.status, 'body:', text.substring(0, 500));

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return res.status(flwRes.status).json(data);
  } catch (err) {
    console.error('[flw-proxy] /bill error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Proxy error' });
  }
});

// GET /bill-status/:flwRef — poll bill payment status for token
app.get('/bill-status/:flwRef', async (req, res) => {
  try {
    const { flwRef } = req.params;
    console.log('[flw-proxy] GET /bill-status/', flwRef);

    const flwRes = await fetch(`${FLW_BASE}/bills/${flwRef}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });

    const text = await flwRes.text();
    console.log('[flw-proxy] FLW status response:', flwRes.status, text.substring(0, 500));

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return res.status(flwRes.status).json(data);
  } catch (err) {
    console.error('[flw-proxy] /bill-status error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Proxy error' });
  }
});

app.listen(PORT, () => console.log(`[flw-proxy] Listening on port ${PORT}`));
