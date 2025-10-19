import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { updatePostSchema } from "@/lib/validate";
import { serializeFirestoreDoc } from "@/lib/serialize";
import { ApiError, okJson, requireUser, withApiHandler } from "./helpers";

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

export const getPost = withApiHandler<{ postId: string }>(async ({ params }) => {
  const doc = await adminDb.collection("posts").doc(params.postId).get();
  if (!doc.exists) {
    throw new ApiError(404, "not_found", "Post not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return okJson(serialized);
});

export const updatePost = withApiHandler<{ postId: string }>(async ({ req, params }) => {
  const user = await requireUser(req);

  const docRef = adminDb.collection("posts").doc(params.postId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new ApiError(404, "not_found", "Post not found.");
  }

  const post = docSnap.data()!;
  if (user.role !== "admin" && !(await canModeratePost(user.uid, post))) {
    throw new ApiError(403, "forbidden", "You cannot edit this post.");
  }

  const payload = updatePostSchema.parse(await req.json());
  const update: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (payload.content !== undefined) update.content = payload.content;
  if (payload.mediaUrls !== undefined) update.mediaUrls = payload.mediaUrls;

  await docRef.update(update);
  return okJson({ id: docRef.id });
});

export const deletePost = withApiHandler<{ postId: string }>(async ({ req, params }) => {
  const user = await requireUser(req);

  const docRef = adminDb.collection("posts").doc(params.postId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new ApiError(404, "not_found", "Post not found.");
  }
  const post = docSnap.data()!;
  if (user.role !== "admin" && !(await canModeratePost(user.uid, post))) {
    throw new ApiError(403, "forbidden", "You cannot delete this post.");
  }

  await docRef.delete();
  return okJson({ success: true });
});
