// Extend the Window interface to include our ENV variables
declare global {
  interface Window {
    ENV: {
      NEXT_PUBLIC_FIREBASE_API_KEY?: string;
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
      NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
      NEXT_PUBLIC_FIREBASE_APP_ID?: string;
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
      NEXT_PUBLIC_FIREBASE_DATABASE_URL?: string;
    };
  }
}

export {}; // This file needs to be a module
