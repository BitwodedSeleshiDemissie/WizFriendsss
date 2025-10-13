"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { db } from "../lib/firebase";
import {
  DEFAULT_GROUP_IMAGE,
  ENDORSEMENT_THRESHOLD,
  INITIAL_ACTIVITIES,
  INITIAL_GROUPS,
  INITIAL_IDEAS,
  INITIAL_NOTIFICATIONS,
  SEED_OWNER,
  buildDefaultProfile,
} from "../lib/seedData";
import {
  buildDateFromForm,
  createDateFromSuggestion,
  generateIdeaFromPrompt,
} from "../lib/utils";

const AppDataContext = createContext();

const ACTIVITIES_CACHE_KEY = "homeconnect.cache.activities";
const GROUPS_CACHE_KEY = "homeconnect.cache.groups";
const IDEAS_CACHE_KEY = "homeconnect.cache.ideas";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readCollectionCache(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeCollectionCache(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Swallow write errors (e.g. private browsing quota) silently.
  }
}

export function AppDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid ?? null;

  const [activities, setActivities] = useState(() =>
    readCollectionCache(ACTIVITIES_CACHE_KEY, INITIAL_ACTIVITIES)
  );
  const [groups, setGroups] = useState(() =>
    readCollectionCache(GROUPS_CACHE_KEY, INITIAL_GROUPS)
  );
  const [ideas, setIdeas] = useState(() =>
    readCollectionCache(IDEAS_CACHE_KEY, INITIAL_IDEAS)
  );
  const [notifications, setNotifications] = useState([]);
  const [profileDoc, setProfileDoc] = useState(null);

  const [loadingActivities, setLoadingActivities] = useState(
    () => readCollectionCache(ACTIVITIES_CACHE_KEY, INITIAL_ACTIVITIES).length === 0
  );
  const [loadingGroups, setLoadingGroups] = useState(
    () => readCollectionCache(GROUPS_CACHE_KEY, INITIAL_GROUPS).length === 0
  );
  const [loadingIdeas, setLoadingIdeas] = useState(
    () => readCollectionCache(IDEAS_CACHE_KEY, INITIAL_IDEAS).length === 0
  );
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [isMutating, setIsMutating] = useState(false);

  const seedAppliedRef = useRef(false);
  const profilesCacheRef = useRef(new Map());

  const profileFallback = useMemo(() => buildDefaultProfile(user), [user]);

  const userProfile = useMemo(() => {
    if (!userId) {
      return {
        ...profileFallback,
        id: null,
        uid: null,
      };
    }
    return {
      ...profileFallback,
      ...(profileDoc || {}),
      id: userId,
      uid: userId,
      photoURL: profileDoc?.photoURL ?? profileFallback.photoURL,
    };
  }, [profileDoc, profileFallback, userId]);

  const joinedActivities = userProfile.joinedActivities ?? [];
  const savedActivities = userProfile.savedActivities ?? [];
  const joinedGroups = userProfile.joinedGroups ?? [];

  const seedDatabase = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      INITIAL_ACTIVITIES.forEach((activity) => {
        const ref = doc(db, "activities", activity.id);
        batch.set(ref, {
          ...activity,
          hostId: activity.hostId ?? SEED_OWNER.id,
          createdAt: now,
        });
      });

      INITIAL_GROUPS.forEach((group) => {
        const ref = doc(db, "groups", group.id);
        batch.set(ref, {
          ...group,
          membersCount: group.membersCount ?? group.memberIds?.length ?? 1,
          memberIds: group.memberIds ?? [SEED_OWNER.id],
          adminIds: group.adminIds ?? [SEED_OWNER.id],
          ownerId: group.ownerId ?? SEED_OWNER.id,
          createdAt: now,
        });
      });

      INITIAL_IDEAS.forEach((idea) => {
        const ref = doc(db, "ideas", idea.id);
        batch.set(ref, {
          ...idea,
          createdAt: now,
          updatedAt: now,
        });
      });

      INITIAL_NOTIFICATIONS.forEach((notification) => {
        const ref = doc(db, "notifications", notification.id ?? generateId());
        batch.set(ref, {
          title: notification.title,
          message: notification.message,
          recipientId: notification.recipientId ?? SEED_OWNER.id,
          createdAt: now,
          read: false,
          timeLabel: notification.time,
        });
      });

      batch.set(doc(db, "profiles", SEED_OWNER.id), {
        name: SEED_OWNER.name,
        tagline: SEED_OWNER.tagline,
        homeCity: SEED_OWNER.homeCity,
        currentCity: SEED_OWNER.currentCity,
        profileCompletion: SEED_OWNER.profileCompletion,
        interests: SEED_OWNER.interests,
        favourites: INITIAL_ACTIVITIES.slice(0, 2).map((activity) => activity.id),
        joinedActivities: INITIAL_ACTIVITIES.map((activity) => activity.id),
        savedActivities: INITIAL_ACTIVITIES.slice(0, 3).map((activity) => activity.id),
        joinedGroups: INITIAL_GROUPS.map((group) => group.id),
        createdAt: now,
        updatedAt: now,
        photoURL: "",
      });

      await batch.commit();
    } catch (error) {
      console.error("Failed to seed database", error);
    }
  }, []);

  useEffect(() => {
    const activitiesQuery = query(collection(db, "activities"), orderBy("dateTime"));
    const unsubscribe = onSnapshot(activitiesQuery, async (snapshot) => {
      if (!seedAppliedRef.current && snapshot.empty) {
        seedAppliedRef.current = true;
        await seedDatabase();
        return;
      }
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setActivities(docs);
      writeCollectionCache(ACTIVITIES_CACHE_KEY, docs);
      setLoadingActivities(false);
    });
    return () => unsubscribe();
  }, [seedDatabase]);

  useEffect(() => {
    const groupsQuery = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setGroups(docs);
      writeCollectionCache(GROUPS_CACHE_KEY, docs);
      setLoadingGroups(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ideasQuery = query(collection(db, "ideas"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(ideasQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setIdeas(docs);
      writeCollectionCache(IDEAS_CACHE_KEY, docs);
      setLoadingIdeas(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }
    setLoadingNotifications(true);
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setNotifications(docs);
      setLoadingNotifications(false);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfileDoc(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const profileRef = doc(db, "profiles", userId);
    const unsubscribe = onSnapshot(profileRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(profileRef, {
          ...buildDefaultProfile(user),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }
      const data = snapshot.data();
      profilesCacheRef.current.set(userId, { id: userId, ...data });
      setProfileDoc(data);
      setProfileLoading(false);
    });
    return () => unsubscribe();
  }, [userId, user]);

  const categories = useMemo(() => {
    const unique = new Set(activities.map((activity) => activity.category));
    return Array.from(unique);
  }, [activities]);

  const featuredActivities = useMemo(
    () => activities.filter((activity) => activity.featured),
    [activities]
  );

  const trendingActivities = useMemo(() => {
    return [...activities]
      .filter((activity) => !activity.isVirtual)
      .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
      .slice(0, 4);
  }, [activities]);

  const appendNotification = useCallback(
    async (title, message, recipientId = userId) => {
      if (!recipientId) return;
      try {
        await addDoc(collection(db, "notifications"), {
          title,
          message,
          recipientId,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (error) {
        console.error("Failed to append notification", error);
      }
    },
    [userId]
  );

  const createActivity = useCallback(
    async ({
      title,
      description,
      category,
      date,
      time,
      location,
      city,
      distance,
      isFeatured,
      isVirtual,
    }) => {
      if (!userId) throw new Error("Please sign in to create activities.");
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      const trimmedLocation = location.trim();
      const trimmedCategory = category.trim();

      if (!trimmedTitle || !trimmedDescription || !trimmedLocation || !trimmedCategory) {
        throw new Error("Please complete all required fields.");
      }

      setIsMutating(true);
      try {
        const dateTime = buildDateFromForm(date, time);
        const activityRef = await addDoc(collection(db, "activities"), {
          title: trimmedTitle,
          description: trimmedDescription,
          category: trimmedCategory,
          dateTime,
          location: trimmedLocation,
          city: city || userProfile.currentCity || "Cape Town",
          host: userProfile.name,
          hostId: userId,
          distance: Number(distance) || 5,
          attendees: 1,
          tags: [trimmedCategory.toLowerCase(), "community"],
          isNearby: (city || userProfile.currentCity || "Cape Town") === userProfile.currentCity,
          featured: Boolean(isFeatured),
          isVirtual: Boolean(isVirtual),
          createdAt: serverTimestamp(),
        });

        await setDoc(
          doc(db, "profiles", userId),
          {
            joinedActivities: arrayUnion(activityRef.id),
            savedActivities: arrayUnion(activityRef.id),
            favourites: arrayUnion(activityRef.id),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await appendNotification("Activity published", `${trimmedTitle} is now visible to the community.`);
        return activityRef.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, userId, userProfile]
  );

  const joinActivity = useCallback(
    async (activityId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (joinedActivities.includes(activityId)) return;
      setIsMutating(true);
      try {
        const activityRef = doc(db, "activities", activityId);
        const snapshot = await getDoc(activityRef);
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        await updateDoc(activityRef, {
          attendees: increment(1),
        });

        await setDoc(
          doc(db, "profiles", userId),
          {
            joinedActivities: arrayUnion(activityId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await appendNotification("Activity joined", `You're confirmed for ${data.title}. See you there!`);
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, joinedActivities, userId]
  );

  const toggleSaveActivity = useCallback(
    async (activityId) => {
      if (!userId) throw new Error("Please sign in first.");
      const isSaved = savedActivities.includes(activityId);
      setIsMutating(true);
      try {
        await setDoc(
          doc(db, "profiles", userId),
          {
            savedActivities: isSaved ? arrayRemove(activityId) : arrayUnion(activityId),
            favourites: isSaved ? arrayRemove(activityId) : arrayUnion(activityId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } finally {
        setIsMutating(false);
      }
    },
    [savedActivities, userId]
  );

  const promoteIdeaToActivity = useCallback(
    async (idea) => {
      if (!userId) return;
      const newActivityRef = await addDoc(collection(db, "activities"), {
        title: idea.title,
        description: idea.description,
        category: idea.category,
        dateTime: createDateFromSuggestion(idea.suggestedTime),
        location: idea.preferredLocation.includes("{city}")
          ? idea.preferredLocation.replace("{city}", userProfile.currentCity || "Cape Town")
          : idea.preferredLocation,
        city: userProfile.currentCity || "Cape Town",
        host: "Community Host",
        hostId: idea.createdById || userId,
        distance: 4,
        attendees: idea.supporters?.length ?? 0,
        tags: idea.tags,
        isNearby: true,
        featured: false,
        isVirtual: false,
        createdAt: serverTimestamp(),
      });

      await appendNotification("Idea approved", `${idea.title} is now live in Activities.`);

      await setDoc(
        doc(db, "profiles", userId),
        {
          joinedActivities: arrayUnion(newActivityRef.id),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [appendNotification, userId, userProfile.currentCity]
  );

  const submitIdeaPrompt = useCallback(
    async (prompt) => {
      if (!userId) throw new Error("Please sign in first.");
      const suggestion = generateIdeaFromPrompt(prompt, userProfile.currentCity || "Cape Town");
      await addDoc(collection(db, "ideas"), {
        ...suggestion,
        supporters: [userId],
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdById: userId,
      });

      await appendNotification("Idea published", `"${suggestion.title}" is live in Brainstorm.`);
    },
    [appendNotification, userId, userProfile.currentCity]
  );

  const endorseIdea = useCallback(
    async (ideaId) => {
      if (!userId) throw new Error("Please sign in first.");
      const ideaRef = doc(db, "ideas", ideaId);
      const snapshot = await getDoc(ideaRef);
      if (!snapshot.exists()) return;
      const currentData = snapshot.data();
      if (currentData.supporters?.includes(userId)) return;

      await updateDoc(ideaRef, {
        supporters: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });

      const updatedSnapshot = await getDoc(ideaRef);
      const updatedData = updatedSnapshot.data();
      if (!updatedData) return;

      const supporterCount = updatedData.supporters?.length ?? 0;
      if (supporterCount >= ENDORSEMENT_THRESHOLD && updatedData.status !== "launched") {
        await updateDoc(ideaRef, {
          status: "launched",
          launchedAt: serverTimestamp(),
        });
        await promoteIdeaToActivity({ id: ideaId, ...updatedData });
      } else if (supporterCount >= ENDORSEMENT_THRESHOLD - 1 && updatedData.status === "open") {
        await updateDoc(ideaRef, { status: "ready" });
      }
    },
    [promoteIdeaToActivity, userId]
  );

  const requestGroupImage = useCallback(async (queryTerm) => {
    if (!queryTerm) return null;
    try {
      const response = await fetch(`/api/group-image?query=${encodeURIComponent(queryTerm)}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Fallback group image fetch failed", error);
      return null;
    }
  }, []);

  const createGroup = useCallback(
    async ({ name, description, isPrivate, tags, image }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      if (!trimmedName || !trimmedDescription) {
        throw new Error("Please provide a name and description for the group.");
      }

      setIsMutating(true);
      try {
        const normalisedTags = tags.length > 0 ? tags : ["community"];
        let resolvedImage = image?.trim() || null;
        let photographer = null;
        let photographerUrl = null;

        if (!resolvedImage) {
          const fallbackQuery = normalisedTags[0] || trimmedName.split(" ").slice(0, 2).join(" ");
          const fallbackImage = await requestGroupImage(fallbackQuery);
          if (fallbackImage?.imageUrl) {
            resolvedImage = fallbackImage.imageUrl;
            photographer = fallbackImage.photographer || null;
            photographerUrl = fallbackImage.profileUrl || null;
          }
        }

        if (!resolvedImage) {
          resolvedImage = DEFAULT_GROUP_IMAGE;
        }

        const groupRef = await addDoc(collection(db, "groups"), {
          name: trimmedName,
          description: trimmedDescription,
          isPrivate,
          tags: normalisedTags,
          membersCount: 1,
          memberIds: [userId],
          adminIds: [userId],
          ownerId: userId,
          baseLocation: userProfile.currentCity || "Cape Town",
          nextActivity: "TBD · coordinate with members",
          cadence: "Flexible",
          image: resolvedImage,
          photographer,
          photographerUrl,
          createdAt: serverTimestamp(),
        });

        await setDoc(
          doc(db, "profiles", userId),
          {
            joinedGroups: arrayUnion(groupRef.id),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await appendNotification("Group created", `${trimmedName} is ready. Invite members to join.`);
        return groupRef.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, requestGroupImage, userId, userProfile.currentCity]
  );

  const joinGroup = useCallback(
    async (groupId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
          membersCount: increment(1),
          memberIds: arrayUnion(userId),
        });
        await setDoc(
          doc(db, "profiles", userId),
          {
            joinedGroups: arrayUnion(groupId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setGroups((previous) =>
          previous.map((group) => {
            if (group.id !== groupId) return group;
            const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            const alreadyMember = memberIds.includes(userId);
            const nextMemberIds = alreadyMember ? memberIds : [...memberIds, userId];
            const nextMembersCount = Math.max(
              (group.membersCount ?? memberIds.length) + (alreadyMember ? 0 : 1),
              nextMemberIds.length
            );
            return {
              ...group,
              membersCount: nextMembersCount,
              memberIds: nextMemberIds,
            };
          })
        );

        setProfileDoc((previous) => {
          const base = previous ?? {};
          const existing = Array.isArray(base.joinedGroups) ? base.joinedGroups : [];
          if (existing.includes(groupId)) return base;
          const next = {
            ...base,
            id: userId,
            joinedGroups: [...existing, groupId],
          };
          if (userId) {
            const cached = profilesCacheRef.current.get(userId) ?? {};
            profilesCacheRef.current.set(userId, { ...cached, ...next, id: userId });
          }
          return next;
        });

        const snapshot = await getDoc(groupRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          await appendNotification("Group joined", `Welcome to ${data.name}!`);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, joinedGroups, setGroups, setProfileDoc, userId]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (!joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
          membersCount: increment(-1),
          memberIds: arrayRemove(userId),
          adminIds: arrayRemove(userId),
        });

        await setDoc(
          doc(db, "profiles", userId),
          {
            joinedGroups: arrayRemove(groupId),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setGroups((previous) =>
          previous.map((group) => {
            if (group.id !== groupId) return group;
            const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            if (!memberIds.includes(userId)) return group;
            const nextMemberIds = memberIds.filter((id) => id !== userId);
            const nextMembersCount = Math.max(
              (group.membersCount ?? memberIds.length) - 1,
              nextMemberIds.length
            );
            return {
              ...group,
              membersCount: nextMembersCount,
              memberIds: nextMemberIds,
              adminIds: Array.isArray(group.adminIds)
                ? group.adminIds.filter((id) => id !== userId)
                : group.adminIds,
            };
          })
        );

        setProfileDoc((previous) => {
          const base = previous ?? {};
          const existing = Array.isArray(base.joinedGroups) ? base.joinedGroups : [];
          if (!existing.includes(groupId)) return base;
          const next = {
            ...base,
            id: userId,
            joinedGroups: existing.filter((id) => id !== groupId),
          };
          if (userId) {
            const cached = profilesCacheRef.current.get(userId) ?? {};
            profilesCacheRef.current.set(userId, { ...cached, ...next, id: userId });
          }
          return next;
        });
      } finally {
        setIsMutating(false);
      }
    },
    [joinedGroups, setGroups, setProfileDoc, userId]
  );

  const promoteGroupMember = useCallback(
    async (groupId, memberId) => {
      if (!userId) throw new Error("Please sign in first.");
      setIsMutating(true);
      try {
        const groupRef = doc(db, "groups", groupId);
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(groupRef);
          if (!snapshot.exists()) {
            throw new Error("Group not found.");
          }
          const data = snapshot.data();
          const adminIds = data.adminIds || [];
          const memberIds = data.memberIds || [];
          const isAdmin = data.ownerId === userId || adminIds.includes(userId);
          if (!isAdmin) {
            throw new Error("You do not have permission to promote members.");
          }
          if (!memberIds.includes(memberId)) {
            throw new Error("Member not found in this group.");
          }
          if (adminIds.includes(memberId)) {
            return;
          }
          transaction.update(groupRef, {
            adminIds: arrayUnion(memberId),
          });
        });

        await appendNotification(
          "You've been promoted",
          "You are now an admin of one of your communities.",
          memberId
        );
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, userId]
  );

  const createGroupNotice = useCallback(
    async (groupId, { title, message }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedTitle = title.trim();
      const trimmedMessage = message.trim();
      if (!trimmedTitle || !trimmedMessage) {
        throw new Error("Please provide both a title and a message.");
      }
      await addDoc(collection(db, "groups", groupId, "bulletins"), {
        type: "notice",
        title: trimmedTitle,
        message: trimmedMessage,
        createdAt: serverTimestamp(),
        createdById: userId,
        createdByName: userProfile.name,
      });
    },
    [userId, userProfile.name]
  );

  const createGroupPoll = useCallback(
    async (groupId, { question, options }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedQuestion = question.trim();
      const normalizedOptions = options
        .map((option) => option.trim())
        .filter(Boolean)
        .map((label) => ({
          id: generateId(),
          label,
          votes: 0,
        }));
      if (!trimmedQuestion || normalizedOptions.length < 2) {
        throw new Error("Polls need a question and at least two options.");
      }
      await addDoc(collection(db, "groups", groupId, "bulletins"), {
        type: "poll",
        question: trimmedQuestion,
        options: normalizedOptions,
        voters: {},
        createdAt: serverTimestamp(),
        createdById: userId,
        createdByName: userProfile.name,
      });
    },
    [userId, userProfile.name]
  );

  const voteGroupPoll = useCallback(
    async (groupId, bulletinId, optionId) => {
      if (!userId) throw new Error("Please sign in first.");
      const bulletinRef = doc(db, "groups", groupId, "bulletins", bulletinId);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(bulletinRef);
        if (!snapshot.exists()) {
          throw new Error("Poll not found.");
        }
        const data = snapshot.data();
        if (data.type !== "poll") {
          throw new Error("This bulletin is not a poll.");
        }
        const voters = data.voters || {};
        const previousVote = voters[userId] || null;
        if (previousVote === optionId) return;

        const options = (data.options || []).map((option) => {
          if (option.id === optionId) {
            return { ...option, votes: (option.votes || 0) + 1 };
          }
          if (previousVote && option.id === previousVote) {
            return { ...option, votes: Math.max((option.votes || 0) - 1, 0) };
          }
          return option;
        });

        voters[userId] = optionId;

        transaction.update(bulletinRef, {
          options,
          voters,
        });
      });
    },
    [userId]
  );

  const subscribeToGroupBulletins = useCallback((groupId, handler) => {
    const bulletinsQuery = query(
      collection(db, "groups", groupId, "bulletins"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(bulletinsQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      handler(docs);
    });
  }, []);

  const fetchGroupProfiles = useCallback(async (memberIds) => {
    if (!memberIds || memberIds.length === 0) return {};
    const cache = profilesCacheRef.current;
    const uniqueIds = Array.from(new Set(memberIds));
    const result = {};
    const missing = [];

    uniqueIds.forEach((id) => {
      if (cache.has(id)) {
        result[id] = cache.get(id);
      } else {
        missing.push(id);
      }
    });

    if (missing.length > 0) {
      const fetched = await Promise.all(
        missing.map(async (memberId) => {
          const snapshot = await getDoc(doc(db, "profiles", memberId));
          if (!snapshot.exists()) return null;
          const profile = { id: memberId, ...snapshot.data() };
          cache.set(memberId, profile);
          return profile;
        })
      );
      fetched.filter(Boolean).forEach((profile) => {
        result[profile.id] = profile;
      });
    }

    uniqueIds.forEach((id) => {
      if (!result[id] && cache.has(id)) {
        result[id] = cache.get(id);
      }
    });

    return result;
  }, []);

  const loading =
    authLoading ||
    loadingActivities ||
    loadingGroups ||
    loadingIdeas ||
    profileLoading;

  const value = useMemo(
    () => ({
      activities,
      categories,
      featuredActivities,
      trendingActivities,
      groups,
      ideas,
      notifications,
      userProfile,
      joinedActivities,
      savedActivities,
      joinedGroups,
      createActivity,
      joinActivity,
      toggleSaveActivity,
      submitIdeaPrompt,
      endorseIdea,
      createGroup,
      joinGroup,
      leaveGroup,
      promoteGroupMember,
      createGroupNotice,
      createGroupPoll,
      voteGroupPoll,
      subscribeToGroupBulletins,
      fetchGroupProfiles,
      appendNotification,
      endorsementThreshold: ENDORSEMENT_THRESHOLD,
      currentUserId: userId,
      currentUser: user,
      loading,
      loadingActivities,
      loadingGroups,
      loadingIdeas,
      loadingNotifications,
      profileLoading,
      isMutating,
    }),
    [
      activities,
      appendNotification,
      categories,
      createActivity,
      createGroup,
      createGroupNotice,
      createGroupPoll,
      endorseIdea,
      featuredActivities,
      fetchGroupProfiles,
      groups,
      ideas,
      isMutating,
      joinActivity,
      joinGroup,
      joinedActivities,
      joinedGroups,
      leaveGroup,
      loading,
      loadingActivities,
      loadingGroups,
      loadingIdeas,
      loadingNotifications,
      profileLoading,
      notifications,
      savedActivities,
      submitIdeaPrompt,
      subscribeToGroupBulletins,
      toggleSaveActivity,
      trendingActivities,
      user,
      userId,
      userProfile,
      voteGroupPoll,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};
