// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBDqCCwrkIf6RoBT7cvQySDx17Iv1rtSjM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "myproject-6da71.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "myproject-6da71",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "myproject-6da71.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1052187891055",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1052187891055:web:88def74adf53bce938049a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-0F5RPPLMR6",
};

// Initialize Firebase (singleton)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const db = getFirestore(app);

// ✅ Persist user session even after refresh / redirect
setPersistence(auth, browserLocalPersistence).catch((error) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Falling back to in-memory auth state; persistence is unavailable.", error);
  }
});

export { app, auth, provider, db };
