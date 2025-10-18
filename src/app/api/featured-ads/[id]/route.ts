import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { problemJSON } from "@/lib/errors";
import { serializeFirestoreDoc } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await adminDb.collection("featuredAds").doc(params.id).get();
  if (!doc.exists) {
    return problemJSON(404, "not_found", "Featured ad not found.");
  }
  const serialized = serializeFirestoreDoc(doc);
  return Response.json(serialized);
}
