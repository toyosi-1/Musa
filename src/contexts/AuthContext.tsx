"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole, UserStatus } from '@/types/user';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update, onValue, off, DataSnapshot } from 'firebase/database';
import { 
  initializeFirebase, 
  getFirebaseAuth, 
  getFirebaseDatabase, 
  waitForFirebase,
  type User as FirebaseAuthUser
} from '@/lib/firebase-new';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getUserProfile: (uid: string) => Promise<User | null>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [auth, setAuth] = useState<ReturnType<typeof getFirebaseAuth> | null>(null);
  const [db, setDb] = useState<ReturnType<typeof getFirebaseDatabase> | null>(null);

  // Initialize Firebase
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let dbUnsubscribe: (() => void) | null = null;

    const initFirebase = async () => {
      try {
        setLoading(true);
        setInitError(null);
        
        // Initialize Firebase services
        const { auth: fbAuth, db: fbDb } = await initializeFirebase();
        setAuth(fbAuth);
        setDb(fbDb);

        // Set up auth state listener
        unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in
            const user = await getUserProfile(fbDb, firebaseUser.uid);
            setCurrentUser(user);
          } else {
            // User is signed out
            setCurrentUser(null);
          }
          setLoading(false);
        });

        // Set up database connection monitoring
        const connectedRef = ref(fbDb, '.info/connected');
        dbUnsubscribe = onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            console.log('✅ Database connected');
          } else {
            console.log('❌ Database disconnected');
          }
        });

      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setInitError('Failed to initialize authentication service');
        setLoading(false);
      }
    };

    initFirebase();

    // Cleanup function
    return () => {
      if (unsubscribe) unsubscribe();
      if (dbUnsubscribe) dbUnsubscribe();
    };
  }, []);

  // Helper function to get user profile from database
  const getUserProfile = useCallback(async (db: ReturnType<typeof getFirebaseDatabase>, uid: string): Promise<User | null> => {
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return { uid, ...snapshot.val() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }, []);

  // Sign up a new user
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    displayName: string, 
    role: UserRole
  ): Promise<User> => {
    if (!auth || !db) {
      throw new Error('Authentication service not initialized');
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;
      
      // Create user profile in Realtime Database
      const newUser: User = {
        uid,
        email,
        displayName,
        role,
        status: 'pending', // Default status is pending until approved by admin
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save user to database
      await set(ref(db, `users/${uid}`), newUser);
      
      return newUser;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }, [auth, db]);

  // Sign in an existing user
  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    if (!auth || !db) {
      throw new Error('Authentication service not initialized');
    }

    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;
      
      // Get user profile from database
      const user = await getUserProfile(db, uid);
      
      if (!user) {
        throw new Error('User profile not found');
      }
      
      return user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }, [auth, db, getUserProfile]);

  // Sign out the current user
  const signOut = useCallback(async (): Promise<void> => {
    if (!auth) {
      throw new Error('Authentication service not initialized');
    }

    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, [auth]);

  // Approve a user (admin only)
  const approveUser = useCallback(async (uid: string, adminUid: string): Promise<void> => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const updates: { [key: string]: any } = {};
      updates[`users/${uid}/status`] = 'approved';
      updates[`users/${uid}/approvedBy`] = adminUid;
      updates[`users/${uid}/approvedAt`] = new Date().toISOString();
      updates[`users/${uid}/updatedAt`] = new Date().toISOString();
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  }, [db]);

  // Reject a user (admin only)
  const rejectUser = useCallback(async (uid: string, adminUid: string, reason: string): Promise<void> => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const updates: { [key: string]: any } = {};
      updates[`users/${uid}/status`] = 'rejected';
      updates[`users/${uid}/rejectedBy`] = adminUid;
      updates[`users/${uid}/rejectionReason`] = reason;
      updates[`users/${uid}/rejectedAt`] = new Date().toISOString();
      updates[`users/${uid}/updatedAt`] = new Date().toISOString();
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  }, [db]);

  // Get all pending users (admin only)
  const getPendingUsers = useCallback(async (): Promise<User[]> => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(query(usersRef, orderByChild('status'), equalTo('pending')));
      
      const users: User[] = [];
      snapshot.forEach((childSnapshot) => {
        users.push({ uid: childSnapshot.key, ...childSnapshot.val() } as User);
      });
      
      return users;
    } catch (error) {
      console.error('Error getting pending users:', error);
      throw error;
    }
  }, [db]);

  // Batch approve users (admin only)
  const batchApproveUsers = useCallback(async (uids: string[], adminUid: string): Promise<void> => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const updates: { [key: string]: any } = {};
      const timestamp = new Date().toISOString();
      
      uids.forEach(uid => {
        updates[`users/${uid}/status`] = 'approved';
        updates[`users/${uid}/approvedBy`] = adminUid;
        updates[`users/${uid}/approvedAt`] = timestamp;
        updates[`users/${uid}/updatedAt`] = timestamp;
      });
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error batch approving users:', error);
      throw error;
    }
  }, [db]);

  // Batch reject users (admin only)
  const batchRejectUsers = useCallback(async (uids: string[], adminUid: string, reason: string): Promise<void> => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const updates: { [key: string]: any } = {};
      const timestamp = new Date().toISOString();
      
      uids.forEach(uid => {
        updates[`users/${uid}/status`] = 'rejected';
        updates[`users/${uid}/rejectedBy`] = adminUid;
        updates[`users/${uid}/rejectionReason`] = reason;
        updates[`users/${uid}/rejectedAt`] = timestamp;
        updates[`users/${uid}/updatedAt`] = timestamp;
      });
      
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error batch rejecting users:', error);
      throw error;
    }
  }, [db]);

  const value = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile: (uid: string) => db ? getUserProfile(db, uid) : Promise.resolve(null),
    approveUser,
    rejectUser,
    getPendingUsers,
    batchApproveUsers,
    batchRejectUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
