import admin, { adminDb } from "@/lib/firebaseAdmin";
import { notificationTokenSchema } from "@/lib/validate";
import { okJson, requireUser, withApiHandler } from "./helpers";

export const registerNotificationToken = withApiHandler(async ({ req }) => {
  const user = await requireUser(req);
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

  return okJson({ success: true });
});
