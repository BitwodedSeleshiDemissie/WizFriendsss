import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { saveActivitySchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

const saveDocId = (activityId: string, userId: string) => `${activityId}_${userId}`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const doc = await adminDb.collection("userActivitySave").doc(saveDocId(params.id, user.uid)).get();
  if (!doc.exists) {
    return Response.json({ saved: false });
  }

  return Response.json({ saved: true });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const activitySnap = await adminDb.collection("activities").doc(params.id).get();
    if (!activitySnap.exists) {
      return problemJSON(404, "not_found", "Activity not found.");
    }

    const payload = saveActivitySchema.parse(await req.json().catch(() => ({})));
    const shouldSave = payload.saved ?? true;

    const docRef = adminDb.collection("userActivitySave").doc(saveDocId(params.id, user.uid));
    if (shouldSave) {
      await docRef.set({
        activityId: params.id,
        userId: user.uid,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await docRef.delete();
    }

    return Response.json({ saved: shouldSave });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Save activity failed", error);
    return problemJSON(500, "internal_error", "Failed to update activity save.");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  await adminDb.collection("userActivitySave").doc(saveDocId(params.id, user.uid)).delete();
  return Response.json({ saved: false });
}
