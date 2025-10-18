import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const isMember = async (groupId: string, userId: string) => {
  const doc = await adminDb.collection("groupMembers").doc(`${groupId}_${userId}`).get();
  return doc.exists;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const groupDoc = await adminDb.collection("groups").doc(params.id).get();
    if (!groupDoc.exists) {
      return problemJSON(404, "not_found", "Group not found.");
    }
    const group = groupDoc.data()!;

    const user = await getUserFromAuthHeader(req);
    if (!group.isPublic) {
      if (!user) {
        return problemJSON(401, "unauthorized", "Authentication required for private groups.");
      }
      if (user.role !== "admin" && !(await isMember(params.id, user.uid))) {
        return problemJSON(403, "forbidden", "Membership required for private group activities.");
      }
    }

    const snapshot = await adminDb
      .collection("activities")
      .where("hostGroupId", "==", params.id)
      .orderBy("startTime", "desc")
      .limit(100)
      .get();
    const activities = snapshot.docs
      .map((doc) => serializeFirestoreDoc(doc))
      .filter((doc): doc is Record<string, unknown> => Boolean(doc));

    return Response.json(activities, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error("List group activities failed", error);
    return problemJSON(500, "internal_error", "Failed to fetch group activities.");
  }
}
