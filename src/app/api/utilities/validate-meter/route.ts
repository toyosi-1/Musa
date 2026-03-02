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
    const { disco, meterNumber, meterType } = await request.json();

    if (!disco || !meterNumber || !meterType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Pick the correct item_code based on meter type (prepaid vs postpaid)
    const itemCode = meterType === 'postpaid' ? discoInfo.postpaid : discoInfo.prepaid;

    // Flutterwave validate endpoint is GET with query params
    const validateUrl = `${FLUTTERWAVE_BASE_URL}/bill-items/${itemCode}/validate?code=${encodeURIComponent(meterNumber)}&customer=${encodeURIComponent(meterNumber)}`;

    console.log('Validating meter:', { disco, meterNumber, meterType, itemCode, validateUrl: validateUrl.replace(FLUTTERWAVE_SECRET_KEY, '***') });

    const response = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Flutterwave validate response:', JSON.stringify(data));

    if (data.status === 'success' && data.data) {
      return NextResponse.json({
        success: true,
        meterInfo: {
          customerName: data.data.customer_name || data.data.name || data.data.response_message || 'Customer',
          address: data.data.address || 'N/A',
          meterNumber: meterNumber,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.message || 'Unable to validate meter number. Please check the number and try again.',
      });
    }
  } catch (error: any) {
    console.error('Meter validation error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during validation. Please try again.' },
      { status: 500 }
    );
  }
}
