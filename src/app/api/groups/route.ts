import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { createGroupSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const MAX_GROUPS = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const q = searchParams.get("q");

    let ref: Query = adminDb.collection("groups").orderBy("createdAt", "desc");
    if (city) {
      ref = ref.where("city", "==", city);
    }

    const snapshot = await ref.limit(MAX_GROUPS).get();
    let groups = snapshot.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((doc): doc is Record<string, unknown> => Boolean(doc));

    if (q) {
      const lower = q.toLowerCase();
      groups = groups.filter((group) => {
        const name = (group.name as string | undefined)?.toLowerCase() ?? "";
        const description = (group.description as string | undefined)?.toLowerCase() ?? "";
        return name.includes(lower) || description.includes(lower);
      });
    }

    return NextResponse.json(groups.slice(0, MAX_GROUPS), {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    console.error("List groups failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch groups.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

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

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Create group failed", error);
    return problemJSON(500, "internal_error", "Failed to create group.");
  }
}
