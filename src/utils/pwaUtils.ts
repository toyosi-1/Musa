/**
 * PWA Session Utils
 * Helpers for managing persistent sessions in Progressive Web App mode
 */

import { ref, get } from 'firebase/database';

// Check if the app is running in PWA (standalone) mode
export const isPwaMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true; // iOS Safari specific property
};

// Store for backup session data
interface SessionBackup {
  userId?: string;
  email?: string;
  role?: string;
  authTime: number;
  lastActive: number;
  displayName?: string;
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
export const backupSession = (userId: string, email?: string, role?: string, displayName?: string): void => {
  if (typeof window === 'undefined') return;
  
  const sessionData: SessionBackup = {
    userId,
    email,
    role,
    displayName,
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
    document.cookie = `${STORAGE_KEYS.SESSION_BACKUP}=${encodeURIComponent(JSON.stringify({ userId, email, role, displayName }))}; path=/; max-age=2592000; SameSite=Lax; secure`;
    
    // Also backup to sessionStorage for immediate recovery during PWA page reloads
    sessionStorage.setItem(STORAGE_KEYS.SESSION_BACKUP, JSON.stringify(sessionData));
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
    
    dbPromise.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('authData')) {
        db.createObjectStore('authData');
      }
    };
    
    dbPromise.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Check if object store exists
      if (!db.objectStoreNames.contains('authData')) {
        console.warn('authData object store does not exist');
        return;
      }
      
      const transaction = db.transaction(['authData'], 'readwrite');
      const store = transaction.objectStore('authData');
      store.delete(key);
    };
    
    dbPromise.onerror = (event) => {
      console.error('IndexedDB error:', event);
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
    // First check for our backup session
    const musaSession = getSessionBackup();
    if (musaSession?.userId) {
      return true;
    }
    
    // Then check multiple storage locations for Firebase auth data
    const firebaseAuthKey = Object.keys(localStorage).find(key => 
      key.startsWith('firebase:authUser') || 
      key.includes('firebase:authUser')
    );
    
    // Also check IndexedDB for firebase auth data
    const hasIndexedDBAuth = 'indexedDB' in window && 
      window.indexedDB.databases && 
      window.indexedDB.databases().then(dbs => 
        dbs.some(db => db.name?.includes('firebaseLocalStorage'))
      );
    
    return !!firebaseAuthKey || !!hasIndexedDBAuth;
  } catch (error) {
    console.error('Error checking for Firebase auth session:', error);
    return false;
  }
};

/**
 * Force reload the Firebase auth state
 * This can help recover from PWA suspension states
 */
export const forceReloadAuthState = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    const firebaseModule = await import('@/lib/firebase');
    const auth = await firebaseModule.getFirebaseAuth();
    const db = await firebaseModule.getFirebaseDatabase();
    
    // Check network connectivity first
    const isOnline = window.navigator.onLine;
    console.log(`🌐 Network status: ${isOnline ? 'online' : 'offline'}`);
    
    // Force reload the current user if online
    if (auth.currentUser && isOnline) {
      try {
        await auth.currentUser.reload();
        console.log('✅ Auth user force reloaded successfully');
        
        // After successful reload, backup session data again
        // Access user data from database directly instead of using non-existent method
        const db = await firebaseModule.getFirebaseDatabase();
        const userRef = ref(db, `users/${auth.currentUser.uid}`);
        const snapshot = await get(userRef);
        const userProfile = snapshot.exists() ? snapshot.val() : null;
        if (userProfile) {
          backupSession(
            auth.currentUser.uid,
            auth.currentUser.email || undefined,
            userProfile.role,
            userProfile.displayName
          );
          console.log('✅ Session backup refreshed after reload');
        }
      } catch (reloadError) {
        console.warn('Failed to reload user, trying offline recovery:', reloadError);
        // Continue with offline recovery attempt
      }
    } else {
      console.log('❌ No current user to force reload or device offline');
      
      // Try to recover from backup (for both offline and no current user cases)
      const sessionBackup = getSessionBackup();
      if (sessionBackup?.userId) {
        console.log('🔄 Found session backup, triggering auth recovery...');
        // The recovery will happen in AuthContext
        // We'll explicitly note we're using offline credentials
        localStorage.setItem('musa_offline_recovery', 'true');
        sessionStorage.setItem('musa_offline_recovery', 'true');
        
        // Signal to AuthContext that we're recovering
        const pwaRecoveryEvent = new CustomEvent('pwa-session-recovery', {
          detail: { userId: sessionBackup.userId }
        });
        document.dispatchEvent(pwaRecoveryEvent);
      }
    }
  } catch (error) {
    console.error('Failed to force reload auth state:', error);
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
      console.log('🔄 App became visible, refreshing session...');
      refreshSessionBackup();
      forceReloadAuthState().catch(console.error);
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
  
  // Focus events for PWAs (iOS Safari specifically)
  window.addEventListener('focus', () => {
    console.log('🔄 Window focus event, refreshing session...');
    refreshSessionBackup();
    forceReloadAuthState().catch(console.error);
  });
  
  // Page show/hide events (iOS PWA app switching)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      console.log('🔄 Page restored from bfcache, refreshing session...');
      refreshSessionBackup();
      forceReloadAuthState().catch(console.error);
    }
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
      
      // Ensure session backup is fresh before unload
      refreshSessionBackup();
    } catch (error) {
      console.error('Failed to save page state:', error);
    }
  });
  
  // Restore scroll position and check auth on page load
  window.addEventListener('load', () => {
    try {
      // Restore scroll position if needed
      const savedScrollPos = sessionStorage.getItem('musa_scroll_position');
      if (savedScrollPos && window.location.pathname === sessionStorage.getItem('musa_last_path')) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos, 10));
        }, 100);
      }
      
      // Check auth state on page load (critical for PWAs)
      setTimeout(() => {
        forceReloadAuthState().catch(console.error);
      }, 500); // Small delay to ensure Firebase is initialized
    } catch (error) {
      console.error('Failed to restore page state:', error);
    }
  });
};
