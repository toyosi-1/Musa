import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

/**
 * POST /api/utilities/webhook
 * 
 * Webhook endpoint for Flutterwave async token delivery.
 * Flutterwave can send webhook notifications when:
 * - Bill payment is completed
 * - Token is generated (for prepaid meters)
 * 
 * This ensures users get their tokens even if the initial API call
 * times out before the token is ready.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('[Webhook] Received Flutterwave webhook:', JSON.stringify(payload).substring(0, 1000));
    
    // Verify webhook signature — fail closed: no secret configured → reject
    const signature = request.headers.get('verif-hash');
    const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('[Webhook] FLUTTERWAVE_WEBHOOK_SECRET is not configured — rejecting webhook');
      return NextResponse.json({ status: 'error', message: 'Webhook not configured' }, { status: 500 });
    }
    
    if (signature !== webhookSecret) {
      console.warn('[Webhook] Invalid webhook signature');
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
    }
    
    // Extract data from webhook payload
    const event = payload.event || payload.status;
    const data = payload.data || payload;
    
    // Handle bill payment events
    if (event === 'bill.completed' || event === 'success' || data.status === 'successful') {
      const flwRef = data.flw_ref || data.tx_ref || data.reference;
      const transactionId = data.transaction_id || data.id;
      
      // Extract token from various possible locations
      const token = 
        data.extra || 
        data.recharge_token || 
        data.token || 
        data.voucher || 
        data.pin || 
        (data.meta && data.meta.token) ||
        null;
      
      if (!flwRef) {
        console.warn('[Webhook] Missing flw_ref in webhook payload');
        return NextResponse.json({ status: 'ok', message: 'No action taken - missing reference' });
      }
      
      // Find and update the transaction in Firebase
      const db = getAdminDatabase();
      
      // Search for transaction by flwRef or transactionId
      const transactionsRef = db.ref('transactions');
      const snapshot = await transactionsRef
        .orderByChild('flwRef')
        .equalTo(flwRef)
        .limitToFirst(1)
        .get();
      
      if (snapshot.exists()) {
        const transactions = snapshot.val();
        const transactionKey = Object.keys(transactions)[0];
        const transaction = transactions[transactionKey];
        
        // Update the transaction with token
        const updates: any = {
          status: 'completed',
          webhookReceivedAt: Date.now(),
          webhookData: payload,
        };
        
        if (token && !transaction.token) {
          updates.token = token;
          updates.tokenReceivedAt = Date.now();
          console.log(`[Webhook] Token received for transaction ${transactionKey}: ${token.substring(0, 20)}...`);
        }
        
        await db.ref(`transactions/${transaction.userId || Object.keys(transactions)[0].split('/')[0]}/${transactionKey}`).update(updates);
        
        console.log(`[Webhook] Updated transaction ${transactionKey}`);
      } else {
        // Try searching by transactionId
        const txSnapshot = await transactionsRef
          .orderByChild('transactionId')
          .equalTo(String(transactionId))
          .limitToFirst(1)
          .get();
        
        if (txSnapshot.exists()) {
          const transactions = txSnapshot.val();
          const userId = Object.keys(transactions)[0].split('/')[0];
          const transactionKey = Object.keys(transactions)[0].split('/')[1];
          
          const updates: any = {
            status: 'completed',
            webhookReceivedAt: Date.now(),
            flwRef,
            webhookData: payload,
          };
          
          if (token) {
            updates.token = token;
            updates.tokenReceivedAt = Date.now();
          }
          
          await db.ref(`transactions/${userId}/${transactionKey}`).update(updates);
          console.log(`[Webhook] Updated transaction by transactionId: ${transactionId}`);
        } else {
          console.log(`[Webhook] Transaction not found for flwRef: ${flwRef}`);
        }
      }
      
      return NextResponse.json({ status: 'ok', message: 'Webhook processed' });
    }
    
    // Handle other events
    console.log('[Webhook] Unhandled event type:', event);
    return NextResponse.json({ status: 'ok', message: 'Event type not handled' });
    
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/utilities/webhook
 * 
 * For webhook verification (Flutterwave may send GET requests to verify the endpoint)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' });
}
