// /lib/firebaseAdmin.ts (or wherever your file is)
import admin from "firebase-admin";
import { cert } from "firebase-admin/app"; // Import cert

// Check if Firebase Admin SDK is already initialized
if (!admin.apps.length) {
  // Initialize using the Vercel environment variables
  admin.initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Make sure to replace the escaped newlines from the env var
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    // You usually don't need storageBucket here unless using specific Admin Storage features
    // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Export the initialized services
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminMessaging = admin.messaging();

export default admin; // Export the admin instance itself if needed elsewhere