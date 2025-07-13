/**
 * PWA Session Utils
 * Helpers for managing persistent sessions in Progressive Web App mode
 */

// Check if the app is running in PWA (standalone) mode
export const isPwaMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true; // iOS Safari
};

// Store for backup session data
interface SessionBackup {
  userId?: string;
  authTime: number;
  lastActive: number;
}

// Namespace for all session storage keys
const STORAGE_KEYS = {
  SESSION_BACKUP: 'musa_session_backup',
  AUTH_PERSISTENCE: 'musa_auth_persistence',
  FIREBASE_LOCAL: 'firebase:authUser',  // Firebase's own storage key
};

/**
 * Creates a backup of the auth session in multiple storage locations
 * This provides redundancy if one storage method fails
 */
export const backupSession = (userId: string): void => {
  if (typeof window === 'undefined') return;
  
  const sessionData: SessionBackup = {
    userId,
    authTime: Date.now(),
    lastActive: Date.now(),
  };
  
  try {
    // Store in localStorage (primary)
    localStorage.setItem(STORAGE_KEYS.SESSION_BACKUP, JSON.stringify(sessionData));
    
    // Also store in IndexedDB if available (backup)
    if ('indexedDB' in window) {
      storeInIndexedDB(STORAGE_KEYS.SESSION_BACKUP, sessionData);
    }
    
    // Create HTTP-only cookie as fallback (especially for iOS PWA)
    document.cookie = `${STORAGE_KEYS.SESSION_BACKUP}=${encodeURIComponent(JSON.stringify({ userId }))}; path=/; max-age=2592000; SameSite=Lax; secure`;
  } catch (error) {
    console.error('Failed to backup session:', error);
  }
};

/**
 * Updates the timestamp on the session backup to keep it alive
 */
export const refreshSessionBackup = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Get existing session data
    const sessionDataStr = localStorage.getItem(STORAGE_KEYS.SESSION_BACKUP);
    if (!sessionDataStr) return;
    
    const sessionData = JSON.parse(sessionDataStr) as SessionBackup;
    sessionData.lastActive = Date.now();
    
    // Update localStorage
    localStorage.setItem(STORAGE_KEYS.SESSION_BACKUP, JSON.stringify(sessionData));
    
    // Update IndexedDB if available
    if ('indexedDB' in window) {
      storeInIndexedDB(STORAGE_KEYS.SESSION_BACKUP, sessionData);
    }
  } catch (error) {
    console.error('Failed to refresh session backup:', error);
  }
};

/**
 * Retrieves the session backup from multiple storage locations
 * Tries multiple storage methods for better resilience
 */
export const getSessionBackup = (): SessionBackup | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try localStorage first
    const sessionDataStr = localStorage.getItem(STORAGE_KEYS.SESSION_BACKUP);
    if (sessionDataStr) {
      return JSON.parse(sessionDataStr) as SessionBackup;
    }
    
    // Try cookies as fallback
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === STORAGE_KEYS.SESSION_BACKUP && value) {
        return JSON.parse(decodeURIComponent(value)) as SessionBackup;
      }
    }
    
    // If still not found, try IndexedDB (async, will need to be handled by caller)
    return null;
  } catch (error) {
    console.error('Failed to get session backup:', error);
    return null;
  }
};

/**
 * Removes all session backup data
 */
export const clearSessionBackup = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.SESSION_BACKUP);
    
    // Clear cookie
    document.cookie = `${STORAGE_KEYS.SESSION_BACKUP}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure`;
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      deleteFromIndexedDB(STORAGE_KEYS.SESSION_BACKUP);
    }
  } catch (error) {
    console.error('Failed to clear session backup:', error);
  }
};

/**
 * IndexedDB helpers for more persistent storage
 * Safari in PWA mode sometimes clears localStorage but keeps IndexedDB
 */
const storeInIndexedDB = async (key: string, data: any): Promise<void> => {
  try {
    const dbPromise = window.indexedDB.open('MusaAuthStorage', 1);
    
    dbPromise.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('authData')) {
        db.createObjectStore('authData', { keyPath: 'key' });
      }
    };
    
    dbPromise.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['authData'], 'readwrite');
      const store = transaction.objectStore('authData');
      store.put({ key, data });
    };
  } catch (error) {
    console.error('IndexedDB operation failed:', error);
  }
};

const getFromIndexedDB = (key: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const dbPromise = window.indexedDB.open('MusaAuthStorage', 1);
      
      dbPromise.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('authData')) {
          db.createObjectStore('authData', { keyPath: 'key' });
        }
      };
      
      dbPromise.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['authData'], 'readonly');
        const store = transaction.objectStore('authData');
        const request = store.get(key);
        
        request.onsuccess = () => {
          resolve(request.result ? request.result.data : null);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      };
      
      dbPromise.onerror = () => {
        reject(dbPromise.error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

const deleteFromIndexedDB = (key: string): void => {
  try {
    const dbPromise = window.indexedDB.open('MusaAuthStorage', 1);
    
    dbPromise.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['authData'], 'readwrite');
      const store = transaction.objectStore('authData');
      store.delete(key);
    };
  } catch (error) {
    console.error('Failed to delete from IndexedDB:', error);
  }
};

/**
 * Checks if there's a Firebase auth session that needs restoration
 * This can happen if Firebase's own persistence failed in PWA mode
 */
export const hasFirebaseAuthSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check multiple storage locations for Firebase auth data
    const firebaseAuthKey = Object.keys(localStorage).find(key => 
      key.startsWith('firebase:authUser') || 
      key.includes('firebase:authUser')
    );
    
    return !!firebaseAuthKey;
  } catch (error) {
    console.error('Error checking for Firebase auth session:', error);
    return false;
  }
};

/**
 * Register event listeners for PWA lifecycle events
 * This helps maintain session across app suspension/resume
 */
export const registerPwaLifecycleEvents = (): void => {
  if (typeof window === 'undefined') return;
  
  // Update session timestamp on visibility change (app foreground/background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshSessionBackup();
    }
  });
  
  // Listen for PWA beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Log PWA install prompt event
    console.log('PWA install prompt shown');
  });
  
  // Listen for PWA appinstalled event
  window.addEventListener('appinstalled', () => {
    // Log PWA installation
    console.log('PWA installed successfully');
  });
};

/**
 * Handle PWA lifecycle page reload efficiently
 * This ensures state is maintained properly during PWA refresh
 */
export const optimizePwaPageReload = (): void => {
  if (typeof window === 'undefined' || !isPwaMode()) return;
  
  // Capture page state before unload
  window.addEventListener('beforeunload', () => {
    try {
      const scrollPos = window.scrollY;
      sessionStorage.setItem('musa_scroll_position', scrollPos.toString());
      sessionStorage.setItem('musa_last_path', window.location.pathname);
    } catch (error) {
      console.error('Failed to save page state:', error);
    }
  });
  
  // Restore scroll position on page load
  window.addEventListener('load', () => {
    try {
      const savedScrollPos = sessionStorage.getItem('musa_scroll_position');
      if (savedScrollPos && window.location.pathname === sessionStorage.getItem('musa_last_path')) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos, 10));
        }, 100);
      }
    } catch (error) {
      console.error('Failed to restore page state:', error);
    }
  });
};
