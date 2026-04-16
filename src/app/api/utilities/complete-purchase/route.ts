import { NextRequest, NextResponse } from 'next/server';
import { invalidateBillersCache } from '../billers/route';
import { rankBillerCandidates, type BillerCandidate, type FlutterwaveBillItem } from '@/utils/billerMatching';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * Fetch fresh biller codes from Flutterwave and return ALL candidate codes to try,
 * ordered from most-likely to least-likely. Pure matching logic lives in
 * `@/utils/billerMatching` where it is unit-tested.
 */
async function resolveFreshCandidates(
  billerCode: string,
  clientItemCode: string,
  billerName?: string,
  itemName?: string
): Promise<BillerCandidate[]> {
  try {
    const res = await fetch(`${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) {
      console.error('[resolveFresh] API error:', json.status, json.message);
      return [{ itemCode: clientItemCode, billerCode, label: 'client-original' }];
    }

    console.log(`[resolveFresh] Got ${json.data.length} items from Flutterwave API`);
    console.log(`[resolveFresh] Looking for: billerCode=${billerCode}, itemCode=${clientItemCode}, billerName=${billerName}, itemName=${itemName}`);

    const candidates = rankBillerCandidates(json.data as FlutterwaveBillItem[], billerCode, clientItemCode, billerName, itemName);

    if (candidates.length === 1 && candidates[0].label.startsWith('client-fallback')) {
      const uniqueBillers = Array.from(new Set(json.data.map((i: any) => `${i.biller_code}:${i.short_name || i.biller_name}`))).slice(0, 20);
      console.warn(`[resolveFresh] No matches found. Available billers: ${uniqueBillers.join(', ')}`);
    }

    console.log(`[resolveFresh] Returning ${candidates.length} candidates: ${candidates.map(c => `${c.itemCode}(${c.label})`).join(', ')}`);
    return candidates;
  } catch (err) {
    console.error('[resolveFresh] Failed to fetch:', err);
    return [{ itemCode: clientItemCode, billerCode, label: 'error-fallback' }];
  }
}

/**
 * Attempt a bill payment with Flutterwave.
 * Returns the parsed response or throws on network errors.
 */
async function attemptBillPurchase(
  payload: { country: string; customer: string; amount: number; recurrence: string; type: string; reference: string },
  flwHeaders: Record<string, string>,
  useProxy: boolean
): Promise<{ success: boolean; data: any; message: string; raw: string }> {
  let billRes: Response;

  if (useProxy) {
    billRes = await fetch(`${FLW_PROXY_URL}/bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, proxySecret: PROXY_SECRET }),
    });
  } else {
    billRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
      method: 'POST',
      headers: flwHeaders,
      body: JSON.stringify(payload),
    });
  }

  const raw = await billRes.text();
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, data: null, message: 'Non-JSON response', raw };
  }

  return {
    success: parsed.status === 'success',
    data: parsed.data,
    message: parsed.message || '',
    raw,
  };
}

// Proxy for Flutterwave bill payments (needed because Flutterwave requires whitelisted IPs
// and Vercel serverless functions have dynamic IPs)
const FLW_PROXY_URL = process.env.FLW_PROXY_URL;   // e.g. https://flw-proxy-xxx.onrender.com
const PROXY_SECRET  = process.env.FLW_PROXY_SECRET; // shared secret to authenticate with proxy

/**
 * POST /api/utilities/complete-purchase
 *
 * After the user pays via Flutterwave Inline on the frontend:
 * 1. Verify the payment with Flutterwave
 * 2. Purchase electricity via Flutterwave bills API
 * 3. Return token/receipt
 *
 * Body: { transactionId, itemCode, billerCode, meterNumber, amount, phoneNumber?, email? }
 */
export async function POST(request: NextRequest) {
  try {
    const { transactionId, itemCode: clientItemCode, billerCode: clientBillerCode, billerName, itemName, meterNumber, amount, phoneNumber, email } =
      await request.json();

    if (!transactionId || !clientItemCode || !meterNumber || !amount) {
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

    // ── Step 1.5: Resolve ALL possible biller codes from Flutterwave's live API ──
    const resolvedBillerCode = clientBillerCode ? String(clientBillerCode) : '';
    const candidates = await resolveFreshCandidates(
      resolvedBillerCode,
      String(clientItemCode),
      billerName,
      itemName
    );

    console.log(`[CompletePurchase] Got ${candidates.length} candidate codes to try`);

    // ── Step 2: Try each candidate code until one succeeds ──
    const useProxy = !!FLW_PROXY_URL && !!PROXY_SECRET;
    console.log('[CompletePurchase] Purchasing via Flutterwave bills API...', useProxy ? '(via proxy)' : '(direct)');

    try {
      let lastError = '';
      let lastRaw = '';

      for (const candidate of candidates) {
        const billPayload = {
          country: 'NG',
          customer: String(meterNumber),
          amount: Number(amount),
          recurrence: 'ONCE',
          type: candidate.itemCode,
          reference: reference,
        };

        console.log(`[CompletePurchase] Trying candidate: type=${candidate.itemCode} (${candidate.label})`);

        const result = await attemptBillPurchase(billPayload, flwHeaders, useProxy);
        console.log(`[CompletePurchase] Result for ${candidate.itemCode}: success=${result.success}, message=${result.message}`);

        if (result.success) {
          const flwRef = result.data?.flw_ref || result.data?.tx_ref || '';
          const token = result.data?.extra || result.data?.recharge_token || result.data?.token || null;

          // If we succeeded with a different code than the client sent, clear cache
          if (candidate.itemCode !== String(clientItemCode)) {
            console.log(`[CompletePurchase] Succeeded with different code: ${clientItemCode} → ${candidate.itemCode}. Clearing billers cache.`);
            invalidateBillersCache();
          }

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

        const msg = (result.message || '').toLowerCase();
        lastError = result.message;
        lastRaw = result.raw;

        // If error is NOT about invalid biller, stop trying — it's a different kind of error
        if (!msg.includes('invalid biller') && !msg.includes('invalid item') && !msg.includes('biller not found') && !msg.includes('not found')) {
          console.log(`[CompletePurchase] Non-biller error, stopping retries: ${result.message}`);
          break;
        }

        console.log(`[CompletePurchase] Invalid biller for ${candidate.itemCode}, trying next candidate...`);
      }

      // All candidates failed
      console.log('[CompletePurchase] Last error response:', lastRaw.substring(0, 800));
      invalidateBillersCache();

      const flwMsg = (lastError || '').toLowerCase();
      let userMessage: string;

      if (flwMsg.includes('invalid biller') || flwMsg.includes('invalid item') || flwMsg.includes('biller not found')) {
        userMessage = `Invalid Biller selected. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
        console.error(`[CompletePurchase] ALL candidates failed with invalid biller. Tried: ${candidates.map(c => c.itemCode).join(', ')}. Client sent: ${clientItemCode}/${clientBillerCode}`);
      } else if (flwMsg.includes('unauthorized') || flwMsg.includes('authentication') || flwMsg.includes('ip') || flwMsg.includes('whitelist')) {
        userMessage = `Server authorization failed. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
      } else if (flwMsg.includes('cannot be processed') || flwMsg.includes('account administrator')) {
        userMessage = `Electricity service temporarily unavailable. Your payment of ₦${paidAmount} was verified — please contact support for your token or refund. Ref: ${reference}`;
      } else if (flwMsg.includes('balance') || flwMsg.includes('insufficient')) {
        userMessage = `Electricity service temporarily unavailable. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
      } else {
        userMessage = `${lastError || 'Electricity purchase could not be completed'}. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
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
