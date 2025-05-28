import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getDatabase, Database, connectDatabaseEmulator, ref, onValue } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Function to validate Firebase config
const validateFirebaseConfig = () => {
  const requiredFields = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
  ];
  
  const missingFields = requiredFields.filter(
    field => !process.env[field]
  );
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    return false;
  }
  return true;
};

// Initialize Firebase with error handling
let app: FirebaseApp;
let auth: Auth;
let rtdb: Database;

try {
  const isConfigValid = validateFirebaseConfig();
  
  if (!isConfigValid) {
    throw new Error('Firebase configuration is incomplete. Check your environment variables.');
  }
  
  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  rtdb = getDatabase(app);
  
  // Initialize persistence for better offline behavior
  // This can help with connection issues
  setPersistence(auth, browserLocalPersistence).catch(error => {
    console.warn('Failed to set persistence:', error);
  });
  
  // Connect to emulators in development if available
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectDatabaseEmulator(rtdb, 'localhost', 9000);
      console.log('Connected to Firebase emulators');
    } catch (emulatorError) {
      console.warn('Failed to connect to Firebase emulators:', emulatorError);
    }
  }
  
  console.log('Firebase initialized successfully with configuration:', {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Present' : '✗ Missing',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Present' : '✗ Missing',
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? '✓ Present' : '✗ Missing',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Present' : '✗ Missing',
    connection: 'Attempting connection...'
  });
  
  // Test database connection
  const connectedRef = ref(rtdb, '.info/connected');
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      console.log('Connected to Firebase Realtime Database');
    } else {
      console.warn('Disconnected from Firebase Realtime Database');
    }
  });
  
} catch (error) {
  console.error('Error initializing Firebase:', error);
  
  // Initialize fallback instances to prevent app crashes
  if (getApps().length === 0) {
    console.log('Initializing fallback Firebase app');
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // These should always be defined after the above
  auth = getAuth(app);
  rtdb = getDatabase(app);
}

export { app, auth, rtdb };
