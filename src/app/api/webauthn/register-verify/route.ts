import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';
import { requireAuth, AuthError } from '@/lib/requireAuth';

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';
const EXPECTED_ORIGINS = [
  'https://musa-security.com',
  'https://www.musa-security.com',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

/**
 * POST /api/webauthn/register-verify
 * Verify the registration response and store the credential.
 * Auth: signed-in user; userId must match token uid.
 */
export async function POST(request: NextRequest) {
  try {
    let authUser;
    try {
      authUser = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }

    const { userId, credential } = await request.json();
    if (!userId || !credential) {
      return NextResponse.json({ success: false, message: 'Missing data' }, { status: 400 });
    }

    if (userId !== authUser.uid) {
      return NextResponse.json(
        { success: false, message: 'You can only register passkeys for your own account.' },
        { status: 403 },
      );
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
      expectedOrigin: EXPECTED_ORIGINS,
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
