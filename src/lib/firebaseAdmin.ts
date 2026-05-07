/**
 * Firebase Admin SDK for server-side API routes.
 * The client SDK's getFirebaseDatabase() returns an empty stub on the server,
 * so API routes must use this admin helper instead.
 */
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

let adminApp: App | null = null;
let initError: Error | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (initError) throw initError;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    initError = new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable is not set');
    throw initError;
  }

  try {
    // Prefer individual env vars (avoids Netlify 4 KB function-env limit).
    // Fall back to the legacy single-JSON var for local dev.
    const projectId   = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey  = process.env.FCM_PRIVATE_KEY;
    const legacyJson  = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FCM_SERVICE_ACCOUNT_JSON;

    // 1. File-based credentials — written at build time by scripts/write-fcm-secret.js
    let serviceAccount: object | null = null;
    try {
      const filePath = path.join(process.cwd(), 'secrets', 'fcm-service-account.json');
      if (fs.existsSync(filePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch { /* non-fatal — fall through to env vars */ }

    // 2. Individual env vars
    if (!serviceAccount) {
      const privateKeyB64 = process.env.FCM_PRIVATE_KEY_B64;
      const resolvedKey = privateKeyB64
        ? Buffer.from(privateKeyB64, 'base64').toString('utf8')
        : privateKey ? privateKey.replace(/\\n/g, '\n') : null;
      if (projectId && clientEmail && resolvedKey) {
        serviceAccount = { type: 'service_account', project_id: projectId, client_email: clientEmail, private_key: resolvedKey };
      }
    }

    // 3. Legacy single JSON var (local dev)
    if (!serviceAccount && legacyJson) {
      try { serviceAccount = JSON.parse(legacyJson); } catch {
        console.warn('⚠️ Failed to parse service account JSON env var');
      }
    }

    if (serviceAccount) {
      try {
        adminApp = initializeApp({
          credential: cert(serviceAccount as Parameters<typeof cert>[0]),
          databaseURL,
        });
        console.log('✅ Firebase Admin initialized with service account');
        return adminApp;
      } catch (parseError) {
        console.warn('⚠️ Failed to initialize with service account, trying default credentials');
      }
    }

    // Fall back to application default credentials (works on GCP, Cloud Functions, etc.)
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        databaseURL,
      });
      console.log('✅ Firebase Admin initialized with application default credentials');
      return adminApp;
    } catch (defaultError) {
      // Last resort: initialize without credentials (will fail on most operations but won't crash)
      console.warn('⚠️ No credentials available, initializing Firebase Admin without auth');
      adminApp = initializeApp({ databaseURL });
      return adminApp;
    }
  } catch (error) {
    initError = error instanceof Error ? error : new Error('Failed to initialize Firebase Admin');
    console.error('❌ Firebase Admin initialization failed:', initError);
    throw initError;
  }
}

/**
 * Returns a Firebase Admin Realtime Database instance.
 * Safe to call from any server-side context (API routes, middleware, etc.)
 * @throws {Error} if Firebase Admin cannot be initialized
 */
export function getAdminDatabase(): Database {
  try {
    const app = getAdminApp();
    return getDatabase(app);
  } catch (error) {
    console.error('❌ Failed to get admin database:', error);
    throw error;
  }
}

/**
 * Check if Firebase Admin is properly configured
 */
export function isAdminConfigured(): boolean {
  const hasIndividualVars = !!(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
  const hasLegacyJson = !!(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FCM_SERVICE_ACCOUNT_JSON);
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
    (hasIndividualVars || hasLegacyJson || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}
