import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

/**
 * POST /api/vendors/seed
 * 
 * Seeds vendor data from the COG Contact spreadsheet into Firebase.
 * Body: { estateId: string, adminUid: string, vendors: Array<{ name, occupation, designation, company, contact }> }
 */

// Map spreadsheet occupations to ServiceType(s)
function mapOccupation(occupation: string, designation: string): string[] {
  const occ = (occupation || '').toLowerCase();
  const des = (designation || '').toLowerCase();
  const combined = `${occ} ${des}`;

  const types: string[] = [];

  if (combined.includes('electric') || combined.includes('electrician') || combined.includes('generator') || combined.includes('ups') || combined.includes('fire system')) types.push('electrician');
  if (combined.includes('plumb') || combined.includes('pool') || combined.includes('floor') || combined.includes('tiles')) types.push('plumber');
  if (combined.includes('civil') || combined.includes('scaffold') || combined.includes('wood') || combined.includes('construction') || combined.includes('carpenter') || combined.includes('quantity') || combined.includes('interior') || combined.includes('fabricat')) types.push('carpenter');
  if (combined.includes('paint') || combined.includes('scroeding')) types.push('painter');
  if (combined.includes('garden') || combined.includes('landscap')) types.push('gardener');
  if (combined.includes('security') || combined.includes('guard')) types.push('security');
  if (combined.includes('clean') || combined.includes('janitorial') || combined.includes('waste') || combined.includes('house clean')) types.push('cleaner');
  if (combined.includes('it ') || combined.includes('dstv') || combined.includes('tech') || combined.includes('computer') || combined.includes('gym') || combined.includes('kitchen')) types.push('it_support');
  if (combined.includes('contract') || combined.includes('general') || combined.includes('supplier') || combined.includes('diesel') || combined.includes('dealer') || combined.includes('vehicle') || combined.includes('blind') || combined.includes('glass') || combined.includes('biodigester') || combined.includes('extractor') || combined.includes('m & e') || combined.includes('mechanic')) types.push('other');

  return types.length > 0 ? types : ['other'];
}

export async function POST(request: NextRequest) {
  try {
    const { estateId, vendors: rawVendors, adminUid } = await request.json();

    if (!estateId || !Array.isArray(rawVendors) || rawVendors.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing estateId or vendors array' }, { status: 400 });
    }

    const db = getAdminDatabase();
    const now = Date.now();
    let added = 0;

    for (const v of rawVendors) {
      const name = (v.name || '').trim();
      const phone = (v.contact || '').split('/')[0].trim().replace(/\s/g, '');
      if (!name || name === 'Nil') continue;

      const serviceTypes = mapOccupation(v.occupation || '', v.designation || '');
      const company = (v.company || '').trim();
      const designation = (v.designation || '').trim();

      const vendorRef = db.ref(`vendors/${estateId}`).push();
      const vendor = {
        id: vendorRef.key,
        estateId,
        name,
        phone: phone || 'N/A',
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
