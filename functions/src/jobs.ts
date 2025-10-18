import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { geohashForLocation } from "geofire-common";
import { sendPushToUsers } from "./notify";

const db = admin.firestore();

const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;
const hoursToMilliseconds = (hours: number) => hours * 60 * 60 * 1000;

const windowMatches = async (target: Date, deltaMinutes: number) => {
  const start = new Date(target.getTime() - minutesToMilliseconds(deltaMinutes));
  const end = new Date(target.getTime() + minutesToMilliseconds(deltaMinutes));
  const snapshot = await db
    .collection("activities")
    .where("startTime", ">=", admin.firestore.Timestamp.fromDate(start))
    .where("startTime", "<=", admin.firestore.Timestamp.fromDate(end))
    .get();
  return snapshot.docs;
};

export const notifyUpcomingActivities = onSchedule({ schedule: "every 30 minutes" }, async () => {
  const now = new Date();
  const targets = [
    new Date(now.getTime() + hoursToMilliseconds(24)),
    new Date(now.getTime() + hoursToMilliseconds(2)),
  ];

  const processedActivities = new Set<string>();

  for (const target of targets) {
    const docs = await windowMatches(target, 15);
    for (const doc of docs) {
      if (processedActivities.has(doc.id)) {
        continue;
      }
      processedActivities.add(doc.id);
      const joinSnapshot = await db
        .collection("userActivityJoin")
        .where("activityId", "==", doc.id)
        .where("status", "==", "joined")
        .get();
      const userIds = joinSnapshot.docs.map((join) => join.get("userId") as string);
      if (!userIds.length) {
        continue;
      }
      const activity = doc.data();
      const title = activity.title ?? "Upcoming activity";
      const startTime = activity.startTime?.toDate()?.toLocaleString() ?? "";
      await sendPushToUsers(userIds, {
        title,
        body: `Starts ${startTime}`,
        data: { activityId: doc.id },
      });
    }
  }

});

export const convertEligibleIdeas = onSchedule({ schedule: "every 60 minutes" }, async () => {
  const snapshot = await db
    .collection("ideas")
    .where("status", "==", "open")
    .where("endorsementCount", ">=", 1)
    .get();

  const now = new Date();
  for (const doc of snapshot.docs) {
    const idea = doc.data();
    if ((idea.endorsementThreshold ?? 25) > (idea.endorsementCount ?? 0)) {
      continue;
    }

    const conversion = await db.runTransaction(async (tx) => {
      const freshIdea = await tx.get(doc.ref);
      const data = freshIdea.data();
      if (!data || data.status !== "open") {
        return null;
      }
      if ((data.endorsementCount ?? 0) < (data.endorsementThreshold ?? 25)) {
        return null;
      }

      const activitiesRef = db.collection("activities").doc();
      const startDate =
        data.proposedTimeWindow?.start?.toDate?.() ?? new Date(now.getTime() + hoursToMilliseconds(24));
      const endDate =
        data.proposedTimeWindow?.end?.toDate?.() ?? new Date(startDate.getTime() + hoursToMilliseconds(2));

      const lat = data.proposedPoint?.latitude ?? 0;
      const lng = data.proposedPoint?.longitude ?? 0;
      const geohash = geohashForLocation([lat, lng]);

      tx.set(activitiesRef, {
        title: data.promptText,
        description: data.aiSuggestion ?? "Auto-generated from community idea.",
        category: null,
        startTime: admin.firestore.Timestamp.fromDate(startDate),
        endTime: admin.firestore.Timestamp.fromDate(endDate),
        city: data.city ?? "Unknown",
        point: new admin.firestore.GeoPoint(lat, lng),
        geohash,
        locationName: "TBD",
        address: null,
        hostUserId: data.createdBy,
        hostGroupId: null,
        visibility: "public",
        maxAttendees: null,
        isFeatured: false,
        featuredAdId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(doc.ref, {
        status: "converted",
        convertedActivityId: activitiesRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ideaId: doc.id,
        activityId: activitiesRef.id,
        promptText: data.promptText as string,
      };
    });

    if (conversion) {
      const endorsementsSnapshot = await db.collection("ideaEndorse").where("ideaId", "==", doc.id).get();
      const endorsers = endorsementsSnapshot.docs.map((endorseDoc) => endorseDoc.get("userId") as string);
      if (endorsers.length) {
        await sendPushToUsers(endorsers, {
          title: "Idea converted!",
          body: `Your idea "${conversion.promptText}" is now an activity.`,
          data: { ideaId: conversion.ideaId, activityId: conversion.activityId },
        });
      }
    }
  }

});

export const syncFeaturedAds = onSchedule({ schedule: "every 15 minutes" }, async () => {
  const now = new Date();
  const activeCandidates = await db
    .collection("featuredAds")
    .where("status", "in", ["pending_review", "active"])
    .get();

  for (const doc of activeCandidates.docs) {
    const ad = doc.data();
    const startsAt: admin.firestore.Timestamp = ad.startsAt;
    const endsAt: admin.firestore.Timestamp = ad.endsAt;
    const activityRef = db.collection("activities").doc(ad.activityId);
    const startDate = startsAt.toDate();
    const endDate = endsAt.toDate();

    if (now >= startDate && now <= endDate && ad.approvedByCsUserId) {
      if (ad.status !== "active") {
        await doc.ref.update({
          status: "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await activityRef.update({
        isFeatured: true,
        featuredAdId: doc.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (now > endDate && ad.status !== "expired") {
      await doc.ref.update({
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await activityRef.update({
        isFeatured: false,
        featuredAdId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (now < startDate && ad.status === "active") {
      await doc.ref.update({
        status: "pending_review",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await activityRef.update({
        isFeatured: false,
        featuredAdId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

});
