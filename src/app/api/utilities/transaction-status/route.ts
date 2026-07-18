import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/requireAuth';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/** Extract a token from a Flutterwave bill-status response, checking all known fields. */
function extractToken(data: any): string | null {
  if (!data) return null;
  return (
    data.extracted_token ||
    data.extra ||
    data.recharge_token ||
    data.token ||
    data.voucher ||
    data.pin ||
    null
  );
}

/**
 * Check bill status for a single reference — via proxy when configured,
 * otherwise directly against the Flutterwave API.
 */
async function checkBillStatus(ref: string): Promise<string | null> {
  const proxyUrl = process.env.FLW_PROXY_URL;
  const proxySecret = process.env.FLW_PROXY_SECRET;

  try {
    let res: Response;
    if (proxyUrl && proxySecret) {
      res = await fetch(`${proxyUrl}/bill-status/${encodeURIComponent(ref)}`, {
        method: 'GET',
        headers: { 'X-Proxy-Secret': proxySecret },
      });
    } else if (FLUTTERWAVE_SECRET_KEY) {
      res = await fetch(`${FLUTTERWAVE_BASE_URL}/bills/${encodeURIComponent(ref)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
      });
    } else {
      return null;
    }

    const data = await res.json();
    if (data.status === 'success' && data.data) {
      return extractToken(data.data);
    }
  } catch (err) {
    console.warn(`[TransactionStatus] Status check failed for ${ref}:`, err);
  }
  return null;
}

/**
 * GET /api/utilities/transaction-status?transactionKey=xxx
 * 
 * Check the status of an electricity purchase transaction.
 * Returns the token if available, or status indicating if still pending.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    let authUser;
    try {
      authUser = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return err.toResponse();
      throw err;
    }
    
    const { searchParams } = new URL(request.url);
    const transactionKey = searchParams.get('transactionKey');
    const flwRef = searchParams.get('flwRef');
    
    if (!transactionKey && !flwRef) {
      return NextResponse.json(
        { success: false, message: 'Missing transactionKey or flwRef parameter' },
        { status: 400 }
      );
    }
    
    const db = getAdminDatabase();
    let transaction = null;
    let transactionId = null;
    
    // Find transaction by key
    if (transactionKey) {
      const snapshot = await db.ref(`transactions/${authUser.uid}/${transactionKey}`).get();
      if (snapshot.exists()) {
        transaction = snapshot.val();
        transactionId = transactionKey;
      }
    }
    
    // If not found by key, try searching by flwRef
    if (!transaction && flwRef) {
      const snapshot = await db.ref(`transactions/${authUser.uid}`)
        .orderByChild('flwRef')
        .equalTo(flwRef)
        .limitToFirst(1)
        .get();
      
      if (snapshot.exists()) {
        const transactions = snapshot.val();
        transactionId = Object.keys(transactions)[0];
        transaction = transactions[transactionId];
      }
    }
    
    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    // Check if token is available
    const hasToken = !!transaction.token;
    const isPending = transaction.status === 'pending';
    const isCompleted = transaction.status === 'completed';
    
    // If pending without a token, poll Flutterwave — try flwRef first, then
    // the merchant reference (Flutterwave's status endpoint expects the
    // reference used at payment time, which may be either).
    if (isPending && !hasToken) {
      const refsToTry = Array.from(
        new Set([transaction.flwRef, transaction.reference].filter(Boolean))
      ) as string[];

      for (const refToTry of refsToTry) {
        const updatedToken = await checkBillStatus(refToTry);
        if (updatedToken) {
          await db.ref(`transactions/${authUser.uid}/${transactionId}`).update({
            token: updatedToken,
            status: 'completed',
            tokenReceivedAt: Date.now(),
          });

          transaction.token = updatedToken;
          transaction.status = 'completed';
          console.log(`[TransactionStatus] Token found via ${refToTry} and saved for ${transactionId}`);
          break;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        status: transaction.status,
        hasToken: !!transaction.token,
        token: transaction.token || null,
        reference: transaction.flwRef || transaction.reference,
        meterNumber: transaction.meterNumber,
        amount: transaction.amount,
        billerName: transaction.billerName,
        createdAt: transaction.createdAt,
        tokenReceivedAt: transaction.tokenReceivedAt || null,
      },
      message: transaction.token 
        ? 'Your electricity token is ready!'
        : isPending 
          ? 'Your purchase is still processing. Please check back in a few minutes.'
          : 'Purchase status unknown. Please contact support.',
    });
    
  } catch (error: any) {
    console.error('[TransactionStatus] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error checking transaction status' },
      { status: 500 }
    );
  }
}
