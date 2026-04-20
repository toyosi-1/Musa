import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '@/lib/firebase';
import type { Estate } from '@/types/user';

/**
 * One-shot fetch of an estate record. Colocated with the guard dashboard
 * since that's the only current caller; promote to `src/hooks/` if reused.
 */
export function useEstate(estateId: string | undefined): Estate | null {
  const [estate, setEstate] = useState<Estate | null>(null);

  useEffect(() => {
    if (!estateId) return;
    let cancelled = false;

    (async () => {
      try {
        const db = await getFirebaseDatabase();
        const snapshot = await get(ref(db, `estates/${estateId}`));
        if (cancelled || !snapshot.exists()) return;
        setEstate(snapshot.val() as Estate);
      } catch (err) {
        console.error('Error loading estate:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [estateId]);

  return estate;
}
