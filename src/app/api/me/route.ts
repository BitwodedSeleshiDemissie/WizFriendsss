import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { problemJSON } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const profileDoc = await adminDb.collection("users").doc(user.uid).get();
  const firebaseUser = await adminAuth.getUser(user.uid);

  const profile = profileDoc.exists ? profileDoc.data() : null;
  return Response.json({
    uid: user.uid,
    email: user.email ?? firebaseUser.email ?? null,
    role: user.role,
    profile,
  });
}
