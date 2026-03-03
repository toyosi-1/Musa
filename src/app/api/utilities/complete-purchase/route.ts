import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * POST /api/utilities/complete-purchase
 *
 * After the user pays via Flutterwave Inline on the frontend:
 * 1. Verify the payment with Flutterwave
 * 2. Create the bill payment (electricity purchase)
 * 3. Return token/receipt
 *
 * Body: { transactionId, itemCode, billerCode, meterNumber, amount, phoneNumber?, email? }
 */
export async function POST(request: NextRequest) {
  try {
    const { transactionId, itemCode, billerCode, meterNumber, amount, phoneNumber, email } =
      await request.json();

    if (!transactionId || !itemCode || !meterNumber || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (transactionId, itemCode, meterNumber, amount)' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Verify the payment with Flutterwave
    console.log('Verifying payment transaction:', transactionId);

    const verifyRes = await fetch(
      `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
      { method: 'GET', headers }
    );
    const verifyData = await verifyRes.json();

    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
      console.error('Payment verification failed:', JSON.stringify(verifyData));
      return NextResponse.json({
        success: false,
        message: 'Payment verification failed. If you were charged, please contact support.',
      });
    }

    // Verify the amount matches
    const paidAmount = verifyData.data.amount;
    const paidCurrency = verifyData.data.currency;

    if (paidCurrency !== 'NGN') {
      return NextResponse.json({
        success: false,
        message: 'Invalid payment currency.',
      });
    }

    if (paidAmount < amount) {
      return NextResponse.json({
        success: false,
        message: `Payment amount mismatch. Expected ₦${amount}, got ₦${paidAmount}.`,
      });
    }

    console.log('Payment verified successfully:', { transactionId, paidAmount, paidCurrency });

    // Step 2: Create the bill payment (purchase electricity)
    const reference = `MUSA-PWR-${Date.now()}-${transactionId}`;

    console.log('Creating bill payment:', { itemCode, billerCode, meterNumber, amount: paidAmount, reference });

    const billRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        country: 'NG',
        customer: meterNumber,
        amount: amount,
        type: itemCode,
        reference: reference,
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        ...(email ? { email } : {}),
      }),
    });

    const billData = await billRes.json();
    console.log('Bill payment response:', JSON.stringify(billData));

    if (billData.status === 'success') {
      const token =
        billData.data?.extra ||
        billData.data?.recharge_token ||
        billData.data?.token ||
        null;

      return NextResponse.json({
        success: true,
        reference: billData.data?.flw_ref || billData.data?.tx_ref || reference,
        token: token,
        transactionId: transactionId,
        message: token
          ? 'Purchase successful! Your token is ready.'
          : 'Purchase successful! Your meter will be credited shortly.',
      });
    } else {
      console.error('Bill payment failed after successful payment:', billData);
      return NextResponse.json({
        success: false,
        message: billData.message || 'Electricity purchase failed. Your payment was received — please contact support for a refund or retry.',
        paymentVerified: true,
      });
    }
  } catch (error: any) {
    console.error('Complete purchase error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
