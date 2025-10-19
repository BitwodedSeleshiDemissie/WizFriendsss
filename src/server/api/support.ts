import type { Query } from "firebase-admin/firestore";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { createTicketSchema } from "@/lib/validate";
import { serializeFirestoreDoc } from "@/lib/serialize";
import {
  createdJson,
  okJson,
  parseLimitParam,
  requireUser,
  withApiHandler,
} from "./helpers";

const isSupportStaff = (role: string) => role === "customer_service" || role === "admin";

export const listTickets = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseLimitParam(searchParams.get("limit"), { fallback: 50, max: 100 });

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

  return okJson(tickets);
});

export const createTicket = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
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

  return createdJson({ id: docRef.id });
});
