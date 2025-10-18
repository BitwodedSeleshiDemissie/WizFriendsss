import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { reviewFeaturedAdSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

const isReviewer = (role: string) => role === "customer_service" || role === "admin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }
    if (!isReviewer(user.role)) {
      return problemJSON(403, "forbidden", "Only customer service or admins may review ads.");
    }

    const payload = reviewFeaturedAdSchema.parse(await req.json());
    const adRef = adminDb.collection("featuredAds").doc(params.id);
    const adSnap = await adRef.get();
    if (!adSnap.exists) {
      return problemJSON(404, "not_found", "Featured ad not found.");
    }

    const ad = adSnap.data()!;
    if (ad.status !== "pending_review" && payload.action === "approve") {
      return problemJSON(400, "invalid_state", "Ad must be pending review for approval.");
    }

    const activityRef = adminDb.collection("activities").doc(ad.activityId);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const nowDate = new Date();

    if (payload.action === "reject") {
      await adRef.update({
        status: "rejected",
        approvedByCsUserId: null,
        updatedAt: now,
        reviewNotes: payload.notes ?? null,
      });
      await activityRef.update({
        isFeatured: false,
        featuredAdId: null,
        updatedAt: now,
      });
      return Response.json({ id: params.id, status: "rejected" });
    }

    const startsAt: admin.firestore.Timestamp = ad.startsAt;
    const endsAt: admin.firestore.Timestamp = ad.endsAt;
    const startDate = startsAt.toDate();
    const endDate = endsAt.toDate();

    let status: "active" | "pending_review" | "expired" = "pending_review";
    let activateActivity = false;

    if (nowDate > endDate) {
      status = "expired";
    } else if (nowDate >= startDate && nowDate <= endDate) {
      status = "active";
      activateActivity = true;
    }

    await adRef.update({
      status,
      approvedByCsUserId: user.uid,
      updatedAt: now,
      reviewNotes: payload.notes ?? null,
    });

    if (activateActivity) {
      await activityRef.update({
        isFeatured: true,
        featuredAdId: params.id,
        updatedAt: now,
      });
    }

    return Response.json({ id: params.id, status });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Review ad failed", error);
    return problemJSON(500, "internal_error", "Failed to review featured ad.");
  }
}
