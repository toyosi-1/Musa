import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

/**
 * POST /api/admin/fix-hoh
 * One-time backfill: sets isHouseholdHead=true on every approved resident
 * that doesn't already have the flag set.
 * Protected by ADMIN_SECRET header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDatabase();
    const usersSnap = await db.ref('users').once('value');

    if (!usersSnap.exists()) {
      return NextResponse.json({ message: 'No users found', updated: 0 });
    }

    const updates: Record<string, boolean> = {};
    let updated = 0;
    let skipped = 0;

    usersSnap.forEach((child) => {
      const user = child.val();
      const uid = child.key;

      // Only backfill approved residents missing the flag
      if (
        user.role === 'resident' &&
        user.status === 'approved' &&
        user.isHouseholdHead === undefined
      ) {
        updates[`users/${uid}/isHouseholdHead`] = true;
        updated++;
      } else {
        skipped++;
      }
    });

    if (updated > 0) {
      await db.ref().update(updates);
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      message: `Set isHouseholdHead=true on ${updated} resident(s).`,
    });
  } catch (err: any) {
    console.error('[fix-hoh]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
