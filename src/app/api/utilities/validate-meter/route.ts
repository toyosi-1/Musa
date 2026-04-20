import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/requireAuth';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * POST /api/utilities/validate-meter
 *
 * Validates an electricity meter number via Flutterwave v3.
 * Returns the registered customer name + address for the meter — therefore
 * requires authentication to prevent anonymous meter-number enumeration.
 *
 * Body: { itemCode, meterNumber, billerCode? }
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

    // 30 validations/min — legit users try a few meters; this blocks scraping.
    const rl = rateLimit({
      key: `validate-meter:${authUser.uid}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const { itemCode, meterNumber, billerCode } = await request.json();

    if (!meterNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: meterNumber' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY || !itemCode) {
      return NextResponse.json(
        { success: false, message: 'Meter validation service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const validateUrl = `${FLUTTERWAVE_BASE_URL}/bill-items/${encodeURIComponent(itemCode)}/validate`
      + `?code=${encodeURIComponent(meterNumber)}&customer=${encodeURIComponent(meterNumber)}`;

    console.log('[ValidateMeter] Flutterwave fallback:', { itemCode, billerCode, meterNumber });

    const response = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('[ValidateMeter] Flutterwave response:', JSON.stringify(data));

    if (data.status === 'success' && data.data) {
      return NextResponse.json({
        success: true,
        meterInfo: {
          customerName: data.data.name || data.data.customer_name || data.data.response_message || 'Customer',
          address: data.data.address || 'N/A',
          meterNumber: meterNumber,
        },
      });
    } else {
      const friendlyMsg =
        data.message || 'Unable to validate meter number. Please check the number and try again.';
      console.warn('[ValidateMeter] Flutterwave validation failed:', friendlyMsg, data);
      return NextResponse.json({ success: false, message: friendlyMsg });
    }
  } catch (error: any) {
    console.error('Meter validation error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during validation. Please try again.' },
      { status: 500 }
    );
  }
}
