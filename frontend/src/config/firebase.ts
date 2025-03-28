import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Check if Firebase API key is available
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Check if we have the necessary Firebase configuration
const isFirebaseConfigured = apiKey && authDomain && projectId && apiKey !== 'YOUR_FIREBASE_API_KEY';

// Your web app's Firebase configuration
const firebaseConfig = isFirebaseConfigured 
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }
  : {
      // Fallback mock config to prevent crashes during development
      apiKey: "demo-api-key",
      authDomain: "demo-app.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-app.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef0123456789"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Log warning if using mock configuration
if (!isFirebaseConfigured) {
  console.warn(
    "Firebase is using a mock configuration. Authentication features won't work properly. " +
    "Please set up your environment variables in .env file."
  );
}

export default app; 