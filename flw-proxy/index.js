const express = require('express');
const app = express();

// Enable CORS for all origins (needed for PWA)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Proxy-Secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const PROXY_SECRET   = process.env.PROXY_SECRET;
const FLW_BASE       = 'https://api.flutterwave.com/v3';
const PORT           = process.env.PORT || 8080;

if (!FLW_SECRET_KEY) console.error('[flw-proxy] FLUTTERWAVE_SECRET_KEY not set');
if (!PROXY_SECRET)   console.error('[flw-proxy] PROXY_SECRET not set');

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[flw-proxy] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

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

// POST /bill — create a Flutterwave bill payment with retry logic
app.post('/bill', async (req, res) => {
  const startTime = Date.now();
  let lastError = null;
  
  // Try up to 3 times with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { proxySecret, useStructuredEndpoint, billerCode, itemCode, ...payload } = req.body;
      
      // Use correct structured endpoint as recommended by Flutterwave support:
      // POST /v3/billers/{biller_code}/items/{item_code}/payment
      // instead of the legacy POST /v3/bills with "type" field
      const flwUrl = useStructuredEndpoint && billerCode && itemCode
        ? `${FLW_BASE}/billers/${encodeURIComponent(billerCode)}/items/${encodeURIComponent(itemCode)}/payment`
        : `${FLW_BASE}/bills`;

      console.log(`[flw-proxy] POST /bill attempt ${attempt}/3 → ${flwUrl}:`, JSON.stringify(payload));

      const flwRes = await fetch(flwUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await flwRes.text();
      console.log(`[flw-proxy] FLW response (attempt ${attempt}):`, flwRes.status, text.substring(0, 800));

      let data;
      try { 
        data = JSON.parse(text); 
      } catch { 
        data = { raw: text, status: 'error', message: 'Invalid JSON response from Flutterwave' }; 
      }
      
      // If Flutterwave returns success or specific non-retryable error, return immediately
      if (flwRes.status === 200 || flwRes.status === 201) {
        if (data.status === 'success') {
          console.log(`[flw-proxy] Bill payment succeeded on attempt ${attempt} in ${Date.now() - startTime}ms`);
          return res.status(flwRes.status).json(data);
        }
        // Check for non-retryable errors
        const msg = (data.message || '').toLowerCase();
        if (msg.includes('insufficient') || msg.includes('balance') || msg.includes('invalid biller')) {
          console.log(`[flw-proxy] Non-retryable error on attempt ${attempt}:`, data.message);
          return res.status(flwRes.status).json(data);
        }
      }
      
      // Save error for potential retry
      lastError = { status: flwRes.status, data };
      
      // Wait before retry (exponential backoff)
      if (attempt < 3) {
        const delay = attempt * 1000;
        console.log(`[flw-proxy] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (err) {
      console.error(`[flw-proxy] /bill attempt ${attempt} error:`, err?.message);
      lastError = { error: err?.message || 'Network error' };
      
      if (attempt < 3) {
        const delay = attempt * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  // All retries failed
  console.error('[flw-proxy] All 3 attempts failed. Last error:', lastError);
  return res.status(500).json({ 
    status: 'error', 
    message: 'Failed to process bill payment after 3 attempts',
    details: lastError 
  });
});

// GET /bill-status/:flwRef — poll bill payment status for token
app.get('/bill-status/:flwRef', async (req, res) => {
  try {
    const { flwRef } = req.params;
    console.log('[flw-proxy] GET /bill-status/', flwRef);

    const flwRes = await fetch(`${FLW_BASE}/bills/${encodeURIComponent(flwRef)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });

    const text = await flwRes.text();
    console.log('[flw-proxy] FLW status response:', flwRes.status, text.substring(0, 800));

    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text, status: 'error', message: 'Invalid JSON response' }; 
    }
    
    // Extract token from various possible locations
    if (data.status === 'success' && data.data) {
      const token = data.data.extra || data.data.recharge_token || data.data.token || 
                    data.data.voucher || data.data.pin || null;
      if (token) {
        data.data.extracted_token = token;
        console.log('[flw-proxy] Token found:', token.substring(0, 20) + '...');
      }
    }
    
    return res.status(flwRes.status).json(data);
  } catch (err) {
    console.error('[flw-proxy] /bill-status error:', err?.message);
    return res.status(500).json({ status: 'error', message: err?.message || 'Proxy error' });
  }
});

// GET /bill-categories — proxy for fetching biller categories
app.get('/bill-categories', async (req, res) => {
  try {
    console.log('[flw-proxy] GET /bill-categories');
    
    const queryParams = new URLSearchParams(req.query).toString();
    const url = `${FLW_BASE}/bill-categories${queryParams ? '?' + queryParams : ''}`;
    
    const flwRes = await fetch(url, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
    });

    const text = await flwRes.text();
    console.log('[flw-proxy] FLW categories response:', flwRes.status, text.substring(0, 500));

    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text, status: 'error', message: 'Invalid JSON response' }; 
    }
    
    return res.status(flwRes.status).json(data);
  } catch (err) {
    console.error('[flw-proxy] /bill-categories error:', err?.message);
    return res.status(500).json({ status: 'error', message: err?.message || 'Proxy error' });
  }
});

// POST /validate-bill — validate a bill payment (meter verification)
app.post('/validate-bill', async (req, res) => {
  try {
    const { proxySecret, item_code, code, customer } = req.body;
    console.log('[flw-proxy] POST /validate-bill:', { item_code, code, customer });

    const flwRes = await fetch(`${FLW_BASE}/bill-items/${item_code}/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ item_code, code, customer }),
    });

    const text = await flwRes.text();
    console.log('[flw-proxy] FLW validate response:', flwRes.status, text.substring(0, 800));

    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text, status: 'error', message: 'Invalid JSON response' }; 
    }
    
    return res.status(flwRes.status).json(data);
  } catch (err) {
    console.error('[flw-proxy] /validate-bill error:', err?.message);
    return res.status(500).json({ status: 'error', message: err?.message || 'Proxy error' });
  }
});

// Enhanced health check with timestamp and diagnostics
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'flw-proxy',
    timestamp: new Date().toISOString(),
    config: {
      hasSecretKey: !!FLW_SECRET_KEY,
      hasProxySecret: !!PROXY_SECRET,
      flutterwaveBase: FLW_BASE
    }
  });
});

app.listen(PORT, () => {
  console.log(`[flw-proxy] Listening on port ${PORT}`);
  console.log(`[flw-proxy] Health check: http://localhost:${PORT}/health`);
  console.log(`[flw-proxy] Configured for Flutterwave: ${FLW_BASE}`);
});
