import { useEffect, useState } from 'react';
import { getFirebaseDatabase, ref, get } from '@/lib/firebase';
import type { Estate } from '@/types/estate';

/**
 * Fetches the list of estates once, after Firebase is ready. Used by the
 * registration form to populate the estate picker.
 */
export function useEstatesList(enabled: boolean): Estate[] {
  const [estates, setEstates] = useState<Estate[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const db = await getFirebaseDatabase();
        const snapshot = await get(ref(db, 'estates'));
        if (cancelled || !snapshot.exists()) return;
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        })) as Estate[];
        setEstates(list);
      } catch (err) {
        console.error('Error fetching estates:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return estates;
}
