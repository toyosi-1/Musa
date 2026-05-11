/**
 * Notification Queue Service
 * 
 * Ensures notifications are delivered even when the device is offline.
 * Notifications are stored in localStorage and retried when connection returns.
 */

const QUEUE_KEY = 'musa_pending_notifications';
const MAX_RETRIES = 3;

interface QueuedNotification {
  id: string;
  type: 'guest-checkin' | 'emergency' | 'general';
  payload: any;
  retries: number;
  timestamp: number;
}

/**
 * Queue a notification to be sent when online
 */
export function queueNotification(type: QueuedNotification['type'], payload: any): void {
  try {
    const queue = getQueue();
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    queue.push({
      id,
      type,
      payload,
      retries: 0,
      timestamp: Date.now(),
    });
    saveQueue(queue);
    console.log('[NotificationQueue] Queued:', id);
  } catch (e) {
    console.error('[NotificationQueue] Failed to queue:', e);
  }
}

/**
 * Get current queue
 */
function getQueue(): QueuedNotification[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save queue
 */
function saveQueue(queue: QueuedNotification[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50))); // Keep last 50
}

/**
 * Remove item from queue
 */
function removeFromQueue(id: string): void {
  const queue = getQueue().filter(item => item.id !== id);
  saveQueue(queue);
}

/**
 * Process all pending notifications
 * Call this when app comes online or after guard scan
 */
export async function processNotificationQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  console.log(`[NotificationQueue] Processing ${queue.length} pending notifications...`);

  const online = typeof navigator !== 'undefined' && navigator.onLine;
  if (!online) {
    console.log('[NotificationQueue] Device offline, skipping');
    return;
  }

  const { fetchWithAuth } = await import('@/lib/fetchWithAuth');

  for (const item of queue) {
    if (item.retries >= MAX_RETRIES) {
      console.log('[NotificationQueue] Max retries reached, removing:', item.id);
      removeFromQueue(item.id);
      continue;
    }

    try {
      if (item.type === 'guest-checkin') {
        const res = await fetchWithAuth('/api/notifications/guest-checkin', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          console.log('[NotificationQueue] Sent successfully:', item.id);
          removeFromQueue(item.id);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
    } catch (error) {
      console.error('[NotificationQueue] Failed to send:', item.id, error);
      item.retries++;
      // Update queue with retry count
      const updated = getQueue().map(q => q.id === item.id ? item : q);
      saveQueue(updated);
    }
  }
}

/**
 * Check and process queue on online event
 */
export function initNotificationQueue(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('[NotificationQueue] Device online, processing queue...');
    processNotificationQueue();
  };

  window.addEventListener('online', handleOnline);
  
  // Also process on initialization (in case we missed the event)
  if (navigator.onLine) {
    processNotificationQueue();
  }

  return () => window.removeEventListener('online', handleOnline);
}
