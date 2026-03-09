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

    let verifyData: any;
    try {
      const verifyRes = await fetch(
        `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
        { method: 'GET', headers }
      );
      const verifyText = await verifyRes.text();
      try {
        verifyData = JSON.parse(verifyText);
      } catch {
        console.error('Verify response not JSON:', verifyText.substring(0, 500));
        return NextResponse.json({
          success: false,
          message: 'Payment verification returned an unexpected response. Your payment may still be valid — please contact support.',
          paymentVerified: false,
        });
      }
    } catch (fetchErr: any) {
      console.error('Verify fetch failed:', fetchErr?.message);
      return NextResponse.json({
        success: false,
        message: 'Could not reach payment verification service. Your payment may still be valid — please contact support.',
        paymentVerified: false,
      });
    }

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
    // Route through Firebase Cloud Function proxy to avoid Netlify IP whitelisting issue
    const reference = `MUSA-PWR-${Date.now()}-${transactionId}`;

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

    console.log('Creating bill payment:', JSON.stringify(billPayload));

    // Use Cloud Function proxy if available, otherwise try direct
    const proxyUrl = process.env.BILL_PAYMENT_PROXY_URL;
    const proxySecret = process.env.BILL_PAYMENT_PROXY_SECRET;
    
    let billRes: Response;
    let billData: any;
    try {
      if (proxyUrl && proxySecret) {
        console.log('Using Cloud Function proxy for bill payment:', proxyUrl);
        billRes = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proxySecret, ...billPayload }),
        });
      } else {
        console.log('No proxy configured (BILL_PAYMENT_PROXY_URL missing), calling Flutterwave directly');
        billRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
          method: 'POST',
          headers,
          body: JSON.stringify(billPayload),
        });
      }

      const billText = await billRes.text();
      console.log('Bill payment raw response (status', billRes.status, '):', billText.substring(0, 1000));

      try {
        billData = JSON.parse(billText);
      } catch {
        console.error('Bill response not JSON:', billText.substring(0, 500));
        return NextResponse.json({
          success: false,
          message: 'Electricity service returned an unexpected response. Your payment was verified — please contact support for your token.',
          paymentVerified: true,
        });
      }
    } catch (fetchErr: any) {
      console.error('Bill payment fetch failed:', fetchErr?.message);
      return NextResponse.json({
        success: false,
        message: `Could not reach electricity service: ${fetchErr?.message || 'network error'}. Your payment was verified — please contact support.`,
        paymentVerified: true,
      });
    }

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
      console.error('Bill payment failed after successful payment:', JSON.stringify(billData));
      
      // Detect common Flutterwave errors and provide helpful messages
      const flwMessage = (billData.message || '').toLowerCase();
      let userMessage: string;
      
      if (flwMessage.includes('ip') || flwMessage.includes('whitelist')) {
        userMessage = 'Payment service configuration error (IP restriction). Please contact support.';
      } else if (flwMessage.includes('specify') && flwMessage.includes('customer')) {
        userMessage = 'Payment service error. Your payment was received — please contact support for your electricity token.';
      } else {
        userMessage = billData.message || 'Electricity purchase failed. Your payment was received — please contact support for a refund or retry.';
      }
      
      return NextResponse.json({
        success: false,
        message: userMessage,
        paymentVerified: true,
      });
    }
  } catch (error: any) {
    console.error('Complete purchase error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${error?.message || 'unknown'}. Your payment may still be valid — please contact support.`,
        paymentVerified: false,
      },
      { status: 500 }
    );
  }
}
