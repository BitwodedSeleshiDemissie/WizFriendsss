import { NextRequest } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { geohashFor } from "@/lib/geosearch";
import { getUserFromAuthHeader } from "@/lib/auth";
import { updateActivitySchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const canManageActivity = async (userId: string, activity: DocumentData) => {
  if (activity.hostUserId && activity.hostUserId === userId) {
    return true;
  }

  if (activity.hostGroupId) {
    const membershipId = `${activity.hostGroupId}_${userId}`;
    const membershipDoc = await adminDb.collection("groupMembers").doc(membershipId).get();
    const membership = membershipDoc.data();
    if (membership && ["moderator", "owner"].includes(membership.role)) {
      return true;
    }
  }

  return false;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await adminDb.collection("activities").doc(params.id).get();
    if (!doc.exists) {
      return problemJSON(404, "not_found", "Activity not found.");
    }
    const serialized = serializeFirestoreDoc(doc);
    return Response.json(serialized);
  } catch (error) {
    console.error("Fetch activity failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch activity.");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const docRef = adminDb.collection("activities").doc(params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return problemJSON(404, "not_found", "Activity not found.");
    }

    const data = docSnap.data()!;
    if (user.role !== "admin" && !(await canManageActivity(user.uid, data))) {
      return problemJSON(403, "forbidden", "You cannot update this activity.");
    }

    const payload = updateActivitySchema.parse(await req.json());
    const update: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (payload.title !== undefined) update.title = payload.title;
    if (payload.description !== undefined) update.description = payload.description;
    if (payload.category !== undefined) update.category = payload.category ?? null;
    if (payload.startTime) update.startTime = admin.firestore.Timestamp.fromDate(new Date(payload.startTime));
    if (payload.endTime) update.endTime = admin.firestore.Timestamp.fromDate(new Date(payload.endTime));
    if (payload.city !== undefined) update.city = payload.city;
    if (payload.maxAttendees !== undefined) update.maxAttendees = payload.maxAttendees ?? null;
    if (payload.visibility !== undefined) update.visibility = payload.visibility;
    if (payload.locationName !== undefined) update.locationName = payload.locationName ?? null;
    if (payload.address !== undefined) update.address = payload.address ?? null;
    if (payload.hostGroupId !== undefined) update.hostGroupId = payload.hostGroupId ?? null;

    const { lat, lng } = payload as { lat?: number; lng?: number };
    if (lat != null && lng != null) {
      update.point = new admin.firestore.GeoPoint(lat, lng);
      update.geohash = geohashFor(lat, lng);
    }

    await docRef.update(update);

    return Response.json({ id: docRef.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update activity failed", error);
    return problemJSON(500, "internal_error", "Failed to update activity.");
  }
}
