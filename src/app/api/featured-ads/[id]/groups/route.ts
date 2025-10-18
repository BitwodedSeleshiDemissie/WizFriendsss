import { NextRequest } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { linkFeaturedAdGroupsSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const canManageAd = (ad: DocumentData, userId: string, userRole: string) => {
  if (userRole === "admin" || userRole === "customer_service") {
    return true;
  }
  return ad.createdBy === userId;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const snapshot = await adminDb.collection("adAppears").where("adId", "==", params.id).get();
  const groups = snapshot.docs
    .map((doc) => serializeFirestoreDoc(doc))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc));
  return Response.json(groups);
}

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
    if (!canManageAd(ad, user.uid, user.role)) {
      return problemJSON(403, "forbidden", "You cannot manage ad placements.");
    }

    const payload = linkFeaturedAdGroupsSchema.parse(await req.json());
    const groupIds = payload.groupIds;

    const batch = adminDb.batch();
    const existingSnapshot = await adminDb.collection("adAppears").where("adId", "==", params.id).get();
    const newSet = new Set(groupIds);

    existingSnapshot.docs.forEach((doc) => {
      if (!newSet.has(doc.get("groupId"))) {
        batch.delete(doc.ref);
      }
    });

    groupIds.forEach((groupId) => {
      const ref = adminDb.collection("adAppears").doc(`${params.id}_${groupId}`);
      batch.set(ref, {
        adId: params.id,
        groupId,
      });
    });

    batch.update(adRef, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return Response.json({ adId: params.id, groupIds });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Link ad groups failed", error);
    return problemJSON(500, "internal_error", "Failed to link groups.");
  }
}
