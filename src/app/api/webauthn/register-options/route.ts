import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

const RP_NAME = 'Musa Security';
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';

/**
 * POST /api/webauthn/register-options
 * Generate registration options for a user to create a new passkey.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, displayName } = await request.json();
    if (!userId || !email) {
      return NextResponse.json({ success: false, message: 'Missing userId or email' }, { status: 400 });
    }

    // Get existing credentials for this user (to exclude them)
    const db = await getFirebaseDatabase();
    const credRef = ref(db, `webauthnCredentials/${userId}`);
    const snapshot = await get(credRef);
    const existingCreds: any[] = [];
    if (snapshot.exists()) {
      const creds = snapshot.val();
      for (const key of Object.keys(creds)) {
        existingCreds.push({
          id: creds[key].credentialId,
          type: 'public-key' as const,
          transports: creds[key].transports || [],
        });
      }
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: email,
      userDisplayName: displayName || email,
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      excludeCredentials: existingCreds.map(c => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Only device biometrics (Face ID, fingerprint)
      },
    });

    // Store the challenge temporarily for verification
    const challengeRef = ref(db, `webauthnChallenges/${userId}`);
    const { set } = await import('firebase/database');
    await set(challengeRef, {
      challenge: options.challenge,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error('WebAuthn register-options error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
