import { NextRequest } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { updatePostSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const canModeratePost = async (userId: string, post: DocumentData) => {
  if (post.authorUserId === userId) {
    return true;
  }

  const activityDoc = await adminDb.collection("activities").doc(post.activityId).get();
  if (!activityDoc.exists) {
    return false;
  }

  const activity = activityDoc.data()!;
  if (activity.hostUserId === userId) {
    return true;
  }

  if (activity.hostGroupId) {
    const membership = await adminDb.collection("groupMembers").doc(`${activity.hostGroupId}_${userId}`).get();
    const role = membership.get("role");
    if (role && ["moderator", "owner"].includes(role)) {
      return true;
    }
  }

  return false;
};

export async function GET(_req: NextRequest, { params }: { params: { postId: string } }) {
  const doc = await adminDb.collection("posts").doc(params.postId).get();
  if (!doc.exists) {
    return problemJSON(404, "not_found", "Post not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return Response.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const docRef = adminDb.collection("posts").doc(params.postId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return problemJSON(404, "not_found", "Post not found.");
    }

    const post = docSnap.data()!;
    if (user.role !== "admin" && !(await canModeratePost(user.uid, post))) {
      return problemJSON(403, "forbidden", "You cannot edit this post.");
    }

    const payload = updatePostSchema.parse(await req.json());
    const update: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (payload.content !== undefined) update.content = payload.content;
    if (payload.mediaUrls !== undefined) update.mediaUrls = payload.mediaUrls;

    await docRef.update(update);
    return Response.json({ id: docRef.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update post failed", error);
    return problemJSON(500, "internal_error", "Failed to update post.");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const docRef = adminDb.collection("posts").doc(params.postId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return problemJSON(404, "not_found", "Post not found.");
  }
  const post = docSnap.data()!;
  if (user.role !== "admin" && !(await canModeratePost(user.uid, post))) {
    return problemJSON(403, "forbidden", "You cannot delete this post.");
  }

  await docRef.delete();
  return Response.json({ success: true });
}
