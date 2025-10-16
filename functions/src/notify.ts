import * as admin from "firebase-admin";

const db = admin.firestore();
const messaging = admin.messaging();

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const getTokensForUsers = async (userIds: string[]) => {
  if (!userIds.length) {
    return [];
  }

  const chunks: string[][] = [];
  const clone = [...userIds];
  while (clone.length) {
    chunks.push(clone.splice(0, 10));
  }

  const tokenSet = new Set<string>();
  for (const chunk of chunks) {
    const snapshot = await db.collection("userDevices").where("userId", "in", chunk).get();
    snapshot.forEach((doc) => {
      const token = doc.get("fcmToken");
      if (token) {
        tokenSet.add(token as string);
      }
    });
  }

  return Array.from(tokenSet);
};

export const sendPushToUsers = async (userIds: string[], payload: NotificationPayload) => {
  const tokens = await getTokensForUsers(userIds);
  if (!tokens.length) {
    return { successCount: 0, failureCount: 0 };
  }

  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
  });

  return { successCount: result.successCount, failureCount: result.failureCount };
};

export const sendEmail = async (to: string, subject: string, body: string) => {
  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    console.info("Email skipped (no provider configured)", { to, subject });
    return { skipped: true };
  }
  console.info("Email would send via provider", { to, subject, preview: body.slice(0, 120) });
  return { success: true };
};
