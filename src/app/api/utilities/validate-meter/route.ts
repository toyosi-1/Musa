import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

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
        { success: false, message: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Map disco IDs to Flutterwave bill codes
    const discoMap: Record<string, string> = {
      'ikeja-electric': 'BIL099',
      'eko-electric': 'BIL100',
      'abuja-electric': 'BIL101',
      'ibadan-electric': 'BIL102',
      'enugu-electric': 'BIL103',
      'port-harcourt-electric': 'BIL104',
      'jos-electric': 'BIL105',
      'kaduna-electric': 'BIL106',
      'kano-electric': 'BIL107',
    };

    const billCode = discoMap[disco];
    if (!billCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid distribution company' },
        { status: 400 }
      );
    }

    // Validate meter with Flutterwave
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/bill-items/${billCode}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_code: billCode,
        code: meterNumber,
        customer: meterNumber,
      }),
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return NextResponse.json({
        success: true,
        meterInfo: {
          customerName: data.data.customer_name || data.data.name,
          address: data.data.address || 'N/A',
          meterNumber: meterNumber,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.message || 'Unable to validate meter number',
      });
    }
  } catch (error) {
    console.error('Meter validation error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during validation' },
      { status: 500 }
    );
  }
}
