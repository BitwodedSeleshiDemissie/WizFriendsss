import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { submitFeaturedAdSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const adRef = adminDb.collection("featuredAds").doc(params.id);
    const adSnap = await adRef.get();
    if (!adSnap.exists) {
      return problemJSON(404, "not_found", "Featured ad not found.");
    }

    const ad = adSnap.data()!;
    if (ad.createdBy !== user.uid && user.role !== "admin") {
      return problemJSON(403, "forbidden", "You cannot submit this ad.");
    }
    if (!["draft", "rejected"].includes(ad.status)) {
      return problemJSON(400, "invalid_state", "Ad must be in draft or rejected state to submit.");
    }

    await submitFeaturedAdSchema.parseAsync(await req.json().catch(() => ({})));

    await adRef.update({
      status: "pending_review",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return Response.json({ id: params.id, status: "pending_review" });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Submit ad failed", error);
    return problemJSON(500, "internal_error", "Failed to submit featured ad.");
  }
}
