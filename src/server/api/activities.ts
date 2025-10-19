import type { DocumentData, DocumentSnapshot, Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { geohashBounds, geohashFor, distanceKm } from "@/lib/geosearch";
import { createActivitySchema, updateActivitySchema } from "@/lib/validate";
import { serializeFirestoreDoc, timestampToIso } from "@/lib/serialize";
import {
  ApiError,
  createdJson,
  okJson,
  parseLimitParam,
  parseNumberParam,
  requireUser,
  withApiHandler,
} from "./helpers";

const MAX_RESULTS = 100;

type ActivityResponse = Record<string, unknown> & {
  distanceKm?: number;
};

const buildActivityResponse = (doc: DocumentSnapshot<DocumentData>): ActivityResponse | null => {
  const serialized = serializeFirestoreDoc(doc);
  if (!serialized) {
    return null;
  }

  const point = doc.get("point");
  return {
    ...serialized,
    startTime: timestampToIso(doc.get("startTime")),
    endTime: timestampToIso(doc.get("endTime")),
    point: point
      ? {
          lat: point.latitude,
          lng: point.longitude,
        }
      : null,
  };
};

const fetchGeoBoundActivities = async (lat: number, lng: number, radiusKm: number) => {
  const bounds = geohashBounds(lat, lng, radiusKm);
  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      adminDb.collection("activities").orderBy("geohash").startAt(start).endAt(end).limit(MAX_RESULTS).get()
    )
  );

  const results = new Map<string, ActivityResponse>();
  snapshots.forEach((snapshot) => {
    snapshot.forEach((doc) => {
      if (!results.has(doc.id)) {
        const activity = buildActivityResponse(doc);
        if (activity) {
          results.set(doc.id, activity);
        }
      }
    });
  });

  return Array.from(results.values());
};

const fetchFilteredActivities = async (filters: {
  city?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) => {
  let query: Query = adminDb.collection("activities");
  if (filters.city) {
    query = query.where("city", "==", filters.city);
  }
  if (filters.category) {
    query = query.where("category", "==", filters.category);
  }
  if (filters.dateFrom) {
    query = query.where("startTime", ">=", admin.firestore.Timestamp.fromDate(new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    query = query.where("startTime", "<=", admin.firestore.Timestamp.fromDate(new Date(filters.dateTo)));
  }

  const snapshot = await query.orderBy("startTime", "asc").limit(MAX_RESULTS).get();
  return snapshot.docs
    .map((doc) => buildActivityResponse(doc))
    .filter((data): data is ActivityResponse => Boolean(data));
};

const filterAndRankActivities = (
  activities: ActivityResponse[],
  filters: { dateFrom?: string | null; dateTo?: string | null; query?: string | null; lat?: number | null; lng?: number | null; radiusKm?: number }
) => {
  const { dateFrom, dateTo, query, lat, lng, radiusKm } = filters;
  const lowerQuery = query?.toLowerCase();

  return activities
    .filter((activity) => {
      const startIso = typeof activity.startTime === "string" ? activity.startTime : null;
      if (dateFrom && startIso && new Date(startIso) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && startIso && new Date(startIso) > new Date(dateTo)) {
        return false;
      }
      if (lat != null && lng != null && radiusKm != null && radiusKm > 0) {
        const point = activity.point as { lat?: number; lng?: number } | null;
        if (!point?.lat || !point?.lng) {
          return false;
        }
        const distance = distanceKm([lat, lng], [point.lat, point.lng]);
        if (distance > radiusKm) {
          return false;
        }
        activity.distanceKm = distance;
      }
      if (lowerQuery) {
        const title = (activity.title as string | undefined)?.toLowerCase() ?? "";
        const description = (activity.description as string | undefined)?.toLowerCase() ?? "";
        if (!title.includes(lowerQuery) && !description.includes(lowerQuery)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const featuredDiff = (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      if (featuredDiff !== 0) {
        return featuredDiff;
      }
      const startDiff =
        (new Date(a.startTime as string).getTime() || 0) - (new Date(b.startTime as string).getTime() || 0);
      if (startDiff !== 0) {
        return startDiff;
      }
      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    })
    .slice(0, MAX_RESULTS);
};

export const listActivities = withApiHandler(async ({ req }) => {
  const params = new URL(req.url).searchParams;

  const lat = parseNumberParam(params.get("lat"));
  const lng = parseNumberParam(params.get("lng"));
  const radiusKm = parseLimitParam(params.get("radius_km"), { fallback: 10, min: 1, max: 100 });
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  const category = params.get("category");
  const city = params.get("city");
  const query = params.get("q");

  const baseFilters = { dateFrom, dateTo, query };
  const geoFilters = { lat, lng, radiusKm };

  const activities =
    lat != null && lng != null
      ? await fetchGeoBoundActivities(lat, lng, radiusKm)
      : await fetchFilteredActivities({ city, category, dateFrom, dateTo });

  const filtered = filterAndRankActivities(activities, { ...baseFilters, ...geoFilters });

  return okJson(filtered, {
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });
});

export const createActivity = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
  const payload = createActivitySchema.parse(await req.json());
  const geohash = geohashFor(payload.lat, payload.lng);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const docRef = adminDb.collection("activities").doc();
  const activityData = {
    title: payload.title,
    description: payload.description,
    category: payload.category ?? null,
    startTime: admin.firestore.Timestamp.fromDate(new Date(payload.startTime)),
    endTime: admin.firestore.Timestamp.fromDate(new Date(payload.endTime)),
    city: payload.city,
    point: new admin.firestore.GeoPoint(payload.lat, payload.lng),
    geohash,
    locationName: payload.locationName ?? null,
    address: payload.address ?? null,
    hostUserId: user.uid,
    hostGroupId: payload.hostGroupId ?? null,
    visibility: payload.visibility,
    maxAttendees: payload.maxAttendees ?? null,
    isFeatured: false,
    featuredAdId: null,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(activityData);
  return createdJson({ id: docRef.id });
});

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

export const getActivity = withApiHandler<{ id: string }>(async ({ params }) => {
  const doc = await adminDb.collection("activities").doc(params.id).get();
  if (!doc.exists) {
    throw new ApiError(404, "not_found", "Activity not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return okJson(serialized);
});

export const updateActivity = withApiHandler<{ id: string }>(async ({ req, params }) => {
  const user = await requireUser(req);

  const docRef = adminDb.collection("activities").doc(params.id);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new ApiError(404, "not_found", "Activity not found.");
  }

  const data = docSnap.data()!;
  if (user.role !== "admin" && !(await canManageActivity(user.uid, data))) {
    throw new ApiError(403, "forbidden", "You cannot update this activity.");
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

  return okJson({ id: docRef.id });
});
