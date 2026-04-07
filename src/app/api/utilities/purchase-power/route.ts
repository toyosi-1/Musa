import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * POST /api/utilities/purchase-power
 *
 * Creates an electricity bill payment via Flutterwave v3.
 * The client must supply the item_code obtained from /api/utilities/billers.
 *
 * Body: { userId, itemCode, billerCode, meterNumber, amount, phoneNumber?, email? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, itemCode, billerCode, meterNumber, amount, phoneNumber, email } =
      await request.json();

    if (!userId || !itemCode || !meterNumber || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (userId, itemCode, meterNumber, amount)' },
        { status: 400 }
      );
    }

    if (amount < 500) {
      return NextResponse.json(
        { success: false, message: 'Minimum purchase amount is ₦500' },
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

    // Generate unique transaction reference
    const reference = `MUSA-PWR-${Date.now()}-${userId.substring(0, 8)}`;

    console.log('Processing power purchase:', {
      itemCode,
      billerCode,
      meterNumber,
      amount,
      reference,
    });

    // Flutterwave v3 create bill payment
    // Docs: https://developer.flutterwave.com/v3.0/reference/create-a-bill-payment
    const billPayload = {
      country: 'NG',
      customer_id: String(meterNumber),
      amount: Number(amount),
      recurrence: 'ONCE',
      type: String(itemCode),
      reference: reference,
      ...(billerCode ? { biller_name: String(billerCode) } : {}),
      ...(phoneNumber ? { phone_number: String(phoneNumber) } : {}),
      ...(email ? { email: String(email) } : {}),
    };

    console.log('Bill payment payload:', JSON.stringify(billPayload));

    const proxyUrl    = process.env.BILL_PAYMENT_PROXY_URL;
    const proxySecret = process.env.BILL_PAYMENT_PROXY_SECRET;

    let data: any;

    // Preferred: route via Cloud Run proxy (static whitelisted IP)
    if (proxyUrl && proxySecret) {
      console.log('[purchase-power] Using proxy:', proxyUrl);
      try {
        const proxyRes = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proxySecret, ...billPayload }),
        });
        data = await proxyRes.json();
        console.log('[purchase-power] Proxy response:', JSON.stringify(data));
      } catch (proxyErr: any) {
        console.warn('[purchase-power] Proxy failed, falling back to direct:', proxyErr?.message);
      }
    }

    // Fallback: direct Flutterwave (may fail due to dynamic Netlify IP)
    if (!data) {
      console.log('[purchase-power] Attempting direct Flutterwave API...');
      const response = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billPayload),
      });
      data = await response.json();
    }

    console.log('Flutterwave purchase response:', JSON.stringify(data));

    if (data.status === 'success') {
      // For prepaid meters, the token comes in data.extra after async processing.
      // It may be null initially — the user should poll or we rely on webhooks.
      const token =
        data.data?.extra ||
        data.data?.recharge_token ||
        data.data?.token ||
        null;

      return NextResponse.json({
        success: true,
        reference: data.data?.flw_ref || data.data?.tx_ref || reference,
        token: token,
        message: token
          ? 'Purchase successful! Your token is ready.'
          : 'Purchase successful! Your meter will be credited shortly.',
      });
    } else {
      console.warn('Purchase failed:', data);
      return NextResponse.json({
        success: false,
        message: data.message || 'Transaction failed. Please try again.',
      });
    }
  } catch (error: any) {
    console.error('Power purchase error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during purchase. Please try again.' },
      { status: 500 }
    );
  }
}
