import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { createTicketSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const isSupportStaff = (role: string) => role === "customer_service" || role === "admin";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  let query: Query = adminDb.collection("tickets").orderBy("createdAt", "desc");
  if (!isSupportStaff(user.role)) {
    query = query.where("userId", "==", user.uid);
  }
  if (status) {
    query = query.where("status", "==", status);
  }

  const snapshot = await query.limit(limit).get();
  const tickets = snapshot.docs
    .map((doc) => serializeFirestoreDoc(doc))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc));

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const payload = createTicketSchema.parse(await req.json());
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = adminDb.collection("tickets").doc();
    await docRef.set({
      userId: user.uid,
      subject: payload.subject,
      message: payload.message,
      status: "open",
      assignedCsUserId: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Create ticket failed", error);
    return problemJSON(500, "internal_error", "Failed to create support ticket.");
  }
}
