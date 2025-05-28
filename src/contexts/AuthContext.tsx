"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/user';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { auth, rtdb } from '@/lib/firebase';

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

  // Convert Firebase user to our User type
  const formatUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Check if user has status field - if not, they're an existing user
        // Default to 'approved' status for backward compatibility
        if (!userData.status) {
          console.log('Existing user without status field, setting to approved:', firebaseUser.uid);
          const updatedUser = {
            ...userData,
            status: 'approved',
            approvedAt: Date.now()
          };
          
          // Update the user in the database with the status field
          await update(ref(rtdb, `users/${firebaseUser.uid}`), {
            status: 'approved',
            approvedAt: Date.now()
          });
          
          return updatedUser as User;
        }
        
        return userData as User;
      }
      return null;
    } catch (error) {
      console.error('Error formatting user:', error);
      return null;
    }
  };

  // Get user profile from database
  const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  // Sign up a new user
  const signUp = async (email: string, password: string, displayName: string, role: UserRole): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user profile in Realtime Database
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName,
        role,
        status: role === 'admin' ? 'approved' : 'pending', // Admins are auto-approved, others are pending
        isEmailVerified: firebaseUser.emailVerified,
        createdAt: Date.now()
      };
      
      // Save user data to Realtime Database
      await set(ref(rtdb, `users/${firebaseUser.uid}`), userData);

      // Notify admins about new pending user (can be implemented with cloud functions)
      if (userData.status === 'pending') {
        try {
          // Add to pending users list for easy querying by admins
          await set(ref(rtdb, `pendingUsers/${firebaseUser.uid}`), {
            uid: firebaseUser.uid,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            createdAt: userData.createdAt
          });
        } catch (err) {
          console.error('Error adding user to pending list:', err);
          // Non-critical error, don't throw
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Sign in existing user
  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      console.log('Attempting to sign in with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('Firebase authentication successful for uid:', firebaseUser.uid);
      
      // Get user profile from database
      const userProfile = await getUserProfile(firebaseUser.uid);
      console.log('Retrieved user profile:', userProfile ? 'success' : 'not found');
      
      if (!userProfile) {
        console.error('User profile not found in database for uid:', firebaseUser.uid);
        throw new Error('User profile not found. Please contact administrator.');
      }
      
      // Update last login time
      console.log('Updating last login time for user');
      await set(ref(rtdb, `users/${firebaseUser.uid}/lastLogin`), Date.now());
      
      // If user doesn't have a status field, add it (backward compatibility)
      if (!userProfile.status) {
        console.log('Adding status field for existing user without status');
        await update(ref(rtdb, `users/${firebaseUser.uid}`), {
          status: 'approved',
          approvedAt: Date.now()
        });
        userProfile.status = 'approved';
        userProfile.approvedAt = Date.now();
      }

      console.log('User signed in successfully. Status:', userProfile.status);
      return userProfile;
    } catch (error) {
      console.error('Error signing in:', error);
      // Add more specific error messages for common Firebase auth errors
      if (error instanceof Error) {
        const errorMessage = error.message || '';
        if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/wrong-password')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (errorMessage.includes('auth/too-many-requests')) {
          throw new Error('Too many failed login attempts. Please try again later.');
        } else if (errorMessage.includes('auth/network-request-failed')) {
          throw new Error('Network error. Please check your internet connection.');
        }
      }
      throw error;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Approve a pending user
  const approveUser = async (uid: string, adminUid: string): Promise<void> => {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const pendingUserRef = ref(rtdb, `pendingUsers/${uid}`);
      const timestamp = Date.now();
      
      // Get user data before updating for email notification
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val() as User;
      
      // Update user status to approved
      await update(userRef, {
        status: 'approved',
        approvedBy: adminUid,
        approvedAt: timestamp
      });
      
      // Remove from pending list
      await set(pendingUserRef, null);
      
      // Email notification removed - will be added later
      console.log(`User ${uid} approved by admin ${adminUid}`);
      
      console.log(`User ${uid} approved by admin ${adminUid}`);
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  };

  // Reject a pending user
  const rejectUser = async (uid: string, adminUid: string, reason: string): Promise<void> => {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const pendingUserRef = ref(rtdb, `pendingUsers/${uid}`);
      
      // Get user data before updating for email notification
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val() as User;
      
      // Update user status to rejected
      await update(userRef, {
        status: 'rejected',
        approvedBy: adminUid, // Used as rejectedBy in this context
        rejectionReason: reason
      });
      
      // Remove from pending list
      await set(pendingUserRef, null);
      
      // Email notification removed - will be added later
      
      console.log(`User ${uid} rejected by admin ${adminUid} for reason: ${reason}`);
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  };

  // Get all pending users
  const getPendingUsers = async (): Promise<User[]> => {
    try {
      const pendingUsersRef = ref(rtdb, 'pendingUsers');
      const snapshot = await get(pendingUsersRef);
      
      if (snapshot.exists()) {
        // Get full user profiles for each pending user
        const pendingUserIds = Object.keys(snapshot.val());
        const pendingUsers: User[] = [];
        
        for (const uid of pendingUserIds) {
          const userProfile = await getUserProfile(uid);
          if (userProfile) {
            pendingUsers.push(userProfile);
          }
        }
        
        return pendingUsers;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting pending users:', error);
      return [];
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    try {
      // Check if Firebase auth is properly initialized
      if (!auth) {
        console.error('Firebase auth not initialized');
        setInitError('Authentication service not initialized. Please try again in a moment.');
        setLoading(false);
        return () => {};
      }

      console.log('Setting up auth state change listener...');
      
      // Set a timeout to prevent getting stuck in loading state
      const authTimeout = setTimeout(() => {
        console.log('Auth state detection timed out');
        if (loading) {
          setLoading(false);
          setInitError('Authentication service timed out. Please refresh the page.');
        }
      }, 10000);
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          // Clear the timeout since we got a response
          clearTimeout(authTimeout);
          
          if (firebaseUser) {
            console.log('User is signed in:', firebaseUser.uid);
            try {
              const formattedUser = await formatUser(firebaseUser);
              console.log('User formatted successfully:', formattedUser?.uid);
              setCurrentUser(formattedUser);
              setInitError(null);
            } catch (formatError) {
              console.error('Error formatting user:', formatError);
              // If we can't format the user but they are authenticated,
              // at least let them in with basic info
              setCurrentUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                role: 'resident', // Default role
                status: 'approved', // Default status
                isEmailVerified: firebaseUser.emailVerified,
                createdAt: Date.now()
              });
            }
          } else {
            console.log('No user signed in');
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setCurrentUser(null);
          setInitError('Error processing authentication. Please try again.');
        } finally {
          setLoading(false);
        }
      }, (error) => {
        // Clear the timeout since we got a response (error)
        clearTimeout(authTimeout);
        
        console.error('Auth state observer error:', error);
        setInitError('Authentication service error. Please try again later.');
        setLoading(false);
      });

      return () => {
        clearTimeout(authTimeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth observer:', error);
      setInitError('Failed to initialize authentication. Please refresh the page.');
      setLoading(false);
      return () => {};
    }
  }, []);

  // Batch approve multiple users
  const batchApproveUsers = async (uids: string[], adminUid: string): Promise<void> => {
    try {
      if (!uids.length) return;
      
      // Get all user data first for email notifications
      const approvedUsers: User[] = [];
      const updates: Record<string, any> = {};
      const timestamp = Date.now();
      
      // Build updates and collect user data
      for (const uid of uids) {
        const userSnapshot = await get(ref(rtdb, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val() as User;
          
          // Add to batch updates
          updates[`users/${uid}/status`] = 'approved';
          updates[`users/${uid}/approvedBy`] = adminUid;
          updates[`users/${uid}/approvedAt`] = timestamp;
          updates[`pendingUsers/${uid}`] = null; // Remove from pending list
          
          // Add to users for email notification
          userData.status = 'approved';
          userData.approvedBy = adminUid;
          userData.approvedAt = timestamp;
          approvedUsers.push(userData);
        }
      }
      
      // Apply all database updates in a single transaction
      await update(ref(rtdb), updates);
      
      // Email notifications removed - will be added later
      
      console.log(`Batch approved ${uids.length} users by admin ${adminUid}`);
    } catch (error) {
      console.error('Error batch approving users:', error);
      throw error;
    }
  };

  // Batch reject multiple users
  const batchRejectUsers = async (uids: string[], adminUid: string, reason: string): Promise<void> => {
    try {
      if (!uids.length) return;
      
      // Get all user data first for email notifications
      const rejectedUsers: User[] = [];
      const updates: Record<string, any> = {};
      
      // Build updates and collect user data
      for (const uid of uids) {
        const userSnapshot = await get(ref(rtdb, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val() as User;
          
          // Add to batch updates
          updates[`users/${uid}/status`] = 'rejected';
          updates[`users/${uid}/approvedBy`] = adminUid; // Used as rejectedBy
          updates[`users/${uid}/rejectionReason`] = reason;
          updates[`pendingUsers/${uid}`] = null; // Remove from pending list
          
          // Add to users for email notification
          rejectedUsers.push(userData);
        }
      }
      
      // Apply all database updates in a single transaction
      await update(ref(rtdb), updates);
      
      // Email notifications removed - will be added later
      
      console.log(`Batch rejected ${uids.length} users by admin ${adminUid}`);
    } catch (error) {
      console.error('Error batch rejecting users:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
    approveUser,
    rejectUser,
    getPendingUsers,
    batchApproveUsers,
    batchRejectUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
