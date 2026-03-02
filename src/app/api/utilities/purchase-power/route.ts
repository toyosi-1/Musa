import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// Map disco IDs to Flutterwave biller_code and item_code (prepaid / postpaid)
const discoMap: Record<string, { biller_code: string; prepaid: string; postpaid: string }> = {
  'ikeja-electric':          { biller_code: 'BIL099', prepaid: 'UB159', postpaid: 'UB160' },
  'eko-electric':            { biller_code: 'BIL100', prepaid: 'UB161', postpaid: 'UB162' },
  'abuja-electric':          { biller_code: 'BIL101', prepaid: 'UB163', postpaid: 'UB164' },
  'ibadan-electric':         { biller_code: 'BIL102', prepaid: 'UB165', postpaid: 'UB166' },
  'enugu-electric':          { biller_code: 'BIL103', prepaid: 'UB167', postpaid: 'UB168' },
  'port-harcourt-electric':  { biller_code: 'BIL104', prepaid: 'UB169', postpaid: 'UB170' },
  'jos-electric':            { biller_code: 'BIL105', prepaid: 'UB171', postpaid: 'UB172' },
  'kaduna-electric':         { biller_code: 'BIL106', prepaid: 'UB173', postpaid: 'UB174' },
  'kano-electric':           { biller_code: 'BIL107', prepaid: 'UB175', postpaid: 'UB176' },
};

export async function POST(request: NextRequest) {
  try {
    const { userId, disco, meterNumber, meterType, amount, phoneNumber, email } = await request.json();

    if (!userId || !disco || !meterNumber || !amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount < 500) {
      return NextResponse.json(
        { success: false, message: 'Minimum purchase amount is ₦500' },
        { status: 400 }
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error('Flutterwave secret key not configured');
      return NextResponse.json(
        { success: false, message: 'Payment service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const discoInfo = discoMap[disco];
    if (!discoInfo) {
      return NextResponse.json(
        { success: false, message: 'Invalid distribution company' },
        { status: 400 }
      );
    }

    // Pick the correct item_code based on meter type
    const itemCode = meterType === 'postpaid' ? discoInfo.postpaid : discoInfo.prepaid;

    // Generate unique transaction reference
    const reference = `MUSA-PWR-${Date.now()}-${userId.substring(0, 8)}`;

    console.log('Processing power purchase:', { disco, meterNumber, meterType, itemCode, amount, reference });

    // Process payment with Flutterwave Bill Payment API
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: 'NG',
        customer: meterNumber,
        amount: amount,
        type: itemCode,
        reference: reference,
        phone_number: phoneNumber,
        email: email || `${userId}@musa-security.com`,
        recurrence: 'ONCE',
      }),
    });

    const data = await response.json();
    console.log('Flutterwave purchase response:', JSON.stringify(data));

    if (data.status === 'success') {
      return NextResponse.json({
        success: true,
        reference: data.data?.flw_ref || reference,
        token: data.data?.extra || data.data?.token || 'Processing - check your meter shortly',
        message: 'Purchase successful',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.message || 'Transaction failed. Please try again.',
      });
    }
  } catch (error: any) {
    console.error('Power purchase error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during purchase. Please try again.' },
      { status: 500 }
    );
  }
}
