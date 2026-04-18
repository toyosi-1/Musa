import { ref, get, set, update } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';
import type { User } from '@/types/user';

/**
 * User admin operations extracted from AuthContext.
 *
 * These are pure service calls — they do not need React state and so do not
 * belong inside a React context. They are invoked by the AuthContext provider
 * methods and by admin pages directly.
 */

/** Fetch a user profile by uid (no caching — caller decides what to cache). */
export async function fetchUserProfile(uid: string): Promise<User | null> {
  const db = await getFirebaseDatabase();
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? (snapshot.val() as User) : null;
}

/** Approve a single pending user and send a notification email. */
export async function approveUser(uid: string, adminUid: string): Promise<void> {
  const db = await getFirebaseDatabase();
  const userRef = ref(db, `users/${uid}`);
  const pendingUserRef = ref(db, `pendingUsers/${uid}`);

  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val() as User | null;

  await update(userRef, {
    status: 'approved',
    approvedBy: adminUid,
    approvedAt: Date.now(),
  });
  await set(pendingUserRef, null);

  // Non-blocking email notification
  if (userData) {
    sendApprovalEmailSafe(userData, adminUid).catch(() => {
      /* already logged */
    });
  }
  console.log(`User ${uid} approved by admin ${adminUid}`);
}

/** Reject a single pending user with a reason and send a notification email. */
export async function rejectUser(uid: string, adminUid: string, reason: string): Promise<void> {
  const db = await getFirebaseDatabase();
  const userRef = ref(db, `users/${uid}`);
  const pendingUserRef = ref(db, `pendingUsers/${uid}`);

  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val() as User | null;

  await update(userRef, {
    status: 'rejected',
    rejectedBy: adminUid,
    rejectionReason: reason,
    rejectedAt: Date.now(),
  });
  await set(pendingUserRef, null);

  if (userData) {
    sendRejectionEmailSafe(userData, adminUid, reason).catch(() => {
      /* already logged */
    });
  }
  console.log(`User ${uid} rejected by admin ${adminUid}. Reason: ${reason}`);
}

/** Return every user currently in the pendingUsers list. */
export async function getPendingUsers(): Promise<User[]> {
  const db = await getFirebaseDatabase();
  const snapshot = await get(ref(db, 'pendingUsers'));
  if (!snapshot.exists()) return [];

  const pendingIds = Object.keys(snapshot.val());
  const users: User[] = [];
  for (const uid of pendingIds) {
    const user = await fetchUserProfile(uid);
    if (user) users.push(user);
  }
  return users;
}

/** Approve multiple users in one DB transaction. Emails not sent (TODO: batch email). */
export async function batchApproveUsers(uids: string[], adminUid: string): Promise<void> {
  if (!uids.length) return;
  const db = await getFirebaseDatabase();
  const updates: Record<string, unknown> = {};
  const timestamp = Date.now();

  for (const uid of uids) {
    const snapshot = await get(ref(db, `users/${uid}`));
    if (!snapshot.exists()) continue;
    updates[`users/${uid}/status`] = 'approved';
    updates[`users/${uid}/approvedBy`] = adminUid;
    updates[`users/${uid}/approvedAt`] = timestamp;
    updates[`pendingUsers/${uid}`] = null;
  }

  await update(ref(db), updates);
  console.log(`Batch approved ${uids.length} users by admin ${adminUid}`);
}

/** Reject multiple users in one DB transaction. Emails not sent (TODO: batch email). */
export async function batchRejectUsers(
  uids: string[],
  adminUid: string,
  reason: string,
): Promise<void> {
  if (!uids.length) return;
  const db = await getFirebaseDatabase();
  const updates: Record<string, unknown> = {};
  const timestamp = Date.now();

  for (const uid of uids) {
    const snapshot = await get(ref(db, `users/${uid}`));
    if (!snapshot.exists()) continue;
    updates[`users/${uid}/status`] = 'rejected';
    updates[`users/${uid}/rejectedBy`] = adminUid;
    updates[`users/${uid}/rejectedAt`] = timestamp;
    updates[`users/${uid}/rejectionReason`] = reason;
    updates[`pendingUsers/${uid}`] = null;
  }

  await update(ref(db), updates);
  console.log(`Batch rejected ${uids.length} users by admin ${adminUid}`);
}

/* ---------------- email helpers (private) ---------------- */

async function sendApprovalEmailSafe(user: User, adminUid: string): Promise<void> {
  try {
    const db = await getFirebaseDatabase();
    const adminSnap = await get(ref(db, `users/${adminUid}`));
    const adminData = adminSnap.val() as User | null;

    const { sendApprovalNotificationEmail } = await import('@/services/smtpEmailService');
    const ok = await sendApprovalNotificationEmail({
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      approvedBy: adminData?.displayName || adminData?.email || 'Administrator',
      loginUrl: typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : '',
    });
    console.log(ok ? `✅ Approval email sent to ${user.email}` : `⚠️ Approval email failed: ${user.email}`);
  } catch (err) {
    console.error('❌ Approval email error:', err);
  }
}

async function sendRejectionEmailSafe(user: User, adminUid: string, reason: string): Promise<void> {
  try {
    const db = await getFirebaseDatabase();
    const adminSnap = await get(ref(db, `users/${adminUid}`));
    const adminData = adminSnap.val() as User | null;

    const { sendRejectionNotificationEmail } = await import('@/services/smtpEmailService');
    const ok = await sendRejectionNotificationEmail({
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      rejectedBy: adminData?.displayName || adminData?.email || 'Administrator',
      reason: reason || 'Your information could not be verified',
    });
    console.log(ok ? `✅ Rejection email sent to ${user.email}` : `⚠️ Rejection email failed: ${user.email}`);
  } catch (err) {
    console.error('❌ Rejection email error:', err);
  }
}
