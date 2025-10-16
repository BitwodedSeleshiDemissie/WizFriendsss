import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { geohashFor } from "@/lib/geosearch";
import { getUserFromAuthHeader } from "@/lib/auth";
import { createIdeaSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const status = searchParams.get("status");
    const limitParam = Number(searchParams.get("limit") ?? 50);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    let query: Query = adminDb.collection("ideas").orderBy("createdAt", "desc");
    if (city) {
      query = query.where("city", "==", city);
    }
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.limit(limit).get();
    const ideas = snapshot.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((doc): doc is Record<string, unknown> => Boolean(doc));

    return NextResponse.json(ideas, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("List ideas failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch ideas.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

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

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Create idea failed", error);
    return problemJSON(500, "internal_error", "Failed to create idea.");
  }
}
