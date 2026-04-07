import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_BASE_URL = process.env.VTPASS_SANDBOX === 'true'
  ? 'https://sandbox.vtpass.com/api'
  : 'https://vtpass.com/api';

/**
 * GET /api/utilities/health-check
 *
 * Lightweight pre-flight check:
 * 1. If VTPass is configured, check VTPass wallet balance endpoint (read-only)
 * 2. Fallback: check Flutterwave bill-categories endpoint
 *
 * Either provider being available is sufficient.
 */
export async function GET() {
  // ── VTPass check (primary) ──
  if (VTPASS_API_KEY && VTPASS_PUBLIC_KEY) {
    try {
      const vtRes = await fetch(`${VTPASS_BASE_URL}/balance`, {
        method: 'GET',
        headers: {
          'api-key': VTPASS_API_KEY,
          'public-key': VTPASS_PUBLIC_KEY,
        },
        signal: AbortSignal.timeout(8000),
      });

      const vtData = await vtRes.json();

      if (vtRes.ok && vtData.code === '000') {
        return NextResponse.json({ available: true, provider: 'vtpass' });
      }
    } catch (vtErr: any) {
      console.warn('[HealthCheck] VTPass check failed:', vtErr?.message);
    }
  }

  // ── Flutterwave check (fallback) ──
  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json({
      available: false,
      reason: 'Electricity payment service not configured. Please contact support.',
    });
  }

  try {
    const testRes = await fetch(
      `${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    const data = await testRes.json();

    if (testRes.status === 401 || testRes.status === 403) {
      return NextResponse.json({
        available: false,
        reason: 'Payment service authentication failed. Please contact support.',
      });
    }

    if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
      return NextResponse.json({ available: true, provider: 'flutterwave' });
    }

    if (testRes.ok) {
      return NextResponse.json({ available: true, provider: 'flutterwave' });
    }

    return NextResponse.json({
      available: false,
      reason: data.message || 'Payment service returned an unexpected response.',
    });
  } catch (err: any) {
    return NextResponse.json({
      available: false,
      reason: `Cannot reach payment service: ${err?.message || 'unknown error'}`,
    });
  }
}
