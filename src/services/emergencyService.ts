import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, push, set, get, update, query, orderByChild, equalTo, onValue, off, DataSnapshot } from 'firebase/database';
import { EmergencyAlert, EmergencyType } from '@/types/user';

/**
 * Trigger a new emergency alert for the estate
 */
export const triggerEmergencyAlert = async (data: {
  estateId: string;
  triggeredBy: string;
  triggeredByName: string;
  householdId?: string;
  householdName?: string;
  type: EmergencyType;
  description?: string;
}): Promise<EmergencyAlert> => {
  const db = await getFirebaseDatabase();
  const alertsRef = ref(db, `emergencyAlerts/${data.estateId}`);
  const newAlertRef = push(alertsRef);

  const alert: EmergencyAlert = {
    id: newAlertRef.key!,
    estateId: data.estateId,
    triggeredBy: data.triggeredBy,
    triggeredByName: data.triggeredByName,
    householdId: data.householdId || '',
    householdName: data.householdName || '',
    type: data.type,
    description: data.description || '',
    status: 'active',
    createdAt: Date.now(),
  };

  await set(newAlertRef, alert);
  console.log('🚨 Emergency alert triggered:', alert.id);

  // Log to activity feed
  try {
    const { logActivity } = await import('./activityService');
    await logActivity({
      type: 'emergency_alert',
      description: `🚨 Emergency alert: ${data.type}${data.description ? ' — ' + data.description.slice(0, 80) : ''}`,
      timestamp: alert.createdAt,
      userId: data.triggeredBy,
      estateId: data.estateId,
      householdId: data.householdId,
      metadata: {
        emergencyType: data.type,
        householdName: data.householdName,
        memberName: data.triggeredByName,
      },
    });
  } catch (e) {
    console.warn('[emergencyService] Activity log failed (non-fatal):', e);
  }

  // Send notifications to all guards and estate admins in this estate
  try {
    const usersRef = ref(db, 'users');
    const usersSnap = await get(usersRef);
    if (usersSnap.exists()) {
      const typeInfo = getEmergencyTypeInfo(data.type);
      const usersData = usersSnap.val();
      const notifPromises: Promise<void>[] = [];
      Object.entries(usersData).forEach(([uid, userData]: [string, any]) => {
        if (
          userData.estateId === data.estateId &&
          (userData.role === 'guard' || userData.role === 'estate_admin') &&
          uid !== data.triggeredBy
        ) {
          const notifId = `emergency-${alert.id}-${uid}`;
          const notifRef = ref(db, `notifications/${uid}/${notifId}`);
          notifPromises.push(
            set(notifRef, {
              id: notifId,
              userId: uid,
              type: 'emergency_alert',
              title: `🚨 EMERGENCY: ${typeInfo.label}`,
              message: `${data.triggeredByName} triggered an emergency alert${data.householdName ? ` from ${data.householdName}` : ''}`,
              timestamp: Date.now(),
              read: false,
              data: {
                alertId: alert.id,
                emergencyType: data.type,
                triggeredBy: data.triggeredBy,
                triggeredByName: data.triggeredByName,
                householdName: data.householdName,
                description: data.description,
              },
            })
          );
        }
      });
      await Promise.allSettled(notifPromises);
      console.log(`📢 Emergency notifications sent to ${notifPromises.length} guards/admins`);
    }
  } catch (notifErr) {
    console.error('Failed to send emergency notifications (alert still active):', notifErr);
  }

  return alert;
};

/**
 * Get active emergency alerts for an estate
 */
export const getActiveAlerts = async (estateId: string): Promise<EmergencyAlert[]> => {
  const db = await getFirebaseDatabase();
  const alertsRef = ref(db, `emergencyAlerts/${estateId}`);
  const snapshot = await get(alertsRef);

  if (!snapshot.exists()) return [];

  const alerts: EmergencyAlert[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    const alert = child.val() as EmergencyAlert;
    if (alert.status === 'active') {
      alerts.push(alert);
    }
  });

  // Sort newest first
  return alerts.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Get all emergency alerts for an estate (including resolved)
 */
export const getAllAlerts = async (estateId: string, limit = 50): Promise<EmergencyAlert[]> => {
  const db = await getFirebaseDatabase();
  const alertsRef = ref(db, `emergencyAlerts/${estateId}`);
  const snapshot = await get(alertsRef);

  if (!snapshot.exists()) return [];

  const alerts: EmergencyAlert[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    alerts.push(child.val() as EmergencyAlert);
  });

  return alerts.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
};

/**
 * Acknowledge an emergency alert (guard/admin marks they've seen it)
 */
export const acknowledgeAlert = async (
  estateId: string,
  alertId: string,
  acknowledgedBy: string
): Promise<void> => {
  const db = await getFirebaseDatabase();
  const alertRef = ref(db, `emergencyAlerts/${estateId}/${alertId}`);
  await update(alertRef, {
    status: 'acknowledged',
    acknowledgedBy,
    acknowledgedAt: Date.now(),
  });
  console.log('✅ Emergency alert acknowledged:', alertId);
};

/**
 * Resolve an emergency alert
 */
export const resolveAlert = async (
  estateId: string,
  alertId: string,
  resolvedBy: string
): Promise<void> => {
  const db = await getFirebaseDatabase();
  const alertRef = ref(db, `emergencyAlerts/${estateId}/${alertId}`);
  await update(alertRef, {
    status: 'resolved',
    resolvedBy,
    resolvedAt: Date.now(),
  });
  console.log('✅ Emergency alert resolved:', alertId);
};

/**
 * Subscribe to real-time emergency alerts for an estate.
 * Returns an unsubscribe function.
 */
export const subscribeToAlerts = (
  estateId: string,
  callback: (alerts: EmergencyAlert[]) => void
): (() => void) => {
  let dbRef: any = null;

  const setup = async () => {
    try {
      const db = await getFirebaseDatabase();
      dbRef = ref(db, `emergencyAlerts/${estateId}`);

      onValue(dbRef, (snapshot: DataSnapshot) => {
        const alerts: EmergencyAlert[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child: DataSnapshot) => {
            alerts.push(child.val() as EmergencyAlert);
          });
        }
        // Active alerts first, then by time
        const sorted = alerts.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return b.createdAt - a.createdAt;
        });
        callback(sorted);
      });
    } catch (error) {
      console.error('Error subscribing to emergency alerts:', error);
    }
  };

  setup();

  return () => {
    if (dbRef) {
      off(dbRef);
    }
  };
};

/**
 * Get the label and color for an emergency type
 */
export const getEmergencyTypeInfo = (type: EmergencyType) => {
  const map: Record<EmergencyType, { label: string; icon: string; color: string }> = {
    robbery: { label: 'Robbery / Break-in', icon: '🚨', color: 'red' },
    fire: { label: 'Fire Emergency', icon: '🔥', color: 'orange' },
    medical: { label: 'Medical Emergency', icon: '🏥', color: 'blue' },
  };
  return map[type];
};
