import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';
import { mapOccupation, normalizePhone, shouldSkipVendor } from '@/utils/vendorMapping';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/vendors/seed
 *
 * Seeds vendor data from the COG Contact spreadsheet into Firebase.
 * Body: { estateId: string, adminUid: string, vendors: Array<{ name, occupation, designation, company, contact }> }
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 2 bulk imports per hour per IP.
    // Seeding is an admin-only one-off; this just caps damage on accidental repeats.
    const rl = rateLimit({
      key: `vendors-seed:${getClientIp(request)}`,
      limit: 2,
      windowMs: 60 * 60_000,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const { estateId, vendors: rawVendors, adminUid } = await request.json();

    if (!estateId || !Array.isArray(rawVendors) || rawVendors.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing estateId or vendors array' }, { status: 400 });
    }

    const db = getAdminDatabase();
    const now = Date.now();
    let added = 0;

    for (const v of rawVendors) {
      if (shouldSkipVendor(v.name)) continue;
      const name = (v.name || '').trim();
      const phone = normalizePhone(v.contact || '');

      const serviceTypes = mapOccupation(v.occupation || '', v.designation || '');
      const company = (v.company || '').trim();
      const designation = (v.designation || '').trim();

      const vendorRef = db.ref(`vendors/${estateId}`).push();
      const vendor = {
        id: vendorRef.key,
        estateId,
        name,
        phone,
        serviceTypes,
        isAvailable: true,
        addedBy: adminUid || 'seed-script',
        addedAt: now,
        businessName: company !== 'NIL' && company !== 'Nil' && company ? company : '',
        notes: designation || '',
        licenseStatus: 'none',
        coverageAreas: [],
      };

      await vendorRef.set(vendor);
      added++;
    }

    return NextResponse.json({ success: true, message: `Added ${added} vendors`, count: added });
  } catch (error: any) {
    console.error('[VendorSeed] Error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Unknown error' }, { status: 500 });
  }
}
