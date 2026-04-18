"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/user';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, get, update, onValue } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase } from '@/lib/firebase';
import {
  isPwaMode,
  backupSession,
  getSessionBackup,
  clearSessionBackup,
  refreshSessionBackup,
  registerPwaLifecycleEvents,
  optimizePwaPageReload,
} from '@/utils/pwaUtils';
import {
  getInitialUser,
  getMemoryCached,
  setMemoryCached,
  evictMemoryCached,
  persistUserProfile,
  getPersistedUserProfile,
  clearPersistedUserProfile,
  coerceUserRole,
} from '@/utils/userProfileCache';
import {
  approveUser as approveUserService,
  rejectUser as rejectUserService,
  getPendingUsers as getPendingUsersService,
  batchApproveUsers as batchApproveUsersService,
  batchRejectUsers as batchRejectUsersService,
} from '@/services/userAdminService';
import {
  enforceHouseholdDeviceApproval,
  NEW_DEVICE_APPROVAL_REQUIRED,
} from '@/services/householdDeviceCheck';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole, estateId?: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getUserProfile: (uid: string) => Promise<User | null>;
  refreshCurrentUser: () => Promise<void>;
  approveUser: (uid: string, adminUid: string) => Promise<void>;
  rejectUser: (uid: string, adminUid: string, reason: string) => Promise<void>;
  getPendingUsers: () => Promise<User[]>;
  batchApproveUsers: (uids: string[], adminUid: string) => Promise<void>;
  batchRejectUsers: (uids: string[], adminUid: string, reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function logError(message: string, error: unknown) {
  console.error(`🔴 ${message}:`, error);
  if (error instanceof Error) {
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialUser = getInitialUser();
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);
  const [initError, setInitError] = useState<string | null>(null);

  /**
   * Convert a Firebase auth user + our DB record into our User type.
   * Retries a few times on cold-start races where the DB profile hasn't
   * been written yet.
   */
  const formatUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const startTime = performance.now();
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${firebaseUser.uid}`);

      const maxRetries = 6;
      const retryDelayMs = 500;
      let snapshot: any = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const fetchPromise = get(userRef);
          const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('Database operation timed out')), 5000);
          });
          snapshot = (await Promise.race([fetchPromise, timeoutPromise])) as any;
        } catch (dbError) {
          logError('Database fetch error', dbError);
          if (attempt < maxRetries - 1) {
            await new Promise((res) => setTimeout(res, retryDelayMs));
            continue;
          }
          throw dbError;
        }

        if (snapshot && snapshot.exists()) break;

        if (attempt < maxRetries - 1) {
          console.warn(`User record not found yet, retrying (${attempt + 1}/${maxRetries - 1})...`);
          await new Promise((res) => setTimeout(res, retryDelayMs));
        }
      }

      if (!snapshot || !snapshot.exists()) {
        console.error('SECURITY ERROR: User not found in database during formatUser:', firebaseUser.uid);
        throw new Error('User not found in database and role unknown');
      }

      console.log(`User database lookup completed in ${performance.now() - startTime}ms`);
      const userData = snapshot.val();
      if (!userData) throw new Error('User data is null or undefined');

      const formattedUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: userData.displayName || firebaseUser.displayName || 'User',
        role: userData.role || 'resident',
        status: userData.status || 'approved',
        isEmailVerified: firebaseUser.emailVerified,
        createdAt: userData.createdAt || Date.now(),
        ...(userData.estateId && { estateId: userData.estateId }),
        ...(userData.householdId && { householdId: userData.householdId }),
        ...(userData.isHouseholdHead && { isHouseholdHead: userData.isHouseholdHead }),
        ...(userData.approvedBy && { approvedBy: userData.approvedBy }),
        ...(userData.approvedAt && { approvedAt: userData.approvedAt }),
        ...(userData.rejectedBy && { rejectedBy: userData.rejectedBy }),
        ...(userData.rejectedAt && { rejectedAt: userData.rejectedAt }),
        ...(userData.rejectionReason && { rejectionReason: userData.rejectionReason }),
      };

      try {
        setMemoryCached(formattedUser);
        persistUserProfile(formattedUser);
      } catch (cacheError) {
        console.warn('Failed to cache user data:', cacheError);
      }

      return formattedUser;
    } catch (error) {
      logError('Error formatting user', error);
      throw error;
    }
  };

  /** Fetch a user profile with in-memory caching. */
  const getCachedUserProfile = async (uid: string): Promise<User | null> => {
    const cached = getMemoryCached(uid);
    if (cached) {
      console.log('Using cached user profile data');
      return cached;
    }

    try {
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${uid}`);
      const fetchPromise = get(userRef);
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 5000);
      });
      const snapshot = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (snapshot && snapshot.exists()) {
        const userData = snapshot.val() as User;
        setMemoryCached(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  /** Sign up a new user and write their profile to the database atomically. */
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    estateId?: string,
  ): Promise<User> => {
    try {
      const auth = await getFirebaseAuth();
      const result = await createUserWithEmailAndPassword(auth, email, password);

      const db = await getFirebaseDatabase();
      const newUser: User = {
        uid: result.user.uid,
        email,
        displayName,
        role,
        status: 'pending',
        isEmailVerified: result.user.emailVerified,
        createdAt: Date.now(),
        ...(estateId && { estateId }),
      };

      const atomicUpdates: Record<string, any> = {};
      atomicUpdates[`users/${result.user.uid}`] = newUser;
      atomicUpdates[`pendingUsers/${result.user.uid}`] = true;
      await update(ref(db), atomicUpdates);

      // Non-blocking welcome email
      import('@/services/smtpEmailService')
        .then(({ sendWelcomeEmail }) =>
          sendWelcomeEmail({ userName: displayName, userEmail: email, userRole: role }),
        )
        .then((sent) =>
          console.log(sent ? `✅ Welcome email sent to ${email}` : `⚠️ Welcome email failed for ${email}`),
        )
        .catch((err) => console.error('❌ Welcome email error:', err));

      console.log('New user signed up and added to pending list:', newUser.uid, estateId ? `for estate: ${estateId}` : '');
      return newUser;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  /** Sign in an existing user, then run the Head-of-House device check. */
  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const startTime = performance.now();
      console.log(`Attempting to sign in user: ${email}`, new Date().toISOString());

      const auth = await getFirebaseAuth();
      if (!auth) throw new Error('Authentication service is not initialized');

      let result;
      try {
        result = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError) {
        logError('Firebase authentication failed', authError);
        throw authError;
      }

      if (!result?.user) throw new Error('Authentication succeeded but user data is missing');

      let formattedUser: User | null = null;
      try {
        formattedUser = await getCachedUserProfile(result.user.uid);
        if (!formattedUser) formattedUser = await formatUser(result.user);
      } catch (dbError) {
        logError('Error fetching user profile', dbError);
        throw new Error('Unable to verify user account details. Please try again or contact support.');
      }

      if (!formattedUser) {
        console.error('User authenticated but failed to retrieve profile from database');
        throw new Error('Unable to retrieve user profile from database. Please try again or contact support.');
      }

      setMemoryCached(formattedUser);

      // Head-of-House new-device enforcement (throws NEW_DEVICE_APPROVAL_REQUIRED if blocked)
      try {
        await enforceHouseholdDeviceApproval(formattedUser);
      } catch (deviceErr: any) {
        if (deviceErr?.message === NEW_DEVICE_APPROVAL_REQUIRED) {
          setCurrentUser(null);
          throw deviceErr;
        }
        // Other errors are non-fatal — already logged in the service
      }

      try {
        backupSession(formattedUser.uid, formattedUser.email, formattedUser.role, formattedUser.displayName);
      } catch (backupError) {
        console.warn('Failed to create session backup:', backupError);
      }

      console.log(`User sign-in completed in ${performance.now() - startTime}ms. UID: ${formattedUser.uid}, Role: ${formattedUser.role}`);

      // Non-blocking activity log
      import('@/services/activityService')
        .then(({ logActivity }) =>
          logActivity({
            type: 'login' as any,
            description: `${formattedUser!.displayName || 'User'} logged in`,
            timestamp: Date.now(),
            userId: formattedUser!.uid,
            estateId: formattedUser!.estateId || '',
            householdId: (formattedUser as any).householdId || '',
          }),
        )
        .catch((err) => console.warn('Login activity log failed (non-fatal):', err));

      return formattedUser;
    } catch (error) {
      logError('Error details for sign-in failure', error);
      if (error instanceof Error) {
        const errorCode = (error as any).code || '';
        const errorMessage = error.message || '';
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/invalid-login-credentials') {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (errorCode === 'auth/user-not-found') {
          throw new Error('No account found with this email address. Please sign up first.');
        }
        if (errorCode === 'auth/wrong-password') {
          throw new Error('Incorrect password. Please try again.');
        }
        if (errorCode === 'auth/too-many-requests') {
          throw new Error('Too many failed login attempts. Please try again later.');
        }
        if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network') || errorMessage.includes('timed out')) {
          throw new Error('Connection to authentication service timed out. Please check your internet connection and try again.');
        }
        throw new Error('Incorrect email or password. Please check and try again.');
      }
      throw error;
    }
  };

  /** Sign out the current user and clear all session/cache state. */
  const signOut = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      await firebaseSignOut(auth);
      setCurrentUser(null);
      clearSessionBackup();

      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
          window.indexedDB.deleteDatabase('MusaAuthStorage');
        } catch (e) {
          console.warn('Failed to clear IndexedDB:', e);
        }
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const getUserProfile = (uid: string): Promise<User | null> => getCachedUserProfile(uid);

  /** Force-refetch the current user's profile from the database. */
  const refreshCurrentUser = async (): Promise<void> => {
    try {
      const auth = await getFirebaseAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      evictMemoryCached(firebaseUser.uid);
      const updatedUser = await getCachedUserProfile(firebaseUser.uid);
      if (updatedUser) setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing current user:', error);
    }
  };

  // ───────────────────────── auth state listener ─────────────────────────

  useEffect(() => {
    let unsubscribe: () => void;
    let authTimeout: NodeJS.Timeout;
    let authStateTimeout: NodeJS.Timeout;
    let sessionRefreshInterval: NodeJS.Timeout | undefined;
    let connectedListener = () => {};
    let pwaRecoveryListener: () => void = () => {};

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing Firebase auth...');

        authTimeout = setTimeout(() => {
          console.log('⚠️ Firebase auth initialization timed out');
          if (loading) {
            setLoading(false);
            setInitError('Authentication service is taking longer than expected. Please check your connection and refresh the page.');
          }
        }, 5000);

        const auth = await getFirebaseAuth();
        console.log('✅ Auth ready, initializing database in background...');

        const dbPromise = getFirebaseDatabase();
        try {
          await Promise.race([
            dbPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000)),
          ]);
          console.log('✅ Database ready');
        } catch {
          console.warn('⚠️ Database initialization slow, continuing with auth only');
          dbPromise.then(() => console.log('✅ Database eventually ready'));
        }

        clearTimeout(authTimeout);

        // Configure persistence appropriate for the runtime (PWA vs browser)
        try {
          const isPwa = isPwaMode();
          console.log(`🔒 Setting up auth persistence for ${isPwa ? 'PWA' : 'browser'} mode`);

          if (isPwa) {
            const isIosPwa = navigator.userAgent.match(/iPad|iPhone|iPod/) && window.matchMedia('(display-mode: standalone)').matches;
            if (isIosPwa) {
              console.log('📱 iOS PWA detected, using special persistence strategy');
              await setPersistence(auth, indexedDBLocalPersistence)
                .catch(() => setPersistence(auth, browserLocalPersistence))
                .catch(() => setPersistence(auth, inMemoryPersistence));
              console.log('✅ iOS PWA persistence strategy applied');
            } else {
              try {
                await setPersistence(auth, indexedDBLocalPersistence);
                console.log('✅ Using IndexedDB persistence');
              } catch {
                try {
                  await setPersistence(auth, browserLocalPersistence);
                  console.log('✅ Using localStorage persistence');
                } catch {
                  await setPersistence(auth, inMemoryPersistence);
                  console.log('⚠️ Using in-memory persistence (session only)');
                }
              }
            }

            registerPwaLifecycleEvents();
            optimizePwaPageReload();
            sessionRefreshInterval = setInterval(() => {
              if (currentUser) refreshSessionBackup();
            }, 60000);
          } else {
            await setPersistence(auth, browserLocalPersistence);
            console.log('✅ Using standard localStorage persistence');
          }
        } catch (e) {
          console.warn('⚠️ Failed to set auth persistence:', e);
        }

        console.log('🔒 Setting up auth state listener...');
        let authStateResolved = false;
        let isInitialAuthState = true;

        await new Promise<void>((resolve) => {
          authStateTimeout = setTimeout(() => {
            if (authStateResolved) return;
            console.warn('Auth state change listener timed out');
            const sessionBackup = getSessionBackup();
            if (sessionBackup?.userId) {
              console.log('🔄 Attempting to recover session from backup...', sessionBackup);
              getUserProfile(sessionBackup.userId)
                .then(async (user) => {
                  if (user?.uid) {
                    const role = coerceUserRole(sessionBackup.role);
                    if (role && !user.role) user.role = role;
                    if (sessionBackup.email && !user.email) user.email = sessionBackup.email;
                    if (sessionBackup.displayName && !user.displayName) user.displayName = sessionBackup.displayName;
                    setCurrentUser(user);
                  }
                })
                .catch((e) => console.error('Failed to recover session:', e))
                .finally(() => {
                  setLoading(false);
                  resolve();
                });
            } else {
              setLoading(false);
              resolve();
            }
          }, 8000);

          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
              console.log('🔄 Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');

              if (firebaseUser) {
                isInitialAuthState = false;
                const user = await formatUser(firebaseUser);
                if (user) {
                  console.log('✅ User formatted successfully:', user.displayName);
                  setCurrentUser(user);
                  backupSession(user.uid, user.email, user.role, user.displayName);
                  persistUserProfile(user);
                  if (isPwaMode()) {
                    if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
                    sessionRefreshInterval = setInterval(() => refreshSessionBackup(), 30000);
                  }
                } else {
                  console.warn('⚠️ User formatting failed');
                  setCurrentUser(null);
                }
              } else {
                // First null on cold start might just be "firebase hasn't restored session yet"
                if (isInitialAuthState) {
                  isInitialAuthState = false;
                  if (initialUser) {
                    console.log('🔄 Initial auth null but we have instant-recovered user — keeping:', initialUser.displayName);
                    setCurrentUser(initialUser);
                    return;
                  }
                  const sessionBackup = getSessionBackup();
                  if (sessionBackup?.userId) {
                    const cachedUser = getPersistedUserProfile(sessionBackup.userId);
                    if (cachedUser) {
                      console.log('📦 Recovered user from persisted profile:', cachedUser.displayName);
                      setCurrentUser(cachedUser);
                      return;
                    }
                  }
                  console.log('👋 No persisted session found on cold start');
                  setCurrentUser(null);
                } else {
                  // Genuine sign-out
                  console.log('👋 User signed out');
                  setCurrentUser(null);
                  clearSessionBackup();
                  clearPersistedUserProfile();
                  if (sessionRefreshInterval) {
                    clearInterval(sessionRefreshInterval);
                    sessionRefreshInterval = undefined;
                  }
                }
              }
            } catch (error) {
              console.error('Auth state change error:', error);

              // Auto-retry once for transient errors
              if (firebaseUser) {
                console.log('🔄 Retrying authentication after transient error...');
                try {
                  await new Promise((res) => setTimeout(res, 1500));
                  const retryUser = await formatUser(firebaseUser);
                  if (retryUser) {
                    console.log('✅ Auth retry succeeded');
                    setCurrentUser(retryUser);
                    persistUserProfile(retryUser);
                    return;
                  }
                } catch (retryError) {
                  console.error('Auth retry also failed:', retryError);
                }

                const cachedUser = getPersistedUserProfile(firebaseUser.uid);
                if (cachedUser) {
                  console.log('📦 Using persisted profile as fallback for:', cachedUser.displayName);
                  setCurrentUser(cachedUser);
                  setTimeout(async () => {
                    try {
                      const freshUser = await formatUser(firebaseUser);
                      if (freshUser) {
                        setCurrentUser(freshUser);
                        persistUserProfile(freshUser);
                      }
                    } catch {
                      /* keep cached data */
                    }
                  }, 5000);
                  return;
                }
              }

              setCurrentUser(null);
              const isIosPwa = navigator.userAgent.match(/iPad|iPhone|iPod/) && window.matchMedia('(display-mode: standalone)').matches;
              if (isIosPwa) {
                setTimeout(() => {
                  if (!currentUser && loading) {
                    setInitError('Authentication initialization failed. Please close and reopen the app.');
                  }
                }, 2000);
              } else {
                setInitError('Error processing authentication. Please refresh the page and try again.');
              }
            } finally {
              if (!authStateResolved) {
                authStateResolved = true;
                clearTimeout(authStateTimeout);
                resolve();
              }
              setLoading(false);
            }
          });
        });

        // Database connection monitor
        console.log('🔌 Setting up database connection listener...');
        const database = await getFirebaseDatabase();
        const connectedRef = ref(database, '.info/connected');
        connectedListener = onValue(connectedRef, (snapshot) => {
          const isConnected = snapshot.val() === true;
          console.log(isConnected ? '✅ Database connected' : '❌ Database disconnected');
        });

        // PWA session recovery extras
        if (isPwaMode()) {
          console.log('📱 Setting up enhanced PWA session management...');
          const isIosPwa = navigator.userAgent.match(/iPad|iPhone|iPod/) && window.matchMedia('(display-mode: standalone)').matches;
          if (isIosPwa) {
            setInitError(null);
            setTimeout(() => {
              if (!currentUser && loading) {
                const sessionBackup = getSessionBackup();
                if (sessionBackup?.userId) {
                  window.dispatchEvent(new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }));
                }
              }
            }, 1000);
          }
          registerPwaLifecycleEvents();

          const recoveryEventHandler = async (event: Event) => {
            const customEvent = event as CustomEvent;
            if (!customEvent.detail?.userId) return;
            console.log('🔄 PWA session recovery event triggered for:', customEvent.detail.userId);
            try {
              const user = await getUserProfile(customEvent.detail.userId);
              if (user) {
                console.log('✅ PWA session recovered for:', user.displayName);
                const sessionBackup = getSessionBackup();
                if (sessionBackup && !user.role) {
                  const role = coerceUserRole(sessionBackup.role);
                  if (role) user.role = role;
                }
                setCurrentUser(user);
                backupSession(user.uid, user.email, user.role, user.displayName);
              }
            } catch (e) {
              console.error('Failed to recover PWA session:', e);
            } finally {
              setLoading(false);
            }
          };

          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              refreshSessionBackup();
              if (currentUser) backupSession(currentUser.uid, currentUser.email, currentUser.role, currentUser.displayName);
            } else if (currentUser) {
              backupSession(currentUser.uid, currentUser.email, currentUser.role, currentUser.displayName);
            }
          };

          const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
              const sessionBackup = getSessionBackup();
              if (sessionBackup?.userId && !currentUser) {
                recoveryEventHandler(new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }));
              }
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);
          document.addEventListener('pwa-session-recovery', recoveryEventHandler);
          window.addEventListener('pageshow', handlePageShow);
          window.addEventListener('focus', handleVisibilityChange);

          pwaRecoveryListener = () => {
            document.removeEventListener('pwa-session-recovery', recoveryEventHandler);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('focus', handleVisibilityChange);
          };

          const sessionBackup = getSessionBackup();
          if (sessionBackup?.userId && !currentUser) {
            recoveryEventHandler(new CustomEvent('pwa-session-recovery', { detail: { userId: sessionBackup.userId } }));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setInitError('Failed to initialize authentication. Please refresh the page');
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearTimeout(authTimeout);
      clearTimeout(authStateTimeout);
      if (sessionRefreshInterval) clearInterval(sessionRefreshInterval);
      if (unsubscribe) unsubscribe();
      if (connectedListener) connectedListener();
      if (pwaRecoveryListener) pwaRecoveryListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
    refreshCurrentUser,
    approveUser: approveUserService,
    rejectUser: rejectUserService,
    getPendingUsers: getPendingUsersService,
    batchApproveUsers: batchApproveUsersService,
    batchRejectUsers: batchRejectUsersService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
