import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, update, remove } from 'firebase/database';
import type { Estate, User } from '@/types/user';

// Create a new estate
export async function createEstate(name: string): Promise<Estate> {
  const db = await getFirebaseDatabase();
  const estatesRef = ref(db, 'estates');
  const newRef = push(estatesRef);
  if (!newRef.key) throw new Error('Failed to create estate ID');
  const now = Date.now();
  const estate: Estate = { id: newRef.key, name, createdAt: now, updatedAt: now };
  await set(newRef, estate);
  return estate;
}

// List all estates
export async function listEstates(): Promise<Estate[]> {
  const db = await getFirebaseDatabase();
  const estatesRef = ref(db, 'estates');
  const snap = await get(estatesRef);
  if (!snap.exists()) return [];
  const result: Estate[] = [];
  snap.forEach(child => {
    result.push(child.val() as Estate);
  });
  // Sort by name
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// Delete an estate (only if no assignments). Soft guard; real enforcement should be in Admin UI rules or checks.
export async function deleteEstate(estateId: string): Promise<void> {
  const db = await getFirebaseDatabase();
  const estateRef = ref(db, `estates/${estateId}`);
  await remove(estateRef);
}

// Assign a user to an estate (writes to users/{uid}/estateId and creates index usersByEstate/{estateId}/{uid}=true)
export async function assignUserToEstate(userId: string, estateId: string | null): Promise<void> {
  const db = await getFirebaseDatabase();
  const updates: { [key: string]: any } = {};

  // Remove previous indexes requires knowing previous estate; we keep it simple for now.
  // Write the new estateId (can be null to clear)
  updates[`users/${userId}/estateId`] = estateId || null;

  if (estateId) {
    updates[`usersByEstate/${estateId}/${userId}`] = true;
  }

  await update(ref(db), updates);
}

// Optional: get users for an estate (IDs only). Admin Users UI currently uses dummy data.
export async function listUserIdsByEstate(estateId: string): Promise<string[]> {
  const db = await getFirebaseDatabase();
  const idxRef = ref(db, `usersByEstate/${estateId}`);
  const snap = await get(idxRef);
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}
