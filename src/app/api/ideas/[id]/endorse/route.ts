import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { endorseIdeaSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

const endorsementDocId = (ideaId: string, userId: string) => `${ideaId}_${userId}`;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const ideaRef = adminDb.collection("ideas").doc(params.id);
    const ideaSnap = await ideaRef.get();
    if (!ideaSnap.exists) {
      return problemJSON(404, "not_found", "Idea not found.");
    }
    const idea = ideaSnap.data()!;
    if (idea.status === "archived") {
      return problemJSON(400, "invalid_state", "Cannot endorse an archived idea.");
    }

    const payload = endorseIdeaSchema.parse(await req.json().catch(() => ({})));
    const endorse = payload.endorse ?? true;
    const endorsementRef = adminDb.collection("ideaEndorse").doc(endorsementDocId(params.id, user.uid));

    const result = await adminDb.runTransaction(async (tx) => {
      const currentIdea = await tx.get(ideaRef);
      if (!currentIdea.exists) {
        throw new Error("Idea not found");
      }

      let count = currentIdea.get("endorsementCount") ?? 0;
      const currentStatus = currentIdea.get("status");
      const endorsementSnapshot = await tx.get(endorsementRef);

      let finalEndorsed = endorsementSnapshot.exists;
      if (endorse) {
        if (!endorsementSnapshot.exists) {
          tx.set(endorsementRef, {
            ideaId: params.id,
            userId: user.uid,
            endorsedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          count += 1;
          finalEndorsed = true;
        }
      } else if (endorsementSnapshot.exists) {
        tx.delete(endorsementRef);
        count = Math.max(0, count - 1);
        finalEndorsed = false;
      }

      tx.update(ideaRef, {
        endorsementCount: count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: currentStatus,
      });

      return { count, endorsed: finalEndorsed };
    });

    return Response.json(result);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    if (error.message === "Idea not found") {
      return problemJSON(404, "not_found", error.message);
    }
    console.error("Endorse idea failed", error);
    return problemJSON(500, "internal_error", "Failed to update endorsement.");
  }
}
