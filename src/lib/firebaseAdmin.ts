// /lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { cert, getApps } from 'firebase-admin/app';

// Prevent re-initialization in serverless environments
if (!getApps().length) {
  admin.initializeApp({
    // Use cert() with environment variables for Vercel
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Ensure the private key's newlines are correctly formatted
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log('Firebase Admin SDK Initialized'); // Log for confirmation
} else {
  // console.log('Firebase Admin SDK already initialized'); // Optional: Log if already initialized
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging(); // If you use it

export default admin; // Export the main admin instance if needed elsewheref