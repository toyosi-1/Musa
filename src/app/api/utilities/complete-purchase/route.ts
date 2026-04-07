import { NextRequest, NextResponse } from 'next/server';
import { resolveVTPassServiceId, resolveVariationCode, generateVTPassRequestId } from '@/utils/vtpassMapping';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// Proxy for Flutterwave bill payments (needed because Flutterwave requires whitelisted IPs
// and Vercel serverless functions have dynamic IPs)
const FLW_PROXY_URL = process.env.FLW_PROXY_URL;   // e.g. https://flw-proxy-xxx.onrender.com
const PROXY_SECRET  = process.env.FLW_PROXY_SECRET; // shared secret to authenticate with proxy

// VTPass credentials
const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY;
const VTPASS_BASE_URL = process.env.VTPASS_SANDBOX === 'true'
  ? 'https://sandbox.vtpass.com/api'
  : 'https://vtpass.com/api';

/**
 * POST /api/utilities/complete-purchase
 *
 * After the user pays via Flutterwave Inline on the frontend:
 * 1. Verify the payment with Flutterwave
 * 2. Purchase electricity via VTPass (primary) or Flutterwave bills (fallback)
 * 3. Return token/receipt
 *
 * Body: { transactionId, itemCode, billerCode, meterNumber, amount, phoneNumber?, email?, billerName?, itemName? }
 */
export async function POST(request: NextRequest) {
  try {
    const { transactionId, itemCode, billerCode, meterNumber, amount, phoneNumber, email, billerName, itemName } =
      await request.json();

    if (!transactionId || !meterNumber || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (transactionId, meterNumber, amount)' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    const flwHeaders = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };

    // ── Step 1: Verify the payment with Flutterwave ──
    console.log('[CompletePurchase] Verifying payment:', transactionId);

    let verifyData: any;
    try {
      const verifyRes = await fetch(
        `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
        { method: 'GET', headers: flwHeaders }
      );
      const verifyText = await verifyRes.text();
      try {
        verifyData = JSON.parse(verifyText);
      } catch {
        console.error('[CompletePurchase] Verify response not JSON:', verifyText.substring(0, 500));
        return NextResponse.json({
          success: false,
          message: 'Payment verification returned an unexpected response. Your payment may still be valid — please contact support.',
          paymentVerified: false,
        });
      }
    } catch (fetchErr: any) {
      console.error('[CompletePurchase] Verify fetch failed:', fetchErr?.message);
      return NextResponse.json({
        success: false,
        message: 'Could not reach payment verification service. Your payment may still be valid — please contact support.',
        paymentVerified: false,
      });
    }

    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
      console.error('[CompletePurchase] Payment verification failed:', JSON.stringify(verifyData));
      return NextResponse.json({
        success: false,
        message: 'Payment verification failed. If you were charged, please contact support.',
      });
    }

    const paidAmount = verifyData.data.amount;
    const paidCurrency = verifyData.data.currency;

    if (paidCurrency !== 'NGN') {
      return NextResponse.json({ success: false, message: 'Invalid payment currency.' });
    }

    if (paidAmount < amount) {
      return NextResponse.json({
        success: false,
        message: `Payment amount mismatch. Expected ₦${amount}, got ₦${paidAmount}.`,
      });
    }

    console.log('[CompletePurchase] Payment verified:', { transactionId, paidAmount, paidCurrency });

    const reference = `MUSA-PWR-${Date.now()}-${transactionId}`;

    // ── Step 2: Purchase electricity via VTPass (primary) ──
    if (VTPASS_API_KEY && VTPASS_SECRET_KEY) {
      const serviceId = resolveVTPassServiceId(billerCode, billerName);
      const variation = resolveVariationCode(itemName, itemCode);

      if (serviceId) {
        const requestId = generateVTPassRequestId();
        const vtPayload = {
          request_id: requestId,
          serviceID: serviceId,
          billersCode: String(meterNumber),
          variation_code: variation,
          amount: Number(amount),
          phone: phoneNumber || '08000000000',
        };

        console.log('[CompletePurchase] VTPass purchase:', JSON.stringify(vtPayload));

        try {
          const vtRes = await fetch(`${VTPASS_BASE_URL}/pay`, {
            method: 'POST',
            headers: {
              'api-key': VTPASS_API_KEY,
              'secret-key': VTPASS_SECRET_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(vtPayload),
          });

          const vtData = await vtRes.json();
          console.log('[CompletePurchase] VTPass response:', JSON.stringify(vtData).substring(0, 1000));

          // VTPass success codes: "000" = delivered
          if (vtData.code === '000') {
            const token = vtData.purchased_code || vtData.token || vtData.content?.transactions?.purchased_code || null;
            const units = vtData.units || null;
            const tokenAmount = vtData.tokenAmount || null;

            // Clean up token string (VTPass returns "Token : XXXX" format)
            const cleanToken = token ? String(token).replace(/^Token\s*:\s*/i, '').trim() : null;

            console.log('[CompletePurchase] VTPass SUCCESS! Token:', cleanToken, 'Units:', units);

            return NextResponse.json({
              success: true,
              reference: vtData.requestId || requestId,
              token: cleanToken,
              units: units,
              tokenAmount: tokenAmount,
              transactionId: transactionId,
              provider: 'vtpass',
              message: cleanToken
                ? `Purchase successful! Your electricity token is ready.`
                : 'Purchase initiated! Your meter will be credited shortly.',
            });
          }

          // VTPass pending: "099" = transaction is processing
          if (vtData.code === '099') {
            console.log('[CompletePurchase] VTPass transaction pending, polling...');
            // Poll for result (up to 3 times, 8s apart)
            for (let attempt = 1; attempt <= 3; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 8000));
              console.log(`[CompletePurchase] VTPass requery attempt ${attempt}/3`);

              try {
                const reqRes = await fetch(`${VTPASS_BASE_URL}/requery`, {
                  method: 'POST',
                  headers: {
                    'api-key': VTPASS_API_KEY,
                    'secret-key': VTPASS_SECRET_KEY,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ request_id: requestId }),
                });
                const reqData = await reqRes.json();
                console.log(`[CompletePurchase] Requery response:`, JSON.stringify(reqData).substring(0, 500));

                if (reqData.code === '000') {
                  const token = reqData.purchased_code || reqData.token || null;
                  const cleanToken = token ? String(token).replace(/^Token\s*:\s*/i, '').trim() : null;
                  return NextResponse.json({
                    success: true,
                    reference: reqData.requestId || requestId,
                    token: cleanToken,
                    units: reqData.units || null,
                    transactionId,
                    provider: 'vtpass',
                    message: cleanToken
                      ? 'Purchase successful! Your electricity token is ready.'
                      : 'Purchase initiated! Your meter will be credited shortly.',
                  });
                }
              } catch (reqErr: any) {
                console.error('[CompletePurchase] Requery error:', reqErr?.message);
              }
            }

            // Still pending after polling
            return NextResponse.json({
              success: true,
              reference: requestId,
              token: null,
              transactionId,
              provider: 'vtpass',
              message: 'Purchase is being processed. Your meter will be credited within a few minutes. If not, contact support with ref: ' + requestId,
            });
          }

          // VTPass failure
          const vtMsg = vtData.response_description || vtData.content?.errors || vtData.message || 'Purchase failed';
          console.error('[CompletePurchase] VTPass failed:', vtMsg, JSON.stringify(vtData));

          // Check if it's a low-balance issue on VTPass wallet
          const vtMsgLower = String(vtMsg).toLowerCase();
          if (vtMsgLower.includes('low') || vtMsgLower.includes('balance') || vtMsgLower.includes('insufficient')) {
            return NextResponse.json({
              success: false,
              message: `Electricity service temporarily unavailable (provider balance). Your payment of ₦${paidAmount} was verified — please contact support for your token or refund. Ref: ${reference}`,
              paymentVerified: true,
            });
          }

          return NextResponse.json({
            success: false,
            message: `${vtMsg}. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`,
            paymentVerified: true,
          });
        } catch (vtErr: any) {
          console.error('[CompletePurchase] VTPass network error:', vtErr?.message);
          // Fall through to Flutterwave fallback
        }
      } else {
        console.warn('[CompletePurchase] Could not resolve VTPass serviceId for:', billerCode, billerName);
      }
    } else {
      console.warn('[CompletePurchase] VTPass not configured (VTPASS_API_KEY / VTPASS_SECRET_KEY missing)');
    }

    // ── Step 3: Fallback to Flutterwave bills API (via proxy if configured) ──
    const useProxy = !!FLW_PROXY_URL && !!PROXY_SECRET;
    console.log('[CompletePurchase] Falling back to Flutterwave bills API...', useProxy ? '(via proxy)' : '(direct)');

    const billPayload = {
      country: 'NG',
      customer: String(meterNumber),
      amount: Number(amount),
      recurrence: 'ONCE',
      type: String(itemCode),
      reference: reference,
      ...(billerCode ? { biller_name: String(billerCode) } : {}),
    };

    try {
      let billRes: Response;

      if (useProxy) {
        // Route through proxy (has a static IP whitelisted on Flutterwave)
        billRes = await fetch(`${FLW_PROXY_URL}/bill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...billPayload, proxySecret: PROXY_SECRET }),
        });
      } else {
        // Direct call (will fail if server IP not whitelisted)
        billRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
          method: 'POST',
          headers: flwHeaders,
          body: JSON.stringify(billPayload),
        });
      }

      const billText = await billRes.text();
      console.log('[CompletePurchase] Flutterwave bills response:', billText.substring(0, 800));

      let billData: any;
      try {
        billData = JSON.parse(billText);
      } catch {
        return NextResponse.json({
          success: false,
          message: `Electricity service returned unexpected response. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`,
          paymentVerified: true,
        });
      }

      if (billData.status === 'success') {
        const flwRef = billData.data?.flw_ref || billData.data?.tx_ref || '';
        const token = billData.data?.extra || billData.data?.recharge_token || billData.data?.token || null;

        return NextResponse.json({
          success: true,
          reference: flwRef || reference,
          token,
          transactionId,
          provider: 'flutterwave',
          message: token
            ? 'Purchase successful! Your electricity token is ready.'
            : 'Purchase initiated! Your meter will be credited shortly.',
        });
      }

      // Flutterwave error
      const flwMsg = (billData.message || '').toLowerCase();
      let userMessage: string;

      if (flwMsg.includes('unauthorized') || flwMsg.includes('authentication') || flwMsg.includes('ip') || flwMsg.includes('whitelist')) {
        userMessage = `Server authorization failed. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
      } else if (flwMsg.includes('cannot be processed') || flwMsg.includes('account administrator')) {
        userMessage = `Electricity service temporarily unavailable. Your payment of ₦${paidAmount} was verified — please contact support for your token or refund. Ref: ${reference}`;
      } else if (flwMsg.includes('balance') || flwMsg.includes('insufficient')) {
        userMessage = `Electricity service temporarily unavailable. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
      } else {
        userMessage = `${billData.message || 'Electricity purchase could not be completed'}. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
      }

      return NextResponse.json({ success: false, message: userMessage, paymentVerified: true });
    } catch (flwErr: any) {
      console.error('[CompletePurchase] Flutterwave bills error:', flwErr?.message);
      return NextResponse.json({
        success: false,
        message: `Could not reach electricity service. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`,
        paymentVerified: true,
      });
    }
  } catch (error: any) {
    console.error('[CompletePurchase] Fatal error:', error?.message || error, error?.stack);
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
