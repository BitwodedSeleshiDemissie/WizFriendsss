// /lib/firebase.js
// /lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
// Import necessary Firebase services
import { getAuth, GoogleAuthProvider } from
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase for the client (prevent re-initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app); // Export Firestore instance if used client-side

// Persist the session so protected API calls keep working across reloads
setPersistence(auth, browserLocalPersistence).catch((error) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Falling back to in-memory auth state; persistence is unavailable.", error);
  }
});

export default app; // Export the app instance
