import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { notifyUpcomingActivities, convertEligibleIdeas, syncFeaturedAds } from "./jobs";
