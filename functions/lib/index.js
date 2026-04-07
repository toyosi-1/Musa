"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutboundIP = exports.flutterwaveBillProxy = void 0;
const functions = require("firebase-functions");
const https = require("https");
/**
 * Flutterwave Bill Payment Proxy
 */
exports.flutterwaveBillProxy = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
    var _a, _b;
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
        const _c = req.body, { proxySecret } = _c, billPayload = __rest(_c, ["proxySecret"]);
        // Get config at runtime, not module load
        const config = functions.config();
        const expectedSecret = (_a = config.proxy) === null || _a === void 0 ? void 0 : _a.secret;
        if (!expectedSecret || proxySecret !== expectedSecret) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const flutterwaveKey = (_b = config.flutterwave) === null || _b === void 0 ? void 0 : _b.secret_key;
        if (!flutterwaveKey) {
            res.status(500).json({ success: false, message: 'Service not configured' });
            return;
        }
        console.log('Proxying bill payment:', JSON.stringify(billPayload));
        const flwResponse = await new Promise((resolve, reject) => {
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
                    }
                    catch (e) {
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
    }
    catch (error) {
        console.error('Proxy error:', (error === null || error === void 0 ? void 0 : error.message) || error);
        res.status(500).json({ success: false, message: 'Proxy error' });
    }
});
/**
 * Get outbound IP
 */
exports.getOutboundIP = functions
    .region('us-central1')
    .https.onRequest(async (_req, res) => {
    try {
        const ipResponse = await new Promise((resolve, reject) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error === null || error === void 0 ? void 0 : error.message });
    }
});
//# sourceMappingURL=index.js.map