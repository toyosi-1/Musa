/**
 * Reconstructs secrets/fcm-service-account.json from individual Netlify env vars.
 *
 * Netlify cannot store the full service account JSON (exceeds 4KB function-env limit),
 * so we store the three key fields as separate env vars and reassemble the file at
 * build time. The file is written to disk so the runtime code can read it without
 * touching the function environment at all.
 *
 * Required env vars (set in Netlify UI — Site settings → Environment variables):
 *   FCM_PROJECT_ID    — e.g. "musa-app-9a301"
 *   FCM_CLIENT_EMAIL  — e.g. "firebase-adminsdk-fbsvc@musa-app-9a301.iam.gserviceaccount.com"
 *   FCM_PRIVATE_KEY   — full PEM string (Netlify stores \n as literal \\n — expanded below)
 *
 * The generated file is gitignored and never committed to the repo.
 */

const fs   = require('fs');
const path = require('path');

const projectId   = process.env.FCM_PROJECT_ID;
const clientEmail = process.env.FCM_CLIENT_EMAIL;
const privateKey  = process.env.FCM_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.warn('[write-fcm-secret] FCM env vars not set — skipping secret file generation');
  process.exit(0);
}

const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) {
  fs.mkdirSync(secretsDir, { recursive: true });
}

// Normalise the private key: Netlify may store \n as literal \\n or as real newlines.
// Also strip any surrounding quotes that might have been included when pasting.
const normalizedKey = privateKey
  .replace(/^["']|["']$/g, '')   // strip surrounding quotes
  .replace(/\\n/g, '\n');         // expand escaped newlines

const serviceAccount = {
  type: 'service_account',
  project_id: projectId,
  private_key_id: process.env.FCM_PRIVATE_KEY_ID || '',
  private_key: normalizedKey,
  client_email: clientEmail,
  client_id: '',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: '',
  universe_domain: 'googleapis.com',
};

const outPath = path.join(secretsDir, 'fcm-service-account.json');
fs.writeFileSync(outPath, JSON.stringify(serviceAccount, null, 2), 'utf8');
console.log('[write-fcm-secret] ✅ secrets/fcm-service-account.json written successfully');
