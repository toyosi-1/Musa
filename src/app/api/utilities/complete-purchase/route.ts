import { NextRequest, NextResponse } from 'next/server';
import { invalidateBillersCache } from '../billers/route';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * Fetch fresh biller codes from Flutterwave and resolve the correct item_code.
 * Matches by billerCode first, then tries to match prepaid/postpaid by name keywords.
 */
async function resolveFreshItemCode(
  billerCode: string,
  clientItemCode: string,
  billerName?: string,
  itemName?: string
): Promise<{ itemCode: string; billerCode: string } | null> {
  try {
    const res = await fetch(`${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) return null;

    // Find items matching this biller
    const billerItems = json.data.filter((item: any) => item.biller_code === billerCode);

    if (billerItems.length === 0) {
      // Try fuzzy match by biller name
      if (billerName) {
        const nameKey = billerName.toLowerCase();
        const fuzzy = json.data.filter((item: any) =>
          (item.biller_name || '').toLowerCase().includes(nameKey) ||
          (item.short_name || '').toLowerCase().includes(nameKey) ||
          (item.name || '').toLowerCase().includes(nameKey)
        );
        if (fuzzy.length > 0) {
          // Pick the prepaid one by default, or first match
          const prepaid = fuzzy.find((i: any) => (i.biller_name || i.name || '').toLowerCase().includes('prepaid'));
          const pick = prepaid || fuzzy[0];
          console.log(`[resolveFreshItemCode] Fuzzy matched: ${pick.item_code} (${pick.biller_name}) for billerName="${billerName}"`);
          return { itemCode: pick.item_code, billerCode: pick.biller_code };
        }
      }
      return null;
    }

    // If client code is still valid, keep it
    if (billerItems.some((item: any) => item.item_code === clientItemCode)) {
      return { itemCode: clientItemCode, billerCode };
    }

    // Client code is stale — pick the correct replacement
    // Determine if user wanted prepaid or postpaid from the item name
    const wantsPrepaid = (itemName || clientItemCode || '').toLowerCase().includes('prepaid') ||
                         !(itemName || '').toLowerCase().includes('postpaid');

    const match = billerItems.find((item: any) => {
      const name = (item.biller_name || item.name || '').toLowerCase();
      return wantsPrepaid ? name.includes('prepaid') : name.includes('postpaid');
    }) || billerItems[0];

    console.log(`[resolveFreshItemCode] Resolved stale ${clientItemCode} → ${match.item_code} (${match.biller_name})`);
    return { itemCode: match.item_code, billerCode: match.biller_code };
  } catch (err) {
    console.error('[resolveFreshItemCode] Failed to fetch fresh codes:', err);
    return null;
  }
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

    // ── Step 1.5: Resolve fresh biller codes from Flutterwave ──
    let resolvedItemCode = String(clientItemCode);
    let resolvedBillerCode = clientBillerCode ? String(clientBillerCode) : '';

    try {
      const fresh = await resolveFreshItemCode(
        resolvedBillerCode,
        resolvedItemCode,
        billerName,
        itemName
      );
      if (fresh) {
        if (fresh.itemCode !== resolvedItemCode || fresh.billerCode !== resolvedBillerCode) {
          console.log(`[CompletePurchase] Codes updated: itemCode ${resolvedItemCode} → ${fresh.itemCode}, billerCode ${resolvedBillerCode} → ${fresh.billerCode}`);
          invalidateBillersCache(); // clear stale cache so future requests use fresh codes
        }
        resolvedItemCode = fresh.itemCode;
        resolvedBillerCode = fresh.billerCode;
      } else {
        console.warn('[CompletePurchase] Could not resolve fresh codes, using client-provided codes');
      }
    } catch (resolveErr) {
      console.warn('[CompletePurchase] Fresh code resolution failed, using client-provided codes:', resolveErr);
    }

    // ── Step 2: Purchase electricity via Flutterwave bills API (via proxy if configured) ──
    const useProxy = !!FLW_PROXY_URL && !!PROXY_SECRET;
    console.log('[CompletePurchase] Purchasing via Flutterwave bills API...', useProxy ? '(via proxy)' : '(direct)', { resolvedItemCode, resolvedBillerCode });

    const billPayload = {
      country: 'NG',
      customer: String(meterNumber),
      amount: Number(amount),
      recurrence: 'ONCE',
      type: resolvedItemCode,
      reference: reference,
      ...(resolvedBillerCode ? { biller_name: resolvedBillerCode } : {}),
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

      if (flwMsg.includes('invalid biller') || flwMsg.includes('invalid item') || flwMsg.includes('biller not found')) {
        userMessage = `Invalid Biller selected. Your payment of ₦${paidAmount} was verified — please contact support. Ref: ${reference}`;
        console.error(`[CompletePurchase] Invalid biller/item code. resolvedItemCode=${resolvedItemCode}, resolvedBillerCode=${resolvedBillerCode}, original=${clientItemCode}/${clientBillerCode}. Codes may be stale — clearing billers cache.`);
        invalidateBillersCache();
      } else if (flwMsg.includes('unauthorized') || flwMsg.includes('authentication') || flwMsg.includes('ip') || flwMsg.includes('whitelist')) {
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
