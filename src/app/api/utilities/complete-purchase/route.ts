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

    // Try Cloud Function proxy first, then fall back to direct Flutterwave API
    const proxyUrl = process.env.BILL_PAYMENT_PROXY_URL;
    const proxySecret = process.env.BILL_PAYMENT_PROXY_SECRET;
    
    let billData: any;

    // Helper: attempt a bill payment call and parse JSON response
    const attemptBillPayment = async (
      url: string,
      fetchHeaders: Record<string, string>,
      body: any,
      label: string
    ): Promise<{ ok: boolean; data?: any; error?: string }> => {
      try {
        console.log(`[${label}] Calling: ${url}`);
        const res = await fetch(url, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(body),
        });
        const text = await res.text();
        console.log(`[${label}] Status ${res.status}, body: ${text.substring(0, 800)}`);

        try {
          const data = JSON.parse(text);
          return { ok: true, data };
        } catch {
          return { ok: false, error: `Non-JSON response (status ${res.status}): ${text.substring(0, 200)}` };
        }
      } catch (fetchErr: any) {
        return { ok: false, error: fetchErr?.message || 'Network error' };
      }
    };

    // 1) Try proxy if configured
    if (proxyUrl && proxySecret) {
      const proxyResult = await attemptBillPayment(
        proxyUrl,
        { 'Content-Type': 'application/json' },
        { proxySecret, ...billPayload },
        'Proxy'
      );
      if (proxyResult.ok) {
        billData = proxyResult.data;
      } else {
        console.warn('Proxy failed, falling back to direct API:', proxyResult.error);
      }
    }

    // 2) Fall back to direct Flutterwave API if proxy wasn't used or failed
    if (!billData) {
      console.log('Calling Flutterwave bills API directly');
      const directResult = await attemptBillPayment(
        `${FLUTTERWAVE_BASE_URL}/bills`,
        headers,
        billPayload,
        'Direct'
      );
      if (directResult.ok) {
        billData = directResult.data;
      } else {
        console.error('Direct Flutterwave API also failed:', directResult.error);
        return NextResponse.json({
          success: false,
          message: `Could not reach electricity service. Your payment was verified — please contact support for your token. (${directResult.error})`,
          paymentVerified: true,
        });
      }
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
