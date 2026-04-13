'use client';

import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { AccessCode, Household } from '@/types/user';

// ─── Storage Keys ───
const KEYS = {
  codes: (estateId: string) => `musa_guard_codes_${estateId}`,
  households: (estateId: string) => `musa_guard_households_${estateId}`,
  lastSync: (estateId: string) => `musa_guard_lastSync_${estateId}`,
  pendingEntries: 'musa_guard_pendingEntries',
};

// ─── Types ───
export interface OfflineAccessCode {
  id: string;
  code: string;
  isActive: boolean;
  expiresAt?: number;
  householdId: string;
  estateId: string;
  description?: string;
  userId: string;
}

export interface OfflineHousehold {
  id: string;
  name: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface PendingEntry {
  id: string;
  timestamp: number;
  code: string;
  isValid: boolean;
  message?: string;
  guardId: string;
  householdId?: string;
  destinationAddress?: string;
  accessCodeId?: string;
  synced: boolean;
}

export interface OfflineVerifyResult {
  isValid: boolean;
  message?: string;
  household?: OfflineHousehold;
  destinationAddress?: string;
  accessCodeId?: string;
  estateId?: string;
  isOfflineResult: boolean;
}

// ─── Sync: Download estate codes to local storage ───

/**
 * Sync all active access codes for the guard's estate to localStorage.
 * Call this on dashboard load and periodically.
 * Returns the number of codes synced.
 */
export async function syncEstateCodes(estateId: string): Promise<number> {
  if (!estateId) return 0;

  try {
    const db = await getFirebaseDatabase();

    // 1. Get all code IDs for this estate
    const estateCodesRef = ref(db, `accessCodesByEstate/${estateId}`);
    const estateSnap = await get(estateCodesRef);
    if (!estateSnap.exists()) {
      saveCodeStore(estateId, {});
      saveHouseholdStore(estateId, {});
      localStorage.setItem(KEYS.lastSync(estateId), Date.now().toString());
      return 0;
    }

    const codeIds = Object.keys(estateSnap.val());
    const codeMap: Record<string, OfflineAccessCode> = {};
    const householdIds = new Set<string>();

    // 2. Fetch each access code
    for (const codeId of codeIds) {
      try {
        const codeRef = ref(db, `accessCodes/${codeId}`);
        const codeSnap = await get(codeRef);
        if (codeSnap.exists()) {
          const ac = codeSnap.val() as AccessCode;
          // Only cache active, non-expired codes
          if (ac.isActive && (!ac.expiresAt || ac.expiresAt > Date.now())) {
            codeMap[ac.code] = {
              id: ac.id || codeId,
              code: ac.code,
              isActive: ac.isActive,
              expiresAt: ac.expiresAt,
              householdId: ac.householdId,
              estateId: ac.estateId || estateId,
              description: ac.description,
              userId: ac.userId,
            };
            if (ac.householdId) householdIds.add(ac.householdId);
          }
        }
      } catch (e) {
        console.warn(`[OfflineGuard] Failed to fetch code ${codeId}:`, e);
      }
    }

    // 3. Fetch household data for destination addresses
    const hhMap: Record<string, OfflineHousehold> = {};
    for (const hhId of Array.from(householdIds)) {
      try {
        const hhRef = ref(db, `households/${hhId}`);
        const hhSnap = await get(hhRef);
        if (hhSnap.exists()) {
          const hh = hhSnap.val();
          hhMap[hhId] = {
            id: hhId,
            name: hh.name || '',
            address: hh.address,
            addressLine2: hh.addressLine2,
            city: hh.city,
            state: hh.state,
            postalCode: hh.postalCode,
            country: hh.country,
          };
        }
      } catch (e) {
        console.warn(`[OfflineGuard] Failed to fetch household ${hhId}:`, e);
      }
    }

    // 4. Save to localStorage
    saveCodeStore(estateId, codeMap);
    saveHouseholdStore(estateId, hhMap);
    localStorage.setItem(KEYS.lastSync(estateId), Date.now().toString());

    console.log(`[OfflineGuard] Synced ${Object.keys(codeMap).length} codes, ${Object.keys(hhMap).length} households`);
    return Object.keys(codeMap).length;
  } catch (error) {
    console.error('[OfflineGuard] Sync failed:', error);
    return -1; // indicates failure
  }
}

/**
 * Get the last sync timestamp for an estate.
 */
export function getLastSyncTime(estateId: string): number | null {
  try {
    const ts = localStorage.getItem(KEYS.lastSync(estateId));
    return ts ? parseInt(ts, 10) : null;
  } catch {
    return null;
  }
}

// ─── Offline Verification ───

/**
 * Verify an access code using only the local offline store.
 * No network required.
 */
export function verifyCodeOffline(code: string, estateId: string): OfflineVerifyResult {
  if (!code || !code.trim()) {
    return { isValid: false, message: 'Please provide an access code', isOfflineResult: true };
  }

  const codeMap = getCodeStore(estateId);
  if (!codeMap) {
    return {
      isValid: false,
      message: 'Offline data not available. Please sync when you have network.',
      isOfflineResult: true,
    };
  }

  const ac = codeMap[code.trim()];
  if (!ac) {
    return { isValid: false, message: 'Invalid access code', isOfflineResult: true };
  }

  // Check expiry
  if (ac.expiresAt && ac.expiresAt < Date.now()) {
    return { isValid: false, message: 'Access code has expired', isOfflineResult: true };
  }

  // Check active
  if (!ac.isActive) {
    return { isValid: false, message: 'Access code is inactive', isOfflineResult: true };
  }

  // Check estate boundary
  if (ac.estateId !== estateId) {
    return { isValid: false, message: 'Code invalid', isOfflineResult: true };
  }

  // Lookup household for destination address
  const hhMap = getHouseholdStore(estateId);
  const household = hhMap ? hhMap[ac.householdId] : undefined;
  let destinationAddress = '';

  if (household) {
    const parts: string[] = [];
    if (household.address) parts.push(household.address);
    if (household.addressLine2) parts.push(household.addressLine2);
    const cityState: string[] = [];
    if (household.city) cityState.push(household.city);
    if (household.state) cityState.push(household.state);
    if (household.postalCode) cityState.push(household.postalCode);
    if (cityState.length) parts.push(cityState.join(', '));
    if (household.country) parts.push(household.country);
    destinationAddress = parts.join('\n');
  }

  return {
    isValid: true,
    message: 'Access granted (offline)',
    household,
    destinationAddress,
    accessCodeId: ac.id,
    estateId: ac.estateId,
    isOfflineResult: true,
  };
}

// ─── Pending Entry Queue (for when offline) ───

/**
 * Queue a verification entry to be synced later when online.
 */
export function queuePendingEntry(entry: Omit<PendingEntry, 'id' | 'synced'>): void {
  try {
    const pending = getPendingEntries();

    // Deduplicate: skip if same code+guard was queued in the last 30 seconds
    const isDuplicate = pending.some(
      e => e.code === entry.code && e.guardId === entry.guardId && !e.synced &&
           Math.abs(e.timestamp - entry.timestamp) < 30_000
    );
    if (isDuplicate) {
      console.log(`[OfflineGuard] Skipping duplicate entry for code ${entry.code}`);
      return;
    }

    const newEntry: PendingEntry = {
      ...entry,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      synced: false,
    };
    pending.push(newEntry);
    localStorage.setItem(KEYS.pendingEntries, JSON.stringify(pending));
    console.log(`[OfflineGuard] Queued entry ${newEntry.id}, total pending: ${pending.length}`);
  } catch (e) {
    console.warn('[OfflineGuard] Failed to queue entry:', e);
  }
}

/**
 * Get all pending (unsynced) entries.
 */
export function getPendingEntries(): PendingEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.pendingEntries);
    if (!raw) return [];
    return JSON.parse(raw) as PendingEntry[];
  } catch {
    return [];
  }
}

/**
 * Sync all pending entries to Firebase.
 * Returns the number of entries successfully synced.
 */
let _syncLock = false;

export async function syncPendingEntries(guardId: string): Promise<number> {
  // Prevent concurrent syncs that cause duplicates
  if (_syncLock) {
    console.log('[OfflineGuard] Sync already in progress, skipping');
    return 0;
  }

  const pending = getPendingEntries().filter(e => !e.synced);
  if (pending.length === 0) return 0;

  _syncLock = true;
  let synced = 0;

  try {
    // Mark all as synced in localStorage FIRST to prevent re-processing
    // If sync fails, we restore them
    const allEntries = getPendingEntries();
    const syncingIds = new Set(pending.map(e => e.id));
    allEntries.forEach(e => { if (syncingIds.has(e.id)) e.synced = true; });
    localStorage.setItem(KEYS.pendingEntries, JSON.stringify(allEntries));

    const { logVerificationAttempt } = await import('@/services/guardActivityService');
    const failedIds: string[] = [];

    for (const entry of pending) {
      try {
        await logVerificationAttempt(guardId, {
          code: entry.code,
          isValid: entry.isValid,
          message: entry.message ? `${entry.message} [synced from offline]` : undefined,
          householdId: entry.householdId,
          destinationAddress: entry.destinationAddress,
          accessCodeId: entry.accessCodeId,
        });
        synced++;
      } catch (e) {
        console.warn(`[OfflineGuard] Failed to sync entry ${entry.id}:`, e);
        failedIds.push(entry.id);
        break; // Stop on first failure — likely still offline
      }
    }

    // Restore failed entries as unsynced, remove successful ones
    if (failedIds.length > 0) {
      const updated = getPendingEntries();
      updated.forEach(e => { if (failedIds.includes(e.id)) e.synced = false; });
      localStorage.setItem(KEYS.pendingEntries, JSON.stringify(updated.filter(e => !e.synced || failedIds.includes(e.id))));
    } else {
      // All synced — clear everything
      const remaining = getPendingEntries().filter(e => !e.synced && !syncingIds.has(e.id));
      localStorage.setItem(KEYS.pendingEntries, JSON.stringify(remaining));
    }

    console.log(`[OfflineGuard] Synced ${synced}/${pending.length} entries`);
  } catch (e) {
    console.error('[OfflineGuard] Sync entries failed:', e);
  } finally {
    _syncLock = false;
  }

  return synced;
}

/**
 * Get the count of unsynced pending entries.
 */
export function getPendingCount(): number {
  return getPendingEntries().filter(e => !e.synced).length;
}

// ─── Internal: localStorage helpers ───

function saveCodeStore(estateId: string, map: Record<string, OfflineAccessCode>): void {
  try {
    localStorage.setItem(KEYS.codes(estateId), JSON.stringify(map));
  } catch (e) {
    console.warn('[OfflineGuard] Failed to save code store:', e);
  }
}

function getCodeStore(estateId: string): Record<string, OfflineAccessCode> | null {
  try {
    const raw = localStorage.getItem(KEYS.codes(estateId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveHouseholdStore(estateId: string, map: Record<string, OfflineHousehold>): void {
  try {
    localStorage.setItem(KEYS.households(estateId), JSON.stringify(map));
  } catch (e) {
    console.warn('[OfflineGuard] Failed to save household store:', e);
  }
}

function getHouseholdStore(estateId: string): Record<string, OfflineHousehold> | null {
  try {
    const raw = localStorage.getItem(KEYS.households(estateId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
