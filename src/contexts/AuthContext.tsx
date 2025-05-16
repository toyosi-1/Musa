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
import { ref, get, set } from 'firebase/database';
import { auth, rtdb } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initError: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getUserProfile: (uid: string) => Promise<User | null>;
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
        return snapshot.val() as User;
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
        isEmailVerified: firebaseUser.emailVerified,
        createdAt: Date.now()
      };
      
      // Save user data to Realtime Database
      await set(ref(rtdb, `users/${firebaseUser.uid}`), userData);
      
      return userData;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Sign in existing user
  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user profile from database
      const userProfile = await getUserProfile(firebaseUser.uid);
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }
      
      // Update last login time
      await set(ref(rtdb, `users/${firebaseUser.uid}/lastLogin`), Date.now());
      
      return userProfile;
    } catch (error) {
      console.error('Error signing in:', error);
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
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            console.log('User is signed in:', firebaseUser.uid);
            const formattedUser = await formatUser(firebaseUser);
            setCurrentUser(formattedUser);
            setInitError(null);
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
        console.error('Auth state observer error:', error);
        setInitError('Authentication service error. Please try again later.');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up auth observer:', error);
      setInitError('Failed to initialize authentication. Please refresh the page.');
      setLoading(false);
      return () => {};
    }
  }, []);

  const value = {
    currentUser,
    loading,
    initError,
    signUp,
    signIn,
    signOut,
    getUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
