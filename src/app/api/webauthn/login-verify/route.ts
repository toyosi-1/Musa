import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://www.musa-security.com';

// Initialize Firebase Admin for custom token generation
function getAdminAuth() {
  if (!getApps().length) {
    // Try to use service account from env, otherwise use default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) {
      try {
        const parsed = JSON.parse(serviceAccount);
        initializeApp({ credential: cert(parsed) });
      } catch {
        initializeApp();
      }
    } else {
      initializeApp();
    }
  }
  return getAuth();
}

/**
 * POST /api/webauthn/login-verify
 * Verify biometric authentication and return a Firebase custom token.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, credential } = await request.json();
    if (!userId || !credential) {
      return NextResponse.json({ success: false, message: 'Missing data' }, { status: 400 });
    }

    const db = await getFirebaseDatabase();

    // Get the stored challenge
    const challengeRef = ref(db, `webauthnChallenges/${userId}`);
    const challengeSnap = await get(challengeRef);
    if (!challengeSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Challenge not found or expired' }, { status: 400 });
    }
    const { challenge } = challengeSnap.val();

    // Find the matching credential
    const credRef = ref(db, `webauthnCredentials/${userId}`);
    const credSnap = await get(credRef);
    if (!credSnap.exists()) {
      return NextResponse.json({ success: false, message: 'No credentials found' }, { status: 404 });
    }

    const creds = credSnap.val();
    let matchedCred: any = null;
    let matchedKey: string | null = null;

    // The credential.id from the browser is base64url-encoded
    for (const [key, c] of Object.entries(creds) as [string, any][]) {
      if (c.credentialId === credential.id) {
        matchedCred = c;
        matchedKey = key;
        break;
      }
    }

    if (!matchedCred) {
      return NextResponse.json({ success: false, message: 'Credential not recognized' }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: matchedCred.credentialId,
        publicKey: new Uint8Array(Buffer.from(matchedCred.publicKey, 'base64')),
        counter: matchedCred.counter || 0,
        transports: matchedCred.transports || [],
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ success: false, message: 'Biometric verification failed' });
    }

    // Update counter
    if (matchedKey) {
      const counterRef = ref(db, `webauthnCredentials/${userId}/${matchedKey}/counter`);
      await set(counterRef, verification.authenticationInfo.newCounter);
    }

    // Clean up challenge
    await set(challengeRef, null);

    // Generate a Firebase custom token so the client can sign in
    try {
      const adminAuth = getAdminAuth();
      const customToken = await adminAuth.createCustomToken(userId);
      return NextResponse.json({ success: true, customToken });
    } catch (adminError: any) {
      // If Firebase Admin isn't configured, return userId for client-side session recovery
      console.warn('Firebase Admin not configured for custom tokens, using session recovery:', adminError?.message);
      return NextResponse.json({ success: true, userId, sessionRecovery: true });
    }
  } catch (error: any) {
    console.error('WebAuthn login-verify error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
