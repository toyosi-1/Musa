import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

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

    // Generate unique transaction reference
    const reference = `MUSA-PWR-${Date.now()}-${userId.substring(0, 8)}`;

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
        type: billCode,
        reference: reference,
        phone_number: phoneNumber,
        email: email || `${userId}@musa-security.com`,
        recurrence: 'ONCE',
      }),
    });

    const data = await response.json();

    if (data.status === 'success') {
      // Log transaction to Firebase for record keeping
      // You can add Firebase logging here if needed
      
      return NextResponse.json({
        success: true,
        reference: reference,
        token: data.data?.token || 'Token sent to meter',
        message: 'Purchase successful',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.message || 'Transaction failed. Please try again.',
      });
    }
  } catch (error) {
    console.error('Power purchase error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during purchase' },
      { status: 500 }
    );
  }
}
