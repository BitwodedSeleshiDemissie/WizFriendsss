import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { updateTicketSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

const isSupportStaff = (role: string) => role === "customer_service" || role === "admin";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return problemJSON(401, "unauthorized", "Authentication required.");
  }

  const doc = await adminDb.collection("tickets").doc(params.id).get();
  if (!doc.exists) {
    return problemJSON(404, "not_found", "Ticket not found.");
  }
  const ticket = doc.data()!;
  if (!isSupportStaff(user.role) && ticket.userId !== user.uid) {
    return problemJSON(403, "forbidden", "You cannot view this ticket.");
  }

  const serialized = serializeFirestoreDoc(doc);
  return Response.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const docRef = adminDb.collection("tickets").doc(params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return problemJSON(404, "not_found", "Ticket not found.");
    }
    const ticket = docSnap.data()!;

    const isOwner = ticket.userId === user.uid;
    const support = isSupportStaff(user.role);
    if (!support && !isOwner) {
      return problemJSON(403, "forbidden", "You cannot update this ticket.");
    }

    const payload = updateTicketSchema.parse(await req.json());
    const update: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (payload.message !== undefined) {
      update.message = payload.message;
    }

    if (support) {
      if (payload.status !== undefined) {
        update.status = payload.status;
      }
      if (payload.assignedCsUserId !== undefined) {
        update.assignedCsUserId = payload.assignedCsUserId ?? null;
      }
    } else {
      if (payload.status !== undefined || payload.assignedCsUserId !== undefined) {
        return problemJSON(403, "forbidden", "Only support staff can change status or assignment.");
      }
    }

    await docRef.update(update);
    return Response.json({ id: params.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Update ticket failed", error);
    return problemJSON(500, "internal_error", "Failed to update ticket.");
  }
}
