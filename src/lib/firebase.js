// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDqCCwrkIf6RoBT7cvQySDx17Iv1rtSjM",
  authDomain: "myproject-6da71.firebaseapp.com",
  projectId: "myproject-6da71",
  storageBucket: "myproject-6da71.firebasestorage.app",
  messagingSenderId: "1052187891055",
  appId: "1:1052187891055:web:88def74adf53bce938049a",
  measurementId: "G-0F5RPPLMR6"
};

// Initialize Firebase (singleton)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Persist user session even after refresh / redirect
setPersistence(auth, browserLocalPersistence);

export { app, auth, provider };
