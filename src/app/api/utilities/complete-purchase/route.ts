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
    // Per Flutterwave v3.0.0 docs:
    //   - Bill payments debit from the MERCHANT's funded Flutterwave balance
    //   - Server IP must be whitelisted in Flutterwave dashboard
    //   - Token for prepaid comes from the bill STATUS endpoint (extra field)
    const reference = `MUSA-PWR-${Date.now()}-${transactionId}`;

    const billPayload = {
      country: 'NG',
      customer_id: String(meterNumber),
      amount: Number(amount),
      recurrence: 'ONCE',
      type: String(itemCode),
      reference: reference,
      ...(billerCode ? { biller_name: String(billerCode) } : {}),
    };

    console.log('Creating bill payment:', JSON.stringify(billPayload));

    // Route through Firebase Cloud Function proxy (whitelisted IP)
    const proxyUrl = process.env.BILL_PAYMENT_PROXY_URL;
    const proxySecret = process.env.BILL_PAYMENT_PROXY_SECRET;

    // Helper: make a JSON API call with error handling
    const apiCall = async (
      url: string,
      method: string,
      fetchHeaders: Record<string, string>,
      body?: any,
      label = ''
    ): Promise<{ ok: boolean; data?: any; error?: string }> => {
      try {
        console.log(`[${label}] ${method} ${url}`);
        const opts: RequestInit = { method, headers: fetchHeaders };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        const text = await res.text();
        console.log(`[${label}] Status ${res.status}, body: ${text.substring(0, 800)}`);
        try {
          return { ok: true, data: JSON.parse(text) };
        } catch {
          return { ok: false, error: `Non-JSON (status ${res.status}): ${text.substring(0, 200)}` };
        }
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Network error' };
      }
    };

    let billData: any;

    // 1) Try proxy (whitelisted IP)
    if (proxyUrl && proxySecret) {
      const r = await apiCall(proxyUrl, 'POST', { 'Content-Type': 'application/json' }, { proxySecret, ...billPayload }, 'Proxy');
      if (r.ok) billData = r.data;
      else console.warn('Proxy failed:', r.error);
    }

    // 2) Fallback to direct API
    if (!billData) {
      const r = await apiCall(`${FLUTTERWAVE_BASE_URL}/bills`, 'POST', headers, billPayload, 'Direct');
      if (r.ok) {
        billData = r.data;
      } else {
        return NextResponse.json({
          success: false,
          message: `Could not reach electricity service. Your payment of ₦${paidAmount} was verified — please contact support with ref: ${reference}`,
          paymentVerified: true,
        });
      }
    }

    console.log('Bill payment response:', JSON.stringify(billData));

    // Handle Flutterwave account-level errors
    if (billData.status !== 'success') {
      const flwMsg = (billData.message || '').toLowerCase();
      let userMessage: string;

      if (flwMsg.includes('cannot be processed') || flwMsg.includes('account administrator')) {
        userMessage = 'Electricity service is temporarily unavailable (provider account issue). Your payment of ₦' + paidAmount + ' was verified — please contact support for your token or refund.';
      } else if (flwMsg.includes('ip') || flwMsg.includes('whitelist')) {
        userMessage = 'Service configuration error. Your payment was verified — please contact support.';
      } else if (flwMsg.includes('balance') || flwMsg.includes('insufficient')) {
        userMessage = 'Electricity service temporarily unavailable. Your payment was verified — please contact support.';
      } else {
        userMessage = billData.message || 'Electricity purchase could not be completed. Your payment was verified — please contact support.';
      }

      return NextResponse.json({ success: false, message: userMessage, paymentVerified: true });
    }

    // Bill creation succeeded — now poll for the token
    // Per Flutterwave docs: token is in the "extra" field of the bill STATUS endpoint
    const flwRef = billData.data?.flw_ref || billData.data?.tx_ref || '';
    let token = billData.data?.extra || billData.data?.recharge_token || billData.data?.token || null;

    // If no token in initial response, poll the status endpoint (up to 4 times, 5s apart)
    if (!token && flwRef) {
      console.log('No token in initial response, polling bill status for:', flwRef);
      for (let attempt = 1; attempt <= 4; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`[StatusPoll] Attempt ${attempt}/4 for ref: ${flwRef}`);

        // Try via proxy first for whitelisted IP
        let statusData: any;
        if (proxyUrl && proxySecret) {
          // The proxy only handles POST /bills — call status directly
        }
        const statusResult = await apiCall(
          `${FLUTTERWAVE_BASE_URL}/bills/${flwRef}`,
          'GET',
          headers,
          undefined,
          `StatusPoll-${attempt}`
        );

        if (statusResult.ok && statusResult.data?.status === 'success') {
          statusData = statusResult.data;
          const extraToken = statusData.data?.extra;
          if (extraToken && extraToken !== 'null' && extraToken !== '') {
            token = extraToken;
            console.log('Token found via status poll:', token);
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      reference: flwRef || reference,
      token: token,
      transactionId: transactionId,
      message: token
        ? 'Purchase successful! Your electricity token is ready.'
        : 'Purchase initiated! Your meter will be credited shortly. Check your meter in a few minutes.',
    });
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
