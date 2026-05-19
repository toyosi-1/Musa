import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin'; // ensures Admin SDK is initialized with FCM_* vars

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * POST /api/auth/refresh
 * 
 * Accepts a Firebase refresh token, validates it via Firebase REST API,
 * then creates a custom token using Firebase Admin SDK so the client
 * can call signInWithCustomToken() to restore the auth session.
 * 
 * This is the critical fallback for PWA cold starts where Firebase Auth
 * can't restore the session from IndexedDB/localStorage.
 */
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Missing refresh token' },
        { status: 400 }
      );
    }

    if (!FIREBASE_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Firebase API key not configured' },
        { status: 500 }
      );
    }

    // Step 1: Validate refresh token via Firebase REST API
    const tokenResponse = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      }
    );

    if (!tokenResponse.ok) {
      console.error('Refresh token validation failed:', tokenResponse.status);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const uid = tokenData.user_id;
    const newRefreshToken = tokenData.refresh_token;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Could not determine user from token' },
        { status: 401 }
      );
    }

    // Step 2: Create a custom token using the shared Firebase Admin SDK
    // (initialized via FCM_PROJECT_ID + FCM_CLIENT_EMAIL + FCM_PRIVATE_KEY)
    let customToken: string;
    try {
      // Trigger shared admin initialization (reads FCM_* env vars on Netlify)
      getAdminDatabase();
      const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
      const adminAuth = getAdminAuth();
      customToken = await adminAuth.createCustomToken(uid);
      console.log('✅ Created custom token for user:', uid);
    } catch (adminError) {
      console.error('❌ Firebase Admin error:', adminError);
      return NextResponse.json(
        { success: false, message: 'Server error creating auth token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customToken,
      refreshToken: newRefreshToken,
      uid,
    });

  } catch (error: any) {
    console.error('Auth refresh error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during session recovery' },
      { status: 500 }
    );
  }
}
