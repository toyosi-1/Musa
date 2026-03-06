import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://www.musa-security.com';

/**
 * POST /api/webauthn/register-verify
 * Verify the registration response and store the credential.
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

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ success: false, message: 'Verification failed' });
    }

    const { credential: regCred, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Store credential in Firebase
    await db.ref(`webauthnCredentials/${userId}`).push().set({
      credentialId: Buffer.from(regCred.id).toString('base64url'),
      publicKey: Buffer.from(regCred.publicKey).toString('base64'),
      counter: regCred.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.response?.transports || [],
      createdAt: Date.now(),
    });

    // Clean up challenge
    await db.ref(`webauthnChallenges/${userId}`).remove();

    return NextResponse.json({ success: true, message: 'Biometric login registered!' });
  } catch (error: any) {
    console.error('WebAuthn register-verify error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
