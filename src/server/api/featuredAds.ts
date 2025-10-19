import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { createFeaturedAdSchema } from "@/lib/validate";
import { serializeFirestoreDoc } from "@/lib/serialize";
import {
  ApiError,
  createdJson,
  okJson,
  parseLimitParam,
  requireUser,
  withApiHandler,
} from "./helpers";

export const listFeaturedAds = withApiHandler(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sponsorId = searchParams.get("sponsorId");
  const limit = parseLimitParam(searchParams.get("limit"), { fallback: 50, max: 100 });

  let query: Query = adminDb.collection("featuredAds").orderBy("createdAt", "desc");
  if (status) {
    query = query.where("status", "==", status);
  }
  if (sponsorId) {
    query = query.where("sponsorId", "==", sponsorId);
  }

  const snapshot = await query.limit(limit).get();
  const ads = snapshot.docs
    .map((doc) => serializeFirestoreDoc(doc))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc));

  return okJson(ads);
});

export const createFeaturedAd = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
  const payload = createFeaturedAdSchema.parse(await req.json());
  const activityRef = adminDb.collection("activities").doc(payload.activityId);
  const activitySnap = await activityRef.get();
  if (!activitySnap.exists) {
    throw new ApiError(404, "not_found", "Linked activity not found.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const startsAt = admin.firestore.Timestamp.fromDate(new Date(payload.startsAt));
  const endsAt = admin.firestore.Timestamp.fromDate(new Date(payload.endsAt));

  const docRef = adminDb.collection("featuredAds").doc();
  await docRef.set({
    activityId: payload.activityId,
    sponsorType: payload.sponsorType,
    sponsorId: payload.sponsorId,
    status: "draft",
    startsAt,
    endsAt,
    paymentRef: payload.paymentRef ?? null,
    createdBy: user.uid,
    approvedByCsUserId: null,
    createdAt: now,
    updatedAt: now,
  });

  await activityRef.update({
    featuredAdId: docRef.id,
    updatedAt: now,
  });

  return createdJson({ id: docRef.id });
});

export const getFeaturedAd = withApiHandler<{ id: string }>(async ({ params }) => {
  const doc = await adminDb.collection("featuredAds").doc(params.id).get();
  if (!doc.exists) {
    throw new ApiError(404, "not_found", "Featured ad not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return okJson(serialized);
});
