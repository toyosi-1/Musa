import { NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * GET /api/utilities/test-bill-payment
 * 
 * Diagnostic endpoint to test Flutterwave bill payment access.
 * Returns detailed error information to help diagnose the issue.
 */
export async function GET() {
  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json({
      success: false,
      error: 'FLUTTERWAVE_SECRET_KEY not configured',
      solution: 'Add FLUTTERWAVE_SECRET_KEY to your environment variables'
    });
  }

  try {
    // Test 1: Check if we can access bill categories (read-only, no IP restriction)
    console.log('Test 1: Checking bill categories access...');
    const categoriesRes = await fetch(
      `${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const categoriesData = await categoriesRes.json();
    
    if (categoriesRes.status === 401 || categoriesRes.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        status: categoriesRes.status,
        message: categoriesData.message || 'Invalid API key',
        solution: 'Check that your FLUTTERWAVE_SECRET_KEY is correct and active'
      });
    }

    if (categoriesData.status !== 'success') {
      return NextResponse.json({
        success: false,
        error: 'Bill categories fetch failed',
        status: categoriesRes.status,
        response: categoriesData,
        solution: 'Bill payments may not be enabled on your Flutterwave account'
      });
    }

    // Test 2: Try to create a test bill payment (this will show IP restriction errors)
    console.log('Test 2: Attempting test bill creation...');
    const testBillPayload = {
      country: 'NG',
      customer_id: '1234567890', // Fake meter number for testing
      amount: 1000,
      recurrence: 'ONCE',
      type: 'PREPAID', // Generic type
      reference: `TEST-${Date.now()}`,
    };

    const billRes = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBillPayload),
    });

    const billText = await billRes.text();
    let billData: any;
    
    try {
      billData = JSON.parse(billText);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Non-JSON response from Flutterwave',
        status: billRes.status,
        rawResponse: billText.substring(0, 500),
        solution: 'Flutterwave API may be experiencing issues'
      });
    }

    // Analyze the response
    if (billRes.status === 401 || billRes.status === 403) {
      const msg = (billData.message || '').toLowerCase();
      
      if (msg.includes('ip') || msg.includes('whitelist')) {
        return NextResponse.json({
          success: false,
          error: 'IP Whitelisting Required',
          status: billRes.status,
          message: billData.message,
          solution: 'Your server IP needs to be whitelisted in Flutterwave dashboard. Go to Settings → API Settings → Whitelist IPs. Note: Netlify uses dynamic IPs, so you may need to whitelist their entire IP range or use a proxy with a static IP.',
          netlifyIpRanges: 'https://docs.netlify.com/routing/redirects/redirect-options/#ip-based-redirects'
        });
      }

      if (msg.includes('unauthorized') || msg.includes('authentication')) {
        return NextResponse.json({
          success: false,
          error: 'Authentication/Authorization Failed',
          status: billRes.status,
          message: billData.message,
          possibleCauses: [
            'Bill payments feature not enabled on your Flutterwave account',
            'API key does not have bill payment permissions',
            'IP whitelisting required but not configured',
            'Flutterwave account not fully verified'
          ],
          solution: 'Contact Flutterwave support to enable bill payments on your account, or check Settings → Bill Payments in your dashboard'
        });
      }
    }

    if (billData.status === 'success') {
      return NextResponse.json({
        success: true,
        message: 'Bill payment API is working! (Test bill created successfully)',
        warning: 'You may want to check your Flutterwave dashboard to see if this test bill was actually processed',
        response: billData
      });
    }

    // Other errors
    return NextResponse.json({
      success: false,
      error: 'Bill creation failed',
      status: billRes.status,
      response: billData,
      solution: 'Check the error message from Flutterwave for specific details'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Network or server error',
      message: error?.message || 'Unknown error',
      solution: 'Check your internet connection and Flutterwave API status'
    });
  }
}
