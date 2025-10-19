import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { createGroupSchema, updateGroupSchema } from "@/lib/validate";
import { serializeFirestoreDoc } from "@/lib/serialize";
import {
  ApiError,
  createdJson,
  okJson,
  parseLimitParam,
  requireUser,
  withApiHandler,
} from "./helpers";

const MAX_GROUPS = 100;

const filterGroupsByQuery = (groups: Record<string, unknown>[], query: string) => {
  const lower = query.toLowerCase();
  return groups.filter((group) => {
    const name = (group.name as string | undefined)?.toLowerCase() ?? "";
    const description = (group.description as string | undefined)?.toLowerCase() ?? "";
    return name.includes(lower) || description.includes(lower);
  });
};

export const listGroups = withApiHandler(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const q = searchParams.get("q");
  const limit = parseLimitParam(searchParams.get("limit"), { fallback: MAX_GROUPS, max: MAX_GROUPS });

  let ref: Query = adminDb.collection("groups").orderBy("createdAt", "desc");
  if (city) {
    ref = ref.where("city", "==", city);
  }

  const snapshot = await ref.limit(limit).get();
  let groups = snapshot.docs
    .map((doc) => serializeFirestoreDoc(doc))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc));

  if (q) {
    groups = filterGroupsByQuery(groups, q);
  }

  return okJson(groups.slice(0, MAX_GROUPS), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
});

export const createGroup = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
  const payload = createGroupSchema.parse(await req.json());
  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = adminDb.collection("groups").doc();

  await docRef.set({
    name: payload.name,
    description: payload.description,
    city: payload.city,
    isPublic: payload.isPublic,
    bannerUrl: payload.bannerUrl ?? null,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
  });

  await adminDb
    .collection("groupMembers")
    .doc(`${docRef.id}_${user.uid}`)
    .set({
      groupId: docRef.id,
      userId: user.uid,
      role: "owner",
      joinedAt: now,
    });

  return createdJson({ id: docRef.id });
});

const canManageGroup = async (groupId: string, userId: string, userRole: string) => {
  if (userRole === "admin") {
    return true;
  }
  const membership = await adminDb.collection("groupMembers").doc(`${groupId}_${userId}`).get();
  const role = membership.get("role");
  return Boolean(role && ["owner", "moderator"].includes(role));
};

export const getGroup = withApiHandler<{ id: string }>(async ({ params }) => {
  const doc = await adminDb.collection("groups").doc(params.id).get();
  if (!doc.exists) {
    throw new ApiError(404, "not_found", "Group not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return okJson(serialized);
});

export const updateGroup = withApiHandler<{ id: string }>(async ({ req, params }) => {
  const user = await requireUser(req);

  if (!(await canManageGroup(params.id, user.uid, user.role))) {
    throw new ApiError(403, "forbidden", "You cannot update this group.");
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
  return okJson({ id: params.id });
});
