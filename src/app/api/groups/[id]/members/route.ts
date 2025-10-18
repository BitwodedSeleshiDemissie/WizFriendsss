import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { joinGroupSchema, updateGroupMemberSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const buildMemberId = (groupId: string, userId: string) => `${groupId}_${userId}`;

const ensureGroupExists = async (groupId: string) => {
  const groupDoc = await adminDb.collection("groups").doc(groupId).get();
  if (!groupDoc.exists) {
    throw problemJSON(404, "not_found", "Group not found.");
  }
  return groupDoc;
};

const userMembershipRole = async (groupId: string, userId: string) => {
  const doc = await adminDb.collection("groupMembers").doc(buildMemberId(groupId, userId)).get();
  return doc.get("role") as string | undefined;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const snapshot = await adminDb
      .collection("groupMembers")
      .where("groupId", "==", params.id)
      .orderBy("joinedAt", "asc")
      .limit(500)
      .get();
    const members = snapshot.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((doc): doc is Record<string, unknown> => Boolean(doc));
    return Response.json(members);
  } catch (error) {
    console.error("List group members failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch members.");
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const groupDoc = await ensureGroupExists(params.id);
    const payload = joinGroupSchema.parse(await req.json().catch(() => ({})));

    const targetUserId = payload.userId ?? user.uid;
    const desiredRole = payload.role ?? "member";

    if (targetUserId !== user.uid) {
      const role = await userMembershipRole(params.id, user.uid);
      if (user.role !== "admin" && !role) {
        return problemJSON(403, "forbidden", "Cannot add other members without permission.");
      }
      if (role && !["owner", "moderator"].includes(role) && user.role !== "admin") {
        return problemJSON(403, "forbidden", "Insufficient permissions to add members.");
      }
    } else if (desiredRole !== "member") {
      return problemJSON(400, "validation_error", "Cannot self promote when joining.");
    }

    const group = groupDoc.data()!;
    if (!group.isPublic && targetUserId === user.uid && user.role !== "admin") {
      return problemJSON(403, "forbidden", "Group is private; request an invite from moderators.");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await adminDb
      .collection("groupMembers")
      .doc(buildMemberId(params.id, targetUserId))
      .set(
        {
          groupId: params.id,
          userId: targetUserId,
          role: desiredRole,
          joinedAt: now,
        },
        { merge: true }
      );

    return Response.json({ userId: targetUserId, role: desiredRole }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Join group failed", error);
    return problemJSON(500, "internal_error", "Failed to update membership.");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    await ensureGroupExists(params.id);
    const payload = updateGroupMemberSchema.parse(await req.json());

    const requestorRole = await userMembershipRole(params.id, user.uid);
    if (user.role !== "admin" && !(requestorRole && ["owner", "moderator"].includes(requestorRole))) {
      return problemJSON(403, "forbidden", "Insufficient permissions to update member roles.");
    }
    if (payload.role === "owner" && user.role !== "admin" && requestorRole !== "owner") {
      return problemJSON(403, "forbidden", "Only an existing owner or admin can assign ownership.");
    }

    await adminDb
      .collection("groupMembers")
      .doc(buildMemberId(params.id, payload.userId))
      .set(
        {
          groupId: params.id,
          userId: payload.userId,
          role: payload.role,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return Response.json({ userId: payload.userId, role: payload.role });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update member failed", error);
    return problemJSON(500, "internal_error", "Failed to update member.");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") ?? user.uid;

    if (targetUserId !== user.uid) {
      const role = await userMembershipRole(params.id, user.uid);
      if (user.role !== "admin" && !(role && ["owner", "moderator"].includes(role))) {
        return problemJSON(403, "forbidden", "Cannot remove other members.");
      }
    }

    await adminDb.collection("groupMembers").doc(buildMemberId(params.id, targetUserId)).delete();
    return Response.json({ userId: targetUserId, removed: true });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Remove member failed", error);
    return problemJSON(500, "internal_error", "Failed to remove member.");
  }
}
