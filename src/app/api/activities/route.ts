import { NextRequest, NextResponse } from "next/server";
import type { DocumentData, DocumentSnapshot, Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { geohashBounds, geohashFor, distanceKm } from "@/lib/geosearch";
import { createActivitySchema } from "@/lib/validate";
import { getUserFromAuthHeader } from "@/lib/auth";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc, timestampToIso } from "@/lib/serialize";

const MAX_RESULTS = 100;
type ActivityResponse = Record<string, any>;

const parseNumber = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildActivityResponse = (doc: DocumentSnapshot<DocumentData>): ActivityResponse | null => {
  const serialized = serializeFirestoreDoc(doc);
  if (!serialized) {
    return null;
  }

  return {
    ...serialized,
    startTime: timestampToIso(doc.get("startTime")),
    endTime: timestampToIso(doc.get("endTime")),
    point: doc.get("point")
      ? {
          lat: doc.get("point").latitude,
          lng: doc.get("point").longitude,
        }
      : null,
  };
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const lat = parseNumber(params.get("lat"));
  const lng = parseNumber(params.get("lng"));
  const radiusKm = Math.min(Math.max(parseNumber(params.get("radius_km")) ?? 10, 1), 100);
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  const category = params.get("category");
  const city = params.get("city");
  const query = params.get("q");

  try {
    let activities: ActivityResponse[] = [];
    if (lat != null && lng != null) {
      const bounds = geohashBounds(lat, lng, radiusKm);
      const snapshots = await Promise.all(
        bounds.map(([start, end]) =>
          adminDb.collection("activities").orderBy("geohash").startAt(start).endAt(end).limit(MAX_RESULTS).get()
        )
      );
      const seen = new Map<string, ActivityResponse>();
      snapshots.forEach((snap) => {
        snap.forEach((doc) => {
          if (!seen.has(doc.id)) {
            const data = buildActivityResponse(doc);
            if (data) {
              seen.set(doc.id, data);
            }
          }
        });
      });
      const aggregated = Array.from(seen.values()) as ActivityResponse[];
      activities = aggregated.filter((activity) => {
        if (!activity.point) {
          return false;
        }
        const distance = distanceKm([lat, lng], [activity.point.lat, activity.point.lng]);
        if (distance > radiusKm) {
          return false;
        }
        activity.distanceKm = distance;
        return true;
      });
    } else {
      let ref: Query = adminDb.collection("activities");
      if (city) {
        ref = ref.where("city", "==", city);
      }
      if (category) {
        ref = ref.where("category", "==", category);
      }
      if (dateFrom) {
        ref = ref.where("startTime", ">=", admin.firestore.Timestamp.fromDate(new Date(dateFrom)));
      }
      if (dateTo) {
        ref = ref.where("startTime", "<=", admin.firestore.Timestamp.fromDate(new Date(dateTo)));
      }
      const snapshot = await ref.orderBy("startTime", "asc").limit(MAX_RESULTS).get();
      activities = snapshot.docs
        .map((doc) => buildActivityResponse(doc))
        .filter((data): data is ActivityResponse => Boolean(data));
    }

    const filtered = activities
      .filter((activity) => {
        const startIso = typeof activity.startTime === "string" ? activity.startTime : null;
        if (dateFrom && startIso && new Date(startIso) < new Date(dateFrom)) {
          return false;
        }
        if (dateTo && startIso && new Date(startIso) > new Date(dateTo)) {
          return false;
        }
        if (query) {
          const lower = query.toLowerCase();
          const title = (activity.title as string | undefined)?.toLowerCase() ?? "";
          const description = (activity.description as string | undefined)?.toLowerCase() ?? "";
          if (!title.includes(lower) && !description.includes(lower)) {
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

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error(error);
    return problemJSON(500, "internal_error", "Failed to fetch activities.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const json = await req.json();
    const parsed = createActivitySchema.parse(json);
    const geohash = geohashFor(parsed.lat, parsed.lng);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = adminDb.collection("activities").doc();
    const activityData = {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category ?? null,
      startTime: admin.firestore.Timestamp.fromDate(new Date(parsed.startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(parsed.endTime)),
      city: parsed.city,
      point: new admin.firestore.GeoPoint(parsed.lat, parsed.lng),
      geohash,
      locationName: parsed.locationName ?? null,
      address: parsed.address ?? null,
      hostUserId: user.uid,
      hostGroupId: parsed.hostGroupId ?? null,
      visibility: parsed.visibility,
      maxAttendees: parsed.maxAttendees ?? null,
      isFeatured: false,
      featuredAdId: null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(activityData);

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Failed to create activity", error);
    return problemJSON(500, "internal_error", "Failed to create activity.");
  }
}
