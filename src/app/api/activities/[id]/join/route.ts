import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { joinActivitySchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

const joinDocId = (activityId: string, userId: string) => `${activityId}_${userId}`;

const computeJoinedStatus = async (activityId: string, maxAttendees?: number | null) => {
  if (!maxAttendees) {
    return "joined" as const;
  }

  const aggregation = await adminDb
    .collection("userActivityJoin")
    .where("activityId", "==", activityId)
    .where("status", "==", "joined")
    .count()
    .get();

  const joinedCount = aggregation.data().count ?? 0;
  if (joinedCount >= maxAttendees) {
    return "waitlist" as const;
  }
  return "joined" as const;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const doc = await adminDb.collection("userActivityJoin").doc(joinDocId(params.id, user.uid)).get();
  if (!doc.exists) {
    return Response.json({ status: "none" });
  }

  return Response.json(doc.data());
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const activitySnap = await adminDb.collection("activities").doc(params.id).get();
    if (!activitySnap.exists) {
      return problemJSON(404, "not_found", "Activity not found.");
    }

    const payload = joinActivitySchema.parse(await req.json().catch(() => ({})));
    const desiredStatus = payload.status ?? "joined";

    const maxAttendees = activitySnap.get("maxAttendees") as number | null;
    let status = desiredStatus;
    if (desiredStatus === "joined") {
      status = await computeJoinedStatus(params.id, maxAttendees);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await adminDb
      .collection("userActivityJoin")
      .doc(joinDocId(params.id, user.uid))
      .set(
        {
          activityId: params.id,
          userId: user.uid,
          status,
          joinedAt: now,
        },
        { merge: true }
      );

    return Response.json({ status });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Join activity failed", error);
    return problemJSON(500, "internal_error", "Failed to join activity.");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  await adminDb
    .collection("userActivityJoin")
    .doc(joinDocId(params.id, user.uid))
    .set(
      {
        activityId: params.id,
        userId: user.uid,
        status: "canceled",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return Response.json({ status: "canceled" });
}
