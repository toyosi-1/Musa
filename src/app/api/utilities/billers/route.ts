import { NextRequest, NextResponse } from 'next/server';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

// In-memory cache to avoid hitting Flutterwave on every request
let billersCache: { data: any; timestamp: number; source: 'live' | 'fallback' } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for live data
const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for fallback data

// Allow other routes to invalidate stale cache
export function invalidateBillersCache() {
  billersCache = null;
}

// Hardcoded fallback billers — Nigerian DisCos are stable and well-known.
// Used when Flutterwave API is unreachable or returns an error.
// Fallback billers with REAL biller_codes and item_codes from Flutterwave live API.
const FALLBACK_BILLERS = [
  {
    id: 'BIL113',
    name: 'Ikeja Electric (IKEDC)',
    shortName: 'IKEDC',
    billerCode: 'BIL113',
    items: [
      { itemCode: 'UB159', name: 'IKEDC Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB160', name: 'IKEDC Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL112',
    name: 'Eko Electric (EKEDC)',
    shortName: 'EKEDC',
    billerCode: 'BIL112',
    items: [
      { itemCode: 'UB157', name: 'EKEDC Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB158', name: 'EKEDC Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL204',
    name: 'Abuja Electric (AEDC)',
    shortName: 'AEDC',
    billerCode: 'BIL204',
    items: [
      { itemCode: 'UB584', name: 'ABUJA DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB585', name: 'ABUJA DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL120',
    name: 'Kano Electric (KEDCO)',
    shortName: 'KEDCO',
    billerCode: 'BIL120',
    items: [
      { itemCode: 'UB169', name: 'KANO DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB170', name: 'KANO DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL116',
    name: 'Port Harcourt Electric (PHEDC)',
    shortName: 'PHEDC',
    billerCode: 'BIL116',
    items: [
      { itemCode: 'UB633', name: 'PHC DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB165', name: 'PHC DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL215',
    name: 'Jos Electric (JED)',
    shortName: 'JED',
    billerCode: 'BIL215',
    items: [
      { itemCode: 'UB676', name: 'JOS DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB677', name: 'JOS DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL114',
    name: 'Ibadan Electric (IBEDC)',
    shortName: 'IBEDC',
    billerCode: 'BIL114',
    items: [
      { itemCode: 'UB161', name: 'IBADAN DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB162', name: 'IBADAN DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL119',
    name: 'Kaduna Electric (KAEDCO)',
    shortName: 'KAEDCO',
    billerCode: 'BIL119',
    items: [
      { itemCode: 'UB602', name: 'Kaduna Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB603', name: 'Kaduna Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL115',
    name: 'Enugu Electric (EEDC)',
    shortName: 'EEDC',
    billerCode: 'BIL115',
    items: [
      { itemCode: 'UB163', name: 'ENUGU DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB164', name: 'ENUGU DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL117',
    name: 'Benin Electric (BEDC)',
    shortName: 'BEDC',
    billerCode: 'BIL117',
    items: [
      { itemCode: 'UB167', name: 'BENIN DISCO Prepaid', amount: 0, fee: 100 },
      { itemCode: 'UB166', name: 'BENIN DISCO Postpaid', amount: 0, fee: 100 },
    ],
  },
  {
    id: 'BIL118',
    name: 'Yola Electric (YEDC)',
    shortName: 'YEDC',
    billerCode: 'BIL118',
    items: [
      { itemCode: 'UB168', name: 'YOLA DISCO Topup', amount: 0, fee: 100 },
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
    // Return cached data if fresh (use shorter TTL for fallback data)
    if (billersCache) {
      const ttl = billersCache.source === 'live' ? CACHE_TTL_MS : FALLBACK_CACHE_TTL_MS;
      if (Date.now() - billersCache.timestamp < ttl) {
        return NextResponse.json({ success: true, billers: billersCache.data, source: billersCache.source });
      }
    }

    // If no API key, use fallback billers immediately
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.warn('Flutterwave secret key not configured — using fallback billers');
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now(), source: 'fallback' };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS, source: 'fallback' });
    }

    const headers = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };

    // Fetch all electricity bill items in one call using bill-categories
    let categoriesJson: any;
    try {
      const res = await fetch(
        `${FLUTTERWAVE_BASE_URL}/bill-categories?power=1&country=NG`,
        { method: 'GET', headers }
      );
      categoriesJson = await res.json();
    } catch (fetchError) {
      console.error('Flutterwave API unreachable, using fallback billers:', fetchError);
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now(), source: 'fallback' };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS, source: 'fallback' });
    }

    if (categoriesJson.status !== 'success' || !Array.isArray(categoriesJson.data)) {
      console.error('Flutterwave API error, using fallback billers:', JSON.stringify(categoriesJson));
      billersCache = { data: FALLBACK_BILLERS, timestamp: Date.now(), source: 'fallback' };
      return NextResponse.json({ success: true, billers: FALLBACK_BILLERS, source: 'fallback' });
    }

    // Group flat item list by biller_code
    const billerMap = new Map<string, {
      id: string;
      name: string;
      shortName: string;
      billerCode: string;
      items: Array<{ itemCode: string; name: string; amount: number; fee: number }>;
    }>();

    for (const item of categoriesJson.data) {
      const code = item.biller_code;
      if (!billerMap.has(code)) {
        billerMap.set(code, {
          id: code,
          name: item.short_name || item.name || code,
          shortName: item.short_name || item.biller_name || code,
          billerCode: code,
          items: [],
        });
      }
      billerMap.get(code)!.items.push({
        itemCode: item.item_code,
        name: item.biller_name || item.name || '',
        amount: item.amount || 0,
        fee: item.fee || 0,
      });
    }

    const billers = Array.from(billerMap.values());

    // Cache the result
    billersCache = { data: billers, timestamp: Date.now(), source: 'live' };

    console.log(`Fetched ${billers.length} electricity billers from Flutterwave`);

    return NextResponse.json({ success: true, billers, source: 'live' });
  } catch (error: any) {
    console.error('Billers fetch error, using fallback billers:', error?.message || error);
    return NextResponse.json({ success: true, billers: FALLBACK_BILLERS, source: 'fallback' });
  }
}
