import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * GET /api/utilities/health-check
 *
 * Pre-flight check: verify that bill payments can be created
 * before letting users pay. This prevents money loss when the
 * Flutterwave account doesn't have bill payment permissions.
 */
export async function GET() {
  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json({
      available: false,
      reason: 'Payment service not configured.',
    });
  }

  try {
    // Try a minimal bill creation with a clearly invalid reference
    // to see if we get "cannot be processed" (permissions) vs
    // a normal validation error (meaning bills ARE enabled)
    const testRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: 'NG',
        customer: '0000000000',
        amount: 0,
        recurrence: 'ONCE',
        type: 'HEALTHCHECK',
        reference: `HEALTH-${Date.now()}`,
      }),
    });

    const text = await testRes.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        available: false,
        reason: 'Unexpected response from payment service.',
      });
    }

    const msg = (data.message || '').toLowerCase();

    // "cannot be processed" = account doesn't have bill payment permissions
    if (msg.includes('cannot be processed') || msg.includes('account administrator')) {
      return NextResponse.json({
        available: false,
        reason: 'Bill payments are not enabled on the payment provider account. Please contact support.',
      });
    }

    // Any other error (invalid biller, invalid amount, etc.) means
    // the API IS accessible — bill payments are enabled
    return NextResponse.json({ available: true });
  } catch (err: any) {
    return NextResponse.json({
      available: false,
      reason: `Cannot reach payment service: ${err?.message || 'unknown error'}`,
    });
  }
}
