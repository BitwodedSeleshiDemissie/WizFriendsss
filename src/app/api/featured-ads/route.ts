import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { createFeaturedAdSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sponsorId = searchParams.get("sponsorId");
    const limitParam = Number(searchParams.get("limit") ?? 50);
    const limit = Math.min(Math.max(limitParam, 1), 100);

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

    return NextResponse.json(ads);
  } catch (error) {
    console.error("List featured ads failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch featured ads.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const payload = createFeaturedAdSchema.parse(await req.json());
    const activityRef = adminDb.collection("activities").doc(payload.activityId);
    const activitySnap = await activityRef.get();
    if (!activitySnap.exists) {
      return problemJSON(404, "not_found", "Linked activity not found.");
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

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Create featured ad failed", error);
    return problemJSON(500, "internal_error", "Failed to create featured ad.");
  }
}
