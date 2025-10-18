import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { updateGroupSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const canManageGroup = async (groupId: string, userId: string, userRole: string) => {
  if (userRole === "admin") {
    return true;
  }
  const membership = await adminDb.collection("groupMembers").doc(`${groupId}_${userId}`).get();
  const role = membership.get("role");
  return Boolean(role && ["owner", "moderator"].includes(role));
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await adminDb.collection("groups").doc(params.id).get();
  if (!doc.exists) {
    return problemJSON(404, "not_found", "Group not found.");
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

    if (!(await canManageGroup(params.id, user.uid, user.role))) {
      return problemJSON(403, "forbidden", "You cannot update this group.");
    }

    const payload = updateGroupSchema.parse(await req.json());
    const update: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.description !== undefined) update.description = payload.description;
    if (payload.city !== undefined) update.city = payload.city;
    if (payload.isPublic !== undefined) update.isPublic = payload.isPublic;
    if (payload.bannerUrl !== undefined) update.bannerUrl = payload.bannerUrl ?? null;

    await adminDb.collection("groups").doc(params.id).update(update);
    return Response.json({ id: params.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update group failed", error);
    return problemJSON(500, "internal_error", "Failed to update group.");
  }
}
