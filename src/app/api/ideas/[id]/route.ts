import { NextRequest } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { updateIdeaSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const canEditIdea = (userId: string, userRole: string, idea: DocumentData) => {
  if (userRole === "admin" || userRole === "customer_service") {
    return true;
  }
  return idea.createdBy === userId;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await adminDb.collection("ideas").doc(params.id).get();
  if (!doc.exists) {
    return problemJSON(404, "not_found", "Idea not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return Response.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const docRef = adminDb.collection("ideas").doc(params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return problemJSON(404, "not_found", "Idea not found.");
    }

    const idea = docSnap.data()!;
    if (!canEditIdea(user.uid, user.role, idea)) {
      return problemJSON(403, "forbidden", "You cannot update this idea.");
    }

    const payload = updateIdeaSchema.parse(await req.json());
    const update: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (payload.promptText !== undefined) update.promptText = payload.promptText;
    if (payload.city !== undefined) update.city = payload.city;
    if (payload.aiSuggestion !== undefined) update.aiSuggestion = payload.aiSuggestion ?? null;
    if (payload.status !== undefined) update.status = payload.status;
    if (payload.endorsementThreshold !== undefined) update.endorsementThreshold = payload.endorsementThreshold;

    await docRef.update(update);
    return Response.json({ id: params.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update idea failed", error);
    return problemJSON(500, "internal_error", "Failed to update idea.");
  }
}
