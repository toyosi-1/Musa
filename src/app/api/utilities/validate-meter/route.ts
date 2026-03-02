import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * POST /api/utilities/validate-meter
 *
 * Validates an electricity meter number using Flutterwave v3 Bill Payment API.
 * The client must supply the item_code obtained from the /api/utilities/billers endpoint
 * so we always use live, verified codes instead of hardcoded values.
 *
 * Body: { itemCode, meterNumber, billerCode? }
 */
export async function POST(request: NextRequest) {
  try {
    const { itemCode, meterNumber, billerCode } = await request.json();

    if (!itemCode || !meterNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (itemCode, meterNumber)' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error('Flutterwave secret key not configured');
      return NextResponse.json(
        { success: false, message: 'Payment service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Flutterwave v3 validate endpoint — GET with query params
    const validateUrl = `${FLUTTERWAVE_BASE_URL}/bill-items/${encodeURIComponent(itemCode)}/validate`
      + `?code=${encodeURIComponent(meterNumber)}&customer=${encodeURIComponent(meterNumber)}`;

    console.log('Validating meter:', { itemCode, billerCode, meterNumber, validateUrl: validateUrl.replace(FLUTTERWAVE_SECRET_KEY!, '***') });

    const response = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Flutterwave validate response:', JSON.stringify(data));

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
      console.warn('Validation failed:', friendlyMsg, data);
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
