/**
 * FCM v1 HTTP API helper (server-side only).
 *
 * Uses the Firebase service account credentials stored in the
 * FCM_SERVICE_ACCOUNT_JSON environment variable to mint a short-lived
 * OAuth2 access token and send messages via the FCM v1 endpoint.
 *
 * Why not firebase-admin? The admin SDK pulls in ~10 MB of native binaries
 * which bloat the Netlify function bundle. This thin helper uses only the
 * Google OAuth2 token endpoint and a plain fetch, keeping the bundle small.
 */

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface FcmMessage {
  token: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: Record<string, string>;
  url?: string;
}

/** Cache the access token for up to 55 minutes to avoid minting a new one per request. */
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Sign a JWT and exchange it for a short-lived OAuth2 access token
 * using the service account credentials.
 */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.value;
  }

  // Build JWT header + payload
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the RSA private key and sign
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const keyBuffer = Buffer.from(pemBody, 'base64');
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput),
  );

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`;

  // Exchange JWT for OAuth2 access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to get FCM access token: ${await tokenRes.text()}`);
  }

  const { access_token, expires_in } = await tokenRes.json();
  cachedToken = { value: access_token, expiresAt: now + (expires_in as number) };
  return access_token;
}

/**
 * Send a push notification to a single FCM token via the v1 HTTP API.
 * Returns true on success, false on non-fatal failure (e.g. stale token).
 */
export async function sendFcmNotification(msg: FcmMessage): Promise<boolean> {
  const saJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.warn('[fcmAdmin] FCM_SERVICE_ACCOUNT_JSON not set — skipping push');
    return false;
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saJson) as ServiceAccount;
  } catch {
    console.error('[fcmAdmin] FCM_SERVICE_ACCOUNT_JSON is not valid JSON');
    return false;
  }

  try {
    const accessToken = await getAccessToken(sa);

    const body = {
      message: {
        token: msg.token,
        notification: {
          title: msg.title,
          body:  msg.body,
        },
        webpush: {
          notification: {
            title: msg.title,
            body:  msg.body,
            icon:  msg.icon  || '/images/icon-192x192.png',
            badge: '/images/icon-192x192.png',
            tag:   msg.tag   || 'musa',
            requireInteraction: msg.requireInteraction ?? false,
            vibrate: msg.vibrate ?? [200, 100, 200],
          },
          fcm_options: {
            link: msg.url || '/',
          },
        },
        android: {
          priority: 'high',
          notification: {
            icon:              'ic_notification',
            color:             '#DAA520',
            default_sound:     true,
            default_vibrate_timings: true,
            notification_priority: 'PRIORITY_HIGH',
            visibility:        'PUBLIC',
          },
        },
        data: msg.data || {},
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      console.log('[fcmAdmin] ✅ Push sent, message id:', (await res.json()).name);
      return true;
    }

    const err = await res.json().catch(() => ({}));
    const errCode = err?.error?.details?.[0]?.errorCode || err?.error?.status || res.status;

    // Stale / unregistered token — non-fatal, just log
    if (
      errCode === 'UNREGISTERED' ||
      errCode === 'INVALID_ARGUMENT' ||
      res.status === 404
    ) {
      console.warn('[fcmAdmin] Stale FCM token for message, skipping:', errCode);
      return false;
    }

    console.error('[fcmAdmin] FCM v1 error:', JSON.stringify(err));
    return false;
  } catch (err) {
    console.error('[fcmAdmin] sendFcmNotification threw:', err);
    return false;
  }
}
