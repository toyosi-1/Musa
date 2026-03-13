import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * GET /api/utilities/health-check
 *
 * Lightweight pre-flight check: verify that the Flutterwave API
 * is reachable and the secret key is valid by hitting the
 * bill-categories endpoint (read-only, no side effects).
 *
 * We no longer try to create a test bill — that was too aggressive
 * and caused false "unavailable" results.
 */
export async function GET() {
  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json({
      available: false,
      reason: 'Payment service not configured.',
    });
  }

  try {
    // Use the bill-categories endpoint as a lightweight check.
    // It's read-only and tells us if the API key is valid and reachable.
    const testRes = await fetch(
      `${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    const data = await testRes.json();

    // Check for auth errors
    if (testRes.status === 401 || testRes.status === 403) {
      return NextResponse.json({
        available: false,
        reason: 'Payment service authentication failed. Please contact support.',
      });
    }

    // If we get categories back, the API is working
    if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
      return NextResponse.json({ available: true });
    }

    // If the API responds but with no data, still mark as available
    // (the actual purchase will handle specific errors)
    if (testRes.ok) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({
      available: false,
      reason: data.message || 'Payment service returned an unexpected response.',
    });
  } catch (err: any) {
    // Network timeout or unreachable
    return NextResponse.json({
      available: false,
      reason: `Cannot reach payment service: ${err?.message || 'unknown error'}`,
    });
  }
}
