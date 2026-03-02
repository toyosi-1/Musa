import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// In-memory cache to avoid hitting Flutterwave on every request
let billersCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Hardcoded fallback billers — Nigerian DisCos are stable and well-known.
// Used when Flutterwave API is unreachable or returns an error.
const FALLBACK_BILLERS = [
  {
    id: 'BIL099',
    name: 'Ikeja Electric',
    shortName: 'IKEDC',
    billerCode: 'BIL099',
    items: [
      { itemCode: 'UB159', name: 'Ikeja Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB160', name: 'Ikeja Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL100',
    name: 'Eko Electricity',
    shortName: 'EKEDC',
    billerCode: 'BIL100',
    items: [
      { itemCode: 'UB161', name: 'Eko Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB162', name: 'Eko Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL102',
    name: 'Abuja Electricity',
    shortName: 'AEDC',
    billerCode: 'BIL102',
    items: [
      { itemCode: 'UB165', name: 'Abuja Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB166', name: 'Abuja Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL103',
    name: 'Kano Electricity',
    shortName: 'KEDCO',
    billerCode: 'BIL103',
    items: [
      { itemCode: 'UB167', name: 'Kano Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB168', name: 'Kano Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL104',
    name: 'Port Harcourt Electricity',
    shortName: 'PHEDC',
    billerCode: 'BIL104',
    items: [
      { itemCode: 'UB169', name: 'Port Harcourt Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB170', name: 'Port Harcourt Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL106',
    name: 'Jos Electricity',
    shortName: 'JED',
    billerCode: 'BIL106',
    items: [
      { itemCode: 'UB173', name: 'Jos Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB174', name: 'Jos Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL110',
    name: 'Ibadan Electricity',
    shortName: 'IBEDC',
    billerCode: 'BIL110',
    items: [
      { itemCode: 'UB181', name: 'Ibadan Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB182', name: 'Ibadan Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL112',
    name: 'Kaduna Electricity',
    shortName: 'KAEDCO',
    billerCode: 'BIL112',
    items: [
      { itemCode: 'UB185', name: 'Kaduna Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB186', name: 'Kaduna Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL113',
    name: 'Enugu Electricity',
    shortName: 'EEDC',
    billerCode: 'BIL113',
    items: [
      { itemCode: 'UB187', name: 'Enugu Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB188', name: 'Enugu Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL114',
    name: 'Benin Electricity',
    shortName: 'BEDC',
    billerCode: 'BIL114',
    items: [
      { itemCode: 'UB189', name: 'Benin Electric Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB190', name: 'Benin Electric Postpaid', amount: 0, fee: 100 },
    ],
  },
];

/**
 * GET /api/utilities/billers
 *
 * Fetches electricity billers and their item_codes from Flutterwave v3 dynamically.
 * Returns a list of DisCos with their biller_code and prepaid/postpaid item_codes.
 */
export async function GET(_request: NextRequest) {
  try {
    // Return cached data if fresh
    if (billersCache && Date.now() - billersCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, billers: billersCache.data });
    }

    // If no API key, use fallback billers immediately
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.warn('Flutterwave secret key not configured — using fallback billers');
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now() };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS });
    }

    const headers = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Fetch billers in the UTILITYBILLS category for Nigeria
    let billersJson: any;
    try {
      const billersRes = await fetch(
        `${FLUTTERWAVE_BASE_URL}/billers?category=UTILITYBILLS&country=NG`,
        { method: 'GET', headers }
      );
      billersJson = await billersRes.json();
    } catch (fetchError) {
      console.error('Flutterwave API unreachable, using fallback billers:', fetchError);
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now() };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS });
    }

    if (billersJson.status !== 'success' || !Array.isArray(billersJson.data)) {
      console.error('Flutterwave API error, using fallback billers:', JSON.stringify(billersJson));
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now() };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS });
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
    console.error('Billers fetch error, using fallback billers:', error?.message || error);
    return NextResponse.json({ success: true, billers: FALLBACK_BILLERS });
  }
}
