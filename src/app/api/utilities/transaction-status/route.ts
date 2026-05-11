import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/requireAuth';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

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
    
    // If pending and has flwRef, try to poll for token
    let updatedToken = null;
    if (isPending && transaction.flwRef && !hasToken) {
      try {
        const proxyUrl = process.env.FLW_PROXY_URL;
        const proxySecret = process.env.FLW_PROXY_SECRET;
        
        if (proxyUrl && proxySecret) {
          const res = await fetch(`${proxyUrl}/bill-status/${encodeURIComponent(transaction.flwRef)}`, {
            method: 'GET',
            headers: { 'X-Proxy-Secret': proxySecret },
          });
          
          const data = await res.json();
          
          if (data.status === 'success' && data.data) {
            updatedToken = 
              data.data.extracted_token ||
              data.data.extra ||
              data.data.recharge_token ||
              data.data.token ||
              data.data.voucher ||
              data.data.pin ||
              null;
            
            if (updatedToken) {
              // Update transaction with token
              await db.ref(`transactions/${authUser.uid}/${transactionId}`).update({
                token: updatedToken,
                status: 'completed',
                tokenReceivedAt: Date.now(),
              });
              
              transaction.token = updatedToken;
              transaction.status = 'completed';
              console.log(`[TransactionStatus] Token found and saved for ${transactionId}`);
            }
          }
        }
      } catch (err) {
        console.warn('[TransactionStatus] Failed to poll for token:', err);
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
