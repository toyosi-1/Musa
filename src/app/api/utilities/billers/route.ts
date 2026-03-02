import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// In-memory cache to avoid hitting Flutterwave on every request
let billersCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/utilities/billers
 *
 * Fetches electricity billers and their item_codes from Flutterwave v3 dynamically.
 * Returns a list of DisCos with their biller_code and prepaid/postpaid item_codes.
 */
export async function GET(_request: NextRequest) {
  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error('Flutterwave secret key not configured');
      return NextResponse.json(
        { success: false, message: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    // Return cached data if fresh
    if (billersCache && Date.now() - billersCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, billers: billersCache.data });
    }

    const headers = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Fetch billers in the UTILITYBILLS category for Nigeria
    const billersRes = await fetch(
      `${FLUTTERWAVE_BASE_URL}/billers?category=UTILITYBILLS&country=NG`,
      { method: 'GET', headers }
    );
    const billersJson = await billersRes.json();

    if (billersJson.status !== 'success' || !Array.isArray(billersJson.data)) {
      console.error('Failed to fetch billers:', JSON.stringify(billersJson));
      return NextResponse.json(
        { success: false, message: 'Unable to fetch electricity providers.' },
        { status: 502 }
      );
    }

    // Step 2: For each biller, fetch its items to get prepaid/postpaid item_codes
    const billers: Array<{
      id: string;
      name: string;
      shortName: string;
      billerCode: string;
      items: Array<{ itemCode: string; name: string; amount: number; fee: number }>;
    }> = [];

    for (const biller of billersJson.data) {
      try {
        const itemsRes = await fetch(
          `${FLUTTERWAVE_BASE_URL}/billers/${biller.biller_code}/items`,
          { method: 'GET', headers }
        );
        const itemsJson = await itemsRes.json();

        if (itemsJson.status === 'success' && Array.isArray(itemsJson.data)) {
          billers.push({
            id: biller.biller_code,
            name: biller.name,
            shortName: biller.short_name || biller.name,
            billerCode: biller.biller_code,
            items: itemsJson.data.map((item: any) => ({
              itemCode: item.item_code,
              name: item.name || item.short_name || '',
              amount: item.amount || 0,
              fee: item.fee || 0,
            })),
          });
        }
      } catch (itemErr) {
        console.warn(`Failed to fetch items for ${biller.biller_code}:`, itemErr);
        // Skip this biller but continue with others
      }
    }

    // Cache the result
    billersCache = { data: billers, timestamp: Date.now() };

    console.log(`Fetched ${billers.length} electricity billers from Flutterwave`);

    return NextResponse.json({ success: true, billers });
  } catch (error: any) {
    console.error('Billers fetch error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Failed to load electricity providers. Please try again.' },
      { status: 500 }
    );
  }
}
