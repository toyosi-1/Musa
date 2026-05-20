import { NextRequest, NextResponse } from 'next/server';
import { invalidateBillersCache } from '@/lib/billersCache';
import { rankBillerCandidates, type BillerCandidate, type FlutterwaveBillItem } from '@/utils/billerMatching';
import { requireAuth, AuthError } from '@/lib/requireAuth';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

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
  payload: Record<string, unknown>,
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
 * Poll Flutterwave's bill-status endpoint for the electricity token.
 * Flutterwave returns prepaid tokens asynchronously in the `extra` field.
 * Extended polling for up to 60 seconds as tokens can take time.
 */
async function pollForToken(
  flwRef: string,
  flwHeaders: Record<string, string>,
  useProxy: boolean,
  maxAttempts = 10,
  delayMs = 6000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      let res: Response;
      
      if (useProxy) {
        // Use proxy for bill status check
        const proxyUrl = process.env.FLW_PROXY_URL;
        const proxySecret = process.env.FLW_PROXY_SECRET;
        res = await fetch(`${proxyUrl}/bill-status/${encodeURIComponent(flwRef)}`, {
          method: 'GET',
          headers: { 'X-Proxy-Secret': proxySecret || '' },
        });
      } else {
        res = await fetch(
          `${FLUTTERWAVE_BASE_URL}/bills/${encodeURIComponent(flwRef)}`,
          { method: 'GET', headers: flwHeaders }
        );
      }
      
      const json = await res.json();
      console.log(`[pollForToken] Attempt ${i + 1}/${maxAttempts} for ${flwRef}:`, JSON.stringify(json).substring(0, 500));
      
      if (json.status === 'success' && json.data) {
        // Try multiple possible token locations
        const token = 
          json.data.extracted_token ||  // From proxy
          json.data.extra || 
          json.data.recharge_token || 
          json.data.token || 
          json.data.voucher || 
          json.data.pin || 
          null;
        if (token) {
          console.log(`[pollForToken] Token found after ${i + 1} attempts`);
          return token;
        }
      }
    } catch (err) {
      console.warn(`[pollForToken] Attempt ${i + 1} failed:`, err);
    }
  }
  console.log(`[pollForToken] Token not found after ${maxAttempts} attempts`);
  return null;
}

/**
 * Save transaction record to Firebase for tracking and async token delivery
 */
async function saveTransactionRecord(
  userId: string,
  transactionData: {
    transactionId: string;
    flwRef: string;
    reference: string;
    meterNumber: string;
    amount: number;
    billerName: string;
    status: 'pending' | 'completed' | 'failed';
    token: string | null;
    createdAt: number;
  }
) {
  try {
    const db = getAdminDatabase();
    const ref = db.ref(`transactions/${userId}`).push();
    await ref.set({
      ...transactionData,
      id: ref.key,
    });
    console.log(`[saveTransaction] Saved transaction ${ref.key} for user ${userId}`);
    return ref.key;
  } catch (err) {
    console.error('[saveTransaction] Failed to save:', err);
    return null;
  }
}

/**
 * Update transaction with token when it arrives
 */
async function updateTransactionWithToken(
  userId: string,
  transactionKey: string | null,
  token: string
) {
  if (!transactionKey) return;
  try {
    const db = getAdminDatabase();
    await db.ref(`transactions/${userId}/${transactionKey}`).update({
      token,
      status: 'completed',
      tokenReceivedAt: Date.now(),
    });
    console.log(`[updateTransaction] Token saved for transaction ${transactionKey}`);
  } catch (err) {
    console.error('[updateTransaction] Failed to update:', err);
  }
}

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
    // Auth first — payment completion must be tied to a known user so we can
    // audit who requested which electricity token. An unauthed caller could
    // brute-force transactionIds and receive tokens they didn't pay for.
    let authUser;
    try {
      authUser = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }

    // Rate limit: 10 purchase attempts per minute per user-IP pair.
    // Payments are synchronous and user-initiated; 10/min is generous for
    // retries while still preventing automated brute-forcing.
    const rl = rateLimit({
      key: `complete-purchase:${authUser.uid}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const { transactionId, itemCode: clientItemCode, billerCode: clientBillerCode, billerName, itemName, meterNumber, amount, phoneNumber, email } =
      await request.json();

    console.log('[CompletePurchase] Request by uid=%s email=%s tx=%s', authUser.uid, authUser.email, transactionId);

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
    console.log('[CompletePurchase] proxy config — FLW_PROXY_URL set:', !!FLW_PROXY_URL, '| PROXY_SECRET set:', !!PROXY_SECRET, '| useProxy:', useProxy);
    console.log('[CompletePurchase] Purchasing via Flutterwave bills API...', useProxy ? '(via proxy)' : '(direct)');

    try {
      let lastError = '';
      let lastRaw = '';

      for (const candidate of candidates) {
        // Flutterwave bills API requires customer_id (meter number for electricity)
        // Reference: https://developer.flutterwave.com/v3.0/docs/bill-payment
        const billPayload = {
          country: 'NG',
          customer: String(meterNumber),
          amount: Number(amount),
          recurrence: 'ONCE',
          type: candidate.itemCode,
          reference: reference,
        };

        console.log(`[CompletePurchase] Trying candidate: type=${candidate.itemCode}, biller_name=${candidate.billerCode} (${candidate.label}), customer=${meterNumber}`);

        const result = await attemptBillPurchase(billPayload, flwHeaders, useProxy);
        console.log(`[CompletePurchase] Result for ${candidate.itemCode}: success=${result.success}, message=${result.message}, raw=${result.raw.substring(0, 600)}`);

        if (result.success) {
          const flwRef = result.data?.flw_ref || result.data?.tx_ref || '';
          let token = result.data?.extra || result.data?.recharge_token || result.data?.token || null;

          // Flutterwave returns prepaid tokens asynchronously — poll if not immediately available
          let asyncToken = null;
          if (!token && flwRef) {
            console.log(`[CompletePurchase] Token not in initial response, polling status for ${flwRef}...`);
            asyncToken = await pollForToken(flwRef, flwHeaders, useProxy);
            if (asyncToken) {
              token = asyncToken;
              console.log(`[CompletePurchase] Token obtained via polling: ${token.substring(0, 8)}...`);
            } else {
              console.log(`[CompletePurchase] Token not yet available after polling — meter may still be credited async.`);
            }
          }

          // If we succeeded with a different code than the client sent, clear cache
          if (candidate.itemCode !== String(clientItemCode)) {
            console.log(`[CompletePurchase] Succeeded with different code: ${clientItemCode} → ${candidate.itemCode}. Clearing billers cache.`);
            invalidateBillersCache();
          }
          
          // Save transaction record for tracking and potential async token delivery
          const transactionKey = await saveTransactionRecord(authUser.uid, {
            transactionId,
            flwRef: flwRef || reference,
            reference,
            meterNumber: String(meterNumber),
            amount: Number(amount),
            billerName: candidate.billerCode,
            status: token ? 'completed' : 'pending',
            token,
            createdAt: Date.now(),
          });

          return NextResponse.json({
            success: true,
            reference: flwRef || reference,
            token,
            transactionId,
            transactionKey,
            provider: 'flutterwave',
            message: token
              ? 'Purchase successful! Your electricity token is ready.'
              : 'Purchase initiated! Your meter will be credited shortly. Check back in a few minutes or contact support if your token does not arrive.',
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
