import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { okJson, requireUser, withApiHandler } from "./helpers";

export const getCurrentUser = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);

  const profileDoc = await adminDb.collection("users").doc(user.uid).get();
  const firebaseUser = await adminAuth.getUser(user.uid);

  const profile = profileDoc.exists ? profileDoc.data() : null;
  return okJson({
    uid: user.uid,
    email: user.email ?? firebaseUser.email ?? null,
    role: user.role,
    profile,
  });
});
