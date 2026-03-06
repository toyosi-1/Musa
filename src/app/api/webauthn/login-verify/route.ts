import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://www.musa-security.com';

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

    let db;
    try {
      db = getAdminDatabase();
    } catch (dbError: any) {
      console.error('Firebase Admin init failed:', dbError);
      return NextResponse.json({ 
        success: false, 
        message: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }

    // Get the stored challenge
    const challengeSnap = await db.ref(`webauthnChallenges/${userId}`).once('value');
    if (!challengeSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Challenge not found or expired' }, { status: 400 });
    }
    const { challenge } = challengeSnap.val();

    // Find the matching credential
    const credSnap = await db.ref(`webauthnCredentials/${userId}`).once('value');
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
      await db.ref(`webauthnCredentials/${userId}/${matchedKey}/counter`).set(verification.authenticationInfo.newCounter);
    }

    // Clean up challenge
    await db.ref(`webauthnChallenges/${userId}`).remove();

    // Generate a Firebase custom token so the client can sign in
    try {
      const adminAuth = getAuth();
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
