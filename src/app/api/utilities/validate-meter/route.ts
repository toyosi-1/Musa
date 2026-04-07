import { NextRequest, NextResponse } from 'next/server';
import { resolveVTPassServiceId, resolveVariationCode } from '@/utils/vtpassMapping';

const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_BASE_URL = process.env.VTPASS_SANDBOX === 'true'
  ? 'https://sandbox.vtpass.com/api'
  : 'https://vtpass.com/api';

// Flutterwave fallback
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * POST /api/utilities/validate-meter
 *
 * Validates an electricity meter number.
 * Primary: VTPass merchant-verify endpoint
 * Fallback: Flutterwave v3 bill-items validate
 *
 * Body: { itemCode, meterNumber, billerCode?, billerName?, itemName? }
 */
export async function POST(request: NextRequest) {
  try {
    const { itemCode, meterNumber, billerCode, billerName, itemName } = await request.json();

    if (!meterNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: meterNumber' },
        { status: 400 }
      );
    }

    // ── Try VTPass first ──
    if (VTPASS_API_KEY && VTPASS_PUBLIC_KEY) {
      const serviceId = resolveVTPassServiceId(billerCode, billerName);
      const variation = resolveVariationCode(itemName, itemCode);

      if (serviceId) {
        console.log('[ValidateMeter] VTPass verify:', { serviceId, meterNumber, variation });

        try {
          const vtRes = await fetch(`${VTPASS_BASE_URL}/merchant-verify`, {
            method: 'POST',
            headers: {
              'api-key': VTPASS_API_KEY,
              'secret-key': VTPASS_PUBLIC_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              billersCode: meterNumber,
              serviceID: serviceId,
              type: variation,
            }),
          });

          const vtData = await vtRes.json();
          console.log('[ValidateMeter] VTPass response:', JSON.stringify(vtData).substring(0, 500));

          if (vtData.code === '000' && vtData.content) {
            const content = vtData.content;
            return NextResponse.json({
              success: true,
              meterInfo: {
                customerName: content.Customer_Name || content.customerName || 'Customer',
                address: content.Address || content.address || 'N/A',
                meterNumber: content.Meter_Number || meterNumber,
                meterType: content.Meter_Type || variation,
                minAmount: content.Minimum_Amount || content.Min_Purchase_Amount || null,
              },
            });
          } else {
            const msg = vtData.response_description || vtData.content?.error || 'Invalid meter number';
            console.warn('[ValidateMeter] VTPass validation failed:', msg);
            return NextResponse.json({ success: false, message: msg });
          }
        } catch (vtErr: any) {
          console.error('[ValidateMeter] VTPass error, falling back to Flutterwave:', vtErr?.message);
        }
      } else {
        console.warn('[ValidateMeter] Could not resolve VTPass serviceId for:', billerCode, billerName);
      }
    }

    // ── Fallback: Flutterwave ──
    if (!FLUTTERWAVE_SECRET_KEY || !itemCode) {
      return NextResponse.json(
        { success: false, message: 'Meter validation service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const validateUrl = `${FLUTTERWAVE_BASE_URL}/bill-items/${encodeURIComponent(itemCode)}/validate`
      + `?code=${encodeURIComponent(meterNumber)}&customer=${encodeURIComponent(meterNumber)}`;

    console.log('[ValidateMeter] Flutterwave fallback:', { itemCode, billerCode, meterNumber });

    const response = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('[ValidateMeter] Flutterwave response:', JSON.stringify(data));

    if (data.status === 'success' && data.data) {
      return NextResponse.json({
        success: true,
        meterInfo: {
          customerName: data.data.name || data.data.customer_name || data.data.response_message || 'Customer',
          address: data.data.address || 'N/A',
          meterNumber: meterNumber,
        },
      });
    } else {
      const friendlyMsg =
        data.message || 'Unable to validate meter number. Please check the number and try again.';
      console.warn('[ValidateMeter] Flutterwave validation failed:', friendlyMsg, data);
      return NextResponse.json({ success: false, message: friendlyMsg });
    }
  } catch (error: any) {
    console.error('Meter validation error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Server error during validation. Please try again.' },
      { status: 500 }
    );
  }
}
