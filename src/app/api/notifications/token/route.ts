import { NextRequest } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { getUserFromAuthHeader } from "@/lib/auth";
import { notificationTokenSchema } from "@/lib/validate";
import { problemJSON } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return problemJSON(401, "unauthorized", "Authentication required.");
    }

    const payload = notificationTokenSchema.parse(await req.json());
    const docId = `${user.uid}_${payload.deviceId}`;

    await adminDb
      .collection("userDevices")
      .doc(docId)
      .set({
        userId: user.uid,
        deviceId: payload.deviceId,
        fcmToken: payload.fcmToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return Response.json({ success: true });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return problemJSON(400, "validation_error", error.message, { issues: error.issues });
    }
    console.error("Register notification token failed", error);
    return problemJSON(500, "internal_error", "Failed to register notification token.");
  }
}
