import * as functions from 'firebase-functions';
import * as https from 'https';

/**
 * Flutterwave Bill Payment Proxy
 * Simple proxy that forwards bill payment requests to Flutterwave
 */
export const flutterwaveBillProxy = functions
  .region('us-central1')
  .runWith({ secrets: ['FLUTTERWAVE_SECRET_KEY', 'PROXY_SECRET'] })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, message: 'Method not allowed' });
      return;
    }

    try {
      const { proxySecret, ...billPayload } = req.body;

      // Auth check
      const expectedSecret = process.env.PROXY_SECRET;
      if (!expectedSecret || proxySecret !== expectedSecret) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY;
      if (!flutterwaveKey) {
        res.status(500).json({ success: false, message: 'Service not configured' });
        return;
      }

      console.log('Proxying bill payment:', JSON.stringify(billPayload));

      const flwResponse: any = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(billPayload);
        
        const options = {
          hostname: 'api.flutterwave.com',
          port: 443,
          path: '/v3/bills',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${flutterwaveKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        };

        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Parse error: ${data}`));
            }
          });
        });

        request.on('error', reject);
        request.write(postData);
        request.end();
      });

      console.log('Flutterwave response:', JSON.stringify(flwResponse));
      res.status(200).json(flwResponse);
    } catch (error: any) {
      console.error('Proxy error:', error?.message || error);
      res.status(500).json({ success: false, message: 'Proxy error' });
    }
  });

/**
 * Get outbound IP for whitelisting
 */
export const getOutboundIP = functions
  .region('us-central1')
  .https.onRequest(async (_req, res) => {
    try {
      const ipResponse: string = await new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => resolve(data.trim()));
        }).on('error', reject);
      });
      
      res.status(200).json({ 
        success: true, 
        ip: ipResponse,
        message: 'Add this IP to Flutterwave whitelist' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error?.message });
    }
  });
