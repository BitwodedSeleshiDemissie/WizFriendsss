import { adminDb, adminMessaging } from "./firebaseAdmin";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export const fetchTokensForUsers = async (userIds: string[]): Promise<string[]> => {
  if (!userIds.length) {
    return [];
  }

  const tokenDocs = await adminDb
    .collection("userDevices")
    .where("userId", "in", userIds.slice(0, 10)) // Firestore `in` limit is 10
    .get();

  const tokens = new Set<string>();
  tokenDocs.forEach((doc) => {
    const data = doc.data();
    if (data?.fcmToken) {
      tokens.add(data.fcmToken);
    }
  });

  return Array.from(tokens);
};

export const sendPushToTokens = async (tokens: string[], payload: PushNotificationPayload) => {
  if (!tokens.length) {
    return { successCount: 0, failureCount: 0 };
  }

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
    data: payload.data,
  });

  return { successCount: response.successCount, failureCount: response.failureCount };
};

export const sendPushToUsers = async (userIds: string[], payload: PushNotificationPayload) => {
  const allTokens = await fetchTokensForUsers(userIds);
  return sendPushToTokens(allTokens, payload);
};
