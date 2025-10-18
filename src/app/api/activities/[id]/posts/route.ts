import { NextRequest } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { createPostSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const MAX_POSTS = 100;

const validateMediaUrls = (urls: string[]) => {
  if (!urls.length) {
    return true;
  }
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return urls.every((url) => {
    if (!url.startsWith("https://")) {
      return false;
    }
    if (bucket) {
      return url.includes(bucket);
    }
    return true;
  });
};

const userCanPost = async (activityId: string, userId: string, activity: DocumentData) => {
  if (activity.hostUserId === userId) {
    return true;
  }

  if (activity.hostGroupId) {
    const memberId = `${activity.hostGroupId}_${userId}`;
    const membership = await adminDb.collection("groupMembers").doc(memberId).get();
    const role = membership.get("role");
    if (role && ["member", "moderator", "owner"].includes(role)) {
      return true;
    }
  }

  const joinDoc = await adminDb.collection("userActivityJoin").doc(`${activityId}_${userId}`).get();
  const status = joinDoc.get("status");
  return status === "joined" || status === "waitlist";
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const snapshot = await adminDb
      .collection("posts")
      .where("activityId", "==", params.id)
      .orderBy("createdAt", "asc")
      .limit(MAX_POSTS)
      .get();

    const posts = snapshot.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((doc): doc is Record<string, unknown> => Boolean(doc));

    return Response.json(posts, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error("List posts failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch posts.");
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const activityDoc = await adminDb.collection("activities").doc(params.id).get();
    if (!activityDoc.exists) {
      return problemJSON(404, "not_found", "Activity not found.");
    }

    const payload = createPostSchema.parse(await req.json());
    const mediaUrls = payload.mediaUrls ?? [];
    if (!validateMediaUrls(mediaUrls)) {
      return problemJSON(400, "validation_error", "Media URL must originate from the configured storage bucket.");
    }

    const activity = activityDoc.data()!;
    if (!(await userCanPost(params.id, user.uid, activity))) {
      return problemJSON(403, "forbidden", "You cannot post in this activity.");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = adminDb.collection("posts").doc();
    await docRef.set({
      activityId: params.id,
      authorUserId: user.uid,
      content: payload.content,
      mediaUrls,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Create post failed", error);
    return problemJSON(500, "internal_error", "Failed to create post.");
  }
}
