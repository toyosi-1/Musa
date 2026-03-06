import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'musa-security.com';

/**
 * POST /api/webauthn/login-options
 * Generate authentication options for biometric login.
 * Accepts { email } to look up the user's stored credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, message: 'Missing email' }, { status: 400 });
    }

    const db = await getFirebaseDatabase();

    // Find userId by email
    const usersRef = ref(db, 'users');
    const usersSnap = await get(usersRef);
    let userId: string | null = null;

    if (usersSnap.exists()) {
      usersSnap.forEach((child) => {
        const u = child.val();
        if (u.email?.toLowerCase() === email.toLowerCase()) {
          userId = child.key;
        }
      });
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: 'No account found' }, { status: 404 });
    }

    // Get stored credentials
    const credRef = ref(db, `webauthnCredentials/${userId}`);
    const credSnap = await get(credRef);
    if (!credSnap.exists()) {
      return NextResponse.json({ success: false, message: 'No biometric credentials registered' }, { status: 404 });
    }

    const creds = credSnap.val();
    const allowCredentials = Object.values(creds).map((c: any) => ({
      id: c.credentialId,
      transports: c.transports || [],
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge for verification
    const challengeRef = ref(db, `webauthnChallenges/${userId}`);
    await set(challengeRef, {
      challenge: options.challenge,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, options, userId });
  } catch (error: any) {
    console.error('WebAuthn login-options error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
