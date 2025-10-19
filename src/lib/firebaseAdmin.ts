// /lib/firebaseAdmin.ts
import admin, { ServiceAccount } from "firebase-admin";
import { cert, getApps } from "firebase-admin/app";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Prevent re-initialization in serverless environments
if (!getApps().length) {
  if (!serviceAccountEnv) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add the service account JSON to your environment.",
    );
  }

  let serviceAccountJson: ServiceAccountJson;

  try {
    serviceAccountJson = JSON.parse(serviceAccountEnv) as ServiceAccountJson;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON. Ensure the value is a stringified service account.",
    );
  }

  const { project_id, client_email, private_key } = serviceAccountJson;

  if (!project_id || !client_email || !private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields (project_id, client_email, private_key).",
    );
  }

  const serviceAccount: ServiceAccount = {
    projectId: project_id,
    clientEmail: client_email,
    privateKey: private_key,
  };

  admin.initializeApp({
    credential: cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();

export default admin;
