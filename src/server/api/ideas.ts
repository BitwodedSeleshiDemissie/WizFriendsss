import type { DocumentData, DocumentSnapshot, Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { geohashFor } from "@/lib/geosearch";
import { createIdeaSchema, updateIdeaSchema } from "@/lib/validate";
import { serializeFirestoreDoc } from "@/lib/serialize";
import {
  ApiError,
  createdJson,
  okJson,
  parseLimitParam,
  requireUser,
  withApiHandler,
} from "./helpers";

const serializeIdeaSnapshot = (docs: DocumentSnapshot<DocumentData>[]) =>
  docs
    .map((doc) => serializeFirestoreDoc(doc))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc));

export const listIdeas = withApiHandler(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const status = searchParams.get("status");
  const limit = parseLimitParam(searchParams.get("limit"), { fallback: 50, max: 100 });

  let query: Query = adminDb.collection("ideas").orderBy("createdAt", "desc");
  if (city) {
    query = query.where("city", "==", city);
  }
  if (status) {
    query = query.where("status", "==", status);
  }

  const snapshot = await query.limit(limit).get();
  const ideas = serializeIdeaSnapshot(snapshot.docs);

  return okJson(ideas, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
});

export const createIdea = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
  const payload = createIdeaSchema.parse(await req.json());
  const now = admin.firestore.FieldValue.serverTimestamp();

  const docRef = adminDb.collection("ideas").doc();
  const data: Record<string, unknown> = {
    promptText: payload.promptText,
    aiSuggestion: payload.aiSuggestion ?? null,
    city: payload.city,
    createdBy: user.uid,
    endorsementCount: 0,
    endorsementThreshold: 25,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  if (payload.lat != null && payload.lng != null) {
    data.proposedPoint = new admin.firestore.GeoPoint(payload.lat, payload.lng);
    data.proposedGeohash = geohashFor(payload.lat, payload.lng);
  }
  if (payload.proposedStart || payload.proposedEnd) {
    data.proposedTimeWindow = {
      start: payload.proposedStart ? admin.firestore.Timestamp.fromDate(new Date(payload.proposedStart)) : null,
      end: payload.proposedEnd ? admin.firestore.Timestamp.fromDate(new Date(payload.proposedEnd)) : null,
    };
  }

  await docRef.set(data);
  return createdJson({ id: docRef.id });
});

const canEditIdea = (userId: string, userRole: string, idea: DocumentData) => {
  if (userRole === "admin" || userRole === "customer_service") {
    return true;
  }
  return idea.createdBy === userId;
};

export const getIdea = withApiHandler<{ id: string }>(async ({ params }) => {
  const doc = await adminDb.collection("ideas").doc(params.id).get();
  if (!doc.exists) {
    throw new ApiError(404, "not_found", "Idea not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return okJson(serialized);
});

export const updateIdea = withApiHandler<{ id: string }>(async ({ req, params }) => {
  const user = await requireUser(req);

  const docRef = adminDb.collection("ideas").doc(params.id);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new ApiError(404, "not_found", "Idea not found.");
  }

  const idea = docSnap.data()!;
  if (!canEditIdea(user.uid, user.role, idea)) {
    throw new ApiError(403, "forbidden", "You cannot update this idea.");
  }

  const payload = updateIdeaSchema.parse(await req.json());
  const update: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (payload.promptText !== undefined) update.promptText = payload.promptText;
  if (payload.city !== undefined) update.city = payload.city;
  if (payload.aiSuggestion !== undefined) update.aiSuggestion = payload.aiSuggestion ?? null;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.endorsementThreshold !== undefined) update.endorsementThreshold = payload.endorsementThreshold;

  await docRef.update(update);
  return okJson({ id: params.id });
});
