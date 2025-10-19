"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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

const ACTIVITIES_CACHE_KEY = "wizfriends.cache.activities";
const GROUPS_CACHE_KEY = "wizfriends.cache.groups";
const IDEAS_CACHE_KEY = "wizfriends.cache.ideas";

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
  const [activityJoins, setActivityJoins] = useState([]);
  const [activitySaves, setActivitySaves] = useState([]);
  const [groupMemberships, setGroupMemberships] = useState([]);
  const [ideaEndorsements, setIdeaEndorsements] = useState([]);

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

  const toIsoString = useCallback((value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  }, []);

  const joinedActivities = useMemo(
    () =>
      activityJoins
        .filter((join) => join.status === "joined")
        .map((join) => join.activityId),
    [activityJoins]
  );
  const waitlistedActivities = useMemo(
    () =>
      activityJoins
        .filter((join) => join.status === "waitlist")
        .map((join) => join.activityId),
    [activityJoins]
  );
  const savedActivities = useMemo(() => activitySaves.map((item) => item.activityId), [activitySaves]);
  const joinedGroups = useMemo(() => groupMemberships.map((item) => item.groupId), [groupMemberships]);

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
      joinedActivities,
      savedActivities,
      joinedGroups,
    };
  }, [joinedActivities, joinedGroups, profileDoc, profileFallback, savedActivities, userId]);

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
          isPublic: group.isPrivate === false,
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

      const seedProfile = {
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
        role: "admin",
      };

      batch.set(doc(db, "profiles", SEED_OWNER.id), seedProfile);
      batch.set(doc(db, "users", SEED_OWNER.id), {
        name: SEED_OWNER.name,
        email: "",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });

      await batch.commit();
    } catch (error) {
      console.error("Failed to seed database", error);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const loadSnapshot = () => getDocs(collection(db, "activities"));

      let snapshot = await loadSnapshot();
      if (snapshot.empty && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        snapshot = await loadSnapshot();
      }

      const currentCity = userProfile.currentCity || "Cape Town";
      const normalised = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          const startTime =
            toIsoString(data.startTime) ||
            toIsoString(data.dateTime) ||
            toIsoString(data.createdAt) ||
            new Date().toISOString();
          const endTime = toIsoString(data.endTime);
          const locationLabel =
            data.locationName ||
            data.address ||
            (data.city ? `${data.city}${data.address ? ` · ${data.address}` : ""}` : "To be announced");

          return {
            id: docSnap.id,
            title: data.title ?? "Untitled activity",
            description: data.description ?? "",
            category: data.category ?? "Community",
            dateTime: startTime,
            endTime,
            city: data.city ?? null,
            location: locationLabel,
            host: data.hostUserId ? "Community host" : data.host ?? "Community host",
            hostId: data.hostUserId ?? null,
            distance: data.distanceKm ?? data.distance ?? 0,
            attendees: data.attendeeCount ?? data.joinedCount ?? data.attendees ?? 0,
            tags: data.tags ?? [],
            isNearby:
              Boolean(data.city) &&
              Boolean(currentCity) &&
              data.city.toLowerCase() === currentCity.toLowerCase(),
            featured: Boolean(data.isFeatured),
            isVirtual:
              data.visibility === "private"
                ? false
                : Boolean(data.city) && data.city.toLowerCase() === "remote",
            visibility: data.visibility ?? "public",
            maxAttendees: data.maxAttendees ?? null,
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.dateTime ?? 0).getTime();
          const bTime = new Date(b.dateTime ?? 0).getTime();
          return bTime - aTime;
        });

      setActivities(normalised);
      writeCollectionCache(ACTIVITIES_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    } finally {
      setLoadingActivities(false);
    }
  }, [seedDatabase, toIsoString, userProfile.currentCity]);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const loadSnapshot = () => getDocs(collection(db, "groups"));

      let snapshot = await loadSnapshot();
      if (snapshot.empty && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        snapshot = await loadSnapshot();
      }

      const normalised = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            name: data.name ?? "Untitled group",
            description: data.description ?? "",
            city: data.city ?? userProfile.currentCity ?? "",
            isPublic: data.isPublic ?? !data.isPrivate,
            isPrivate: data.isPublic === false,
            image: data.bannerUrl ?? data.image ?? DEFAULT_GROUP_IMAGE,
            bannerUrl: data.bannerUrl ?? null,
            photographer: data.photographer ?? null,
            photographerUrl: data.photographerUrl ?? null,
            membersCount: data.membersCount ?? (Array.isArray(data.memberIds) ? data.memberIds.length : 0),
            memberIds: data.memberIds ?? [],
            adminIds: data.adminIds ?? [],
            ownerId: data.ownerId ?? data.createdBy ?? null,
            tags: data.tags ?? [],
            nextActivity: data.nextActivity ?? null,
            cadence: data.cadence ?? null,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime();
          const bTime = new Date(b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });

      setGroups(normalised);
      writeCollectionCache(GROUPS_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoadingGroups(false);
    }
  }, [seedDatabase, toIsoString, userProfile.currentCity]);

  const fetchIdeas = useCallback(async () => {
    setLoadingIdeas(true);
    try {
      const loadSnapshot = () => getDocs(collection(db, "ideas"));

      let snapshot = await loadSnapshot();
      if (snapshot.empty && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        snapshot = await loadSnapshot();
      }

      const currentCity = userProfile.currentCity || "Cape Town";
      const normalised = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          const endorsementCount =
            data.endorsementCount ?? (Array.isArray(data.supporters) ? data.supporters.length : 0);
          const proposedStart =
            toIsoString(data.proposedTimeWindow?.start) ??
            toIsoString(data.proposedStart) ??
            null;
          const proposedEnd =
            toIsoString(data.proposedTimeWindow?.end) ??
            toIsoString(data.proposedEnd) ??
            null;
          const preferredLocation = data.preferredLocation ?? data.city ?? "To be announced";

          return {
            id: docSnap.id,
            title: data.title ?? data.promptText ?? "Community idea",
            promptText: data.promptText ?? "",
            description: data.aiSuggestion ?? data.description ?? "",
            city: data.city ?? currentCity,
            endorsementCount,
            endorsementThreshold: data.endorsementThreshold ?? ENDORSEMENT_THRESHOLD,
            status: data.status ?? "open",
            tags: data.tags ?? [],
            supporters: data.supporters ?? [],
            preferredLocation,
            proposedTimeWindow: data.proposedTimeWindow ?? null,
            proposedStart,
            proposedEnd,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime();
          const bTime = new Date(b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });

      setIdeas(normalised);
      writeCollectionCache(IDEAS_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch ideas", error);
    } finally {
      setLoadingIdeas(false);
    }
  }, [seedDatabase, toIsoString, userProfile.currentCity]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

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
      setActivityJoins([]);
      return;
    }
    const joinsQuery = query(collection(db, "userActivityJoin"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(joinsQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setActivityJoins(docs);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setActivitySaves([]);
      return;
    }
    const savesQuery = query(collection(db, "userActivitySave"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(savesQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setActivitySaves(docs);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setGroupMemberships([]);
      return;
    }
    const membershipQuery = query(collection(db, "groupMembers"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(membershipQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setGroupMemberships(docs);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setIdeaEndorsements([]);
      return;
    }
    const endorsementsQuery = query(collection(db, "ideaEndorse"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(endorsementsQuery, (snapshot) => {
      const ids = snapshot.docs.map((docSnap) => docSnap.get("ideaId") || docSnap.id.split("_")[0]);
      setIdeaEndorsements(ids);
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
    const userIndexRef = doc(db, "users", userId);
    const ensureUserIndex = async (profileData) => {
      try {
        const payload = {
          name: profileData?.name ?? profileFallback.name,
          email: profileData?.email ?? profileFallback.email ?? "",
          role: profileData?.role ?? "user",
          updatedAt: serverTimestamp(),
        };
        if (!profileData?.createdAt) {
          payload.createdAt = serverTimestamp();
        }
        await setDoc(userIndexRef, payload, { merge: true });
      } catch {
        // Swallow index sync issues; server will create if needed.
      }
    };
    const unsubscribe = onSnapshot(profileRef, async (snapshot) => {
      if (!snapshot.exists()) {
        const defaultProfile = {
          ...profileFallback,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await Promise.all([setDoc(profileRef, defaultProfile), ensureUserIndex(defaultProfile)]);
        return;
      }
      const data = snapshot.data();
      profilesCacheRef.current.set(userId, { id: userId, ...data });
      setProfileDoc(data);
      setProfileLoading(false);
      await ensureUserIndex(data);
    });
    return () => unsubscribe();
  }, [profileFallback, user, userId]);

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
      isVirtual,
    }) => {
      if (!user || !userId) throw new Error("Please sign in to create activities.");
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();
      const trimmedLocation = location.trim();
      const trimmedCategory = category.trim();

      if (!trimmedTitle || !trimmedDescription || !trimmedLocation) {
        throw new Error("Please complete all required fields.");
      }

      setIsMutating(true);
      try {
        const startTimeIso = buildDateFromForm(date, time);
        const startDate = new Date(startTimeIso);
        if (Number.isNaN(startDate.getTime())) {
          throw new Error("Please provide a valid date and time.");
        }
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

        const nowCity = city?.trim() || userProfile.currentCity || "Cape Town";
        const newActivityRef = await addDoc(collection(db, "activities"), {
          title: trimmedTitle,
          description: trimmedDescription,
          category: trimmedCategory || "Community",
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          city: nowCity,
          locationName: trimmedLocation || null,
          address: trimmedLocation || null,
          visibility: isVirtual ? "private" : "public",
          hostUserId: userId,
          createdBy: userId,
          attendeeCount: 1,
          isFeatured: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(
          doc(db, "userActivityJoin", `${newActivityRef.id}_${userId}`),
          {
            activityId: newActivityRef.id,
            userId,
            status: "joined",
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setActivityJoins((previous) => {
          const docId = `${newActivityRef.id}_${userId}`;
          if (previous.some((entry) => entry.id === docId)) {
            return previous;
          }
          return [
            ...previous,
            {
              id: docId,
              activityId: newActivityRef.id,
              userId,
              status: "joined",
              joinedAt: new Date().toISOString(),
            },
          ];
        });

        await fetchActivities();
        await appendNotification("Activity published", `${trimmedTitle} is now visible to the community.`);
        return newActivityRef.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchActivities, user, userId, userProfile.currentCity]
  );

  const joinActivity = useCallback(
    async (activityId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      if (joinedActivities.includes(activityId) || waitlistedActivities.includes(activityId)) return;
      setIsMutating(true);
      try {
        const activity = activities.find((item) => item.id === activityId);
        const activityTitle = activity?.title ?? "this activity";

        let status = "joined";
        await runTransaction(db, async (transaction) => {
          const activityRef = doc(db, "activities", activityId);
          const snapshot = await transaction.get(activityRef);
          if (!snapshot.exists()) {
            throw new Error("Activity not found.");
          }
          const data = snapshot.data() || {};
          const maxAttendees =
            typeof data.maxAttendees === "number" && !Number.isNaN(data.maxAttendees) ? data.maxAttendees : null;
          const attendeeCount =
            typeof data.attendeeCount === "number" && !Number.isNaN(data.attendeeCount) ? data.attendeeCount : 0;

          if (maxAttendees && attendeeCount >= maxAttendees) {
            status = "waitlist";
          } else {
            transaction.update(activityRef, {
              attendeeCount: increment(1),
              updatedAt: serverTimestamp(),
            });
            status = "joined";
          }
        });

        await setDoc(
          doc(db, "userActivityJoin", `${activityId}_${userId}`),
          {
            activityId,
            userId,
            status,
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setActivityJoins((previous) => {
          const docId = `${activityId}_${userId}`;
          const existingIndex = previous.findIndex((join) => join.id === docId);
          const entry = {
            id: docId,
            activityId,
            userId,
            status,
            joinedAt: new Date().toISOString(),
          };
          if (existingIndex >= 0) {
            const copy = [...previous];
            copy[existingIndex] = { ...copy[existingIndex], ...entry };
            return copy;
          }
          return [...previous, entry];
        });

        if (status === "joined") {
          setActivities((previous) =>
            previous.map((item) => {
              if (item.id !== activityId) return item;
              const current = typeof item.attendees === "number" ? item.attendees : 0;
              return {
                ...item,
                attendees: current + 1,
              };
            })
          );
        }

        try {
          await fetchActivities();
        } catch (refreshError) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to refresh activities after join", refreshError);
          }
        }

        if (status === "waitlist") {
          await appendNotification(
            "Added to waitlist",
            activity
              ? `${activity.title} is full right now. We'll notify you if a spot opens.`
              : "This activity is full right now. We'll notify you if a spot opens."
          );
        } else {
          await appendNotification(
            "Activity joined",
            activity
              ? `You're confirmed for ${activity.title}. See you there!`
              : `You're confirmed for ${activityTitle}. See you there!`
          );
        }
      } finally {
        setIsMutating(false);
      }
    },
    [activities, appendNotification, fetchActivities, joinedActivities, user, userId, waitlistedActivities]
  );

  const toggleSaveActivity = useCallback(
    async (activityId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      const isSaved = savedActivities.includes(activityId);
      setIsMutating(true);
      try {
        const saveRef = doc(db, "userActivitySave", `${activityId}_${userId}`);
        if (isSaved) {
          await deleteDoc(saveRef);
        } else {
          await setDoc(
            saveRef,
            {
              activityId,
              userId,
              savedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setActivitySaves((previous) => {
          const docId = `${activityId}_${userId}`;
          if (isSaved) {
            return previous.filter((doc) => doc.id !== docId);
          }
          const entry = {
            id: docId,
            activityId,
            userId,
            savedAt: new Date().toISOString(),
          };
          return [...previous, entry];
        });
      } finally {
        setIsMutating(false);
      }
    },
    [savedActivities, user, userId]
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
      if (!user) throw new Error("Please sign in first.");
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error("Please describe your idea before submitting.");
      }

      setIsMutating(true);
      try {
        const suggestion = generateIdeaFromPrompt(trimmedPrompt, userProfile.currentCity || "Cape Town");
        const proposedStart = createDateFromSuggestion(suggestion.suggestedTime);
        const proposedEndDate = new Date(new Date(proposedStart).getTime() + 90 * 60 * 1000).toISOString();

        const newIdeaRef = await addDoc(collection(db, "ideas"), {
          promptText: trimmedPrompt,
          city: userProfile.currentCity || "Cape Town",
          aiSuggestion: suggestion.description,
          proposedStart,
          proposedEnd: proposedEndDate,
          supporters: userId ? [userId] : [],
          endorsementCount: userId ? 1 : 0,
          endorsementThreshold: ENDORSEMENT_THRESHOLD,
          status: "open",
          createdBy: userId ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const newIdeaId = newIdeaRef.id || generateId();
        setIdeas((previous) => [
          {
            id: newIdeaId,
            title: suggestion.title,
            promptText: trimmedPrompt,
            description: suggestion.description,
            city: userProfile.currentCity || "Cape Town",
            endorsementCount: userId ? 1 : 0,
            endorsementThreshold: ENDORSEMENT_THRESHOLD,
            status: "open",
            tags: suggestion.tags,
            supporters: [userId ?? ""].filter(Boolean),
            preferredLocation: suggestion.preferredLocation,
            proposedTimeWindow: null,
            proposedStart,
            proposedEnd: proposedEndDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...previous,
        ]);
        setIdeaEndorsements((previous) => (userId ? [...previous, newIdeaId] : previous));

        await fetchIdeas();
        await appendNotification("Idea published", `"${suggestion.title}" is live in Brainstorm.`);
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchIdeas, user, userId, userProfile.currentCity]
  );

  const endorseIdea = useCallback(
    async (ideaId) => {
      if (!user) throw new Error("Please sign in first.");
      setIsMutating(true);
      try {
        let alreadyEndorsed = false;
        await runTransaction(db, async (transaction) => {
          const ideaRef = doc(db, "ideas", ideaId);
          const snapshot = await transaction.get(ideaRef);
          if (!snapshot.exists()) {
            throw new Error("Idea not found.");
          }
          const data = snapshot.data() || {};
          const supporters = Array.isArray(data.supporters) ? data.supporters : [];
          if (userId && supporters.includes(userId)) {
            alreadyEndorsed = true;
            return;
          }
          const currentCount =
            typeof data.endorsementCount === "number" && !Number.isNaN(data.endorsementCount)
              ? data.endorsementCount
              : supporters.length;
          const nextCount = currentCount + 1;
          const threshold =
            typeof data.endorsementThreshold === "number" && !Number.isNaN(data.endorsementThreshold)
              ? data.endorsementThreshold
              : ENDORSEMENT_THRESHOLD;
          const nextStatus =
            nextCount >= threshold && data.status !== "launched" ? "ready" : data.status ?? "open";

          transaction.update(ideaRef, {
            endorsementCount: increment(1),
            status: nextStatus,
            supporters: userId ? arrayUnion(userId) : supporters,
            updatedAt: serverTimestamp(),
          });
        });

        if (alreadyEndorsed) {
          return;
        }

        if (userId) {
          await setDoc(
            doc(db, "ideaEndorse", `${ideaId}_${userId}`),
            {
              ideaId,
              userId,
              endorsedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setIdeaEndorsements((previous) => (previous.includes(ideaId) ? previous : [...previous, ideaId]));
        setIdeas((previous) =>
          previous.map((idea) => {
            if (idea.id !== ideaId) return idea;
            const nextCount = (idea.endorsementCount ?? idea.supporters?.length ?? 0) + 1;
            const supporters = Array.isArray(idea.supporters) ? [...idea.supporters] : [];
            if (!supporters.includes(userId ?? "")) {
              supporters.push(userId ?? "");
            }
            let status = idea.status;
            if (nextCount >= (idea.endorsementThreshold ?? ENDORSEMENT_THRESHOLD)) {
              status = status === "launched" ? status : "ready";
            }
            return {
              ...idea,
              endorsementCount: nextCount,
              supporters,
              status,
            };
          })
        );
      } finally {
        setIsMutating(false);
      }
    },
    [user, userId]
  );

  const requestGroupImage = useCallback(async () => null, []);

  const createGroup = useCallback(
    async ({ name, description, isPrivate, tags, image }) => {
      if (!user) throw new Error("Please sign in first.");
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

        const bannerUrl = resolvedImage && /^https?:\/\//i.test(resolvedImage) ? resolvedImage : null;

        const groupRef = await addDoc(collection(db, "groups"), {
          name: trimmedName,
          description: trimmedDescription,
          city: userProfile.currentCity || "Cape Town",
          isPublic: !isPrivate,
          isPrivate,
          bannerUrl,
          image: resolvedImage || DEFAULT_GROUP_IMAGE,
          membersCount: 1,
          memberIds: [userId],
          adminIds: [userId],
          ownerId: userId,
          tags: normalisedTags,
          photographer,
          photographerUrl,
          nextActivity: "TBD · coordinate with members",
          cadence: "Flexible",
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const newGroupId = groupRef.id;

        await setDoc(
          doc(db, "groupMembers", `${newGroupId}_${userId}`),
          {
            groupId: newGroupId,
            userId,
            role: "owner",
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setGroupMemberships((previous) => {
          const docId = `${newGroupId}_${userId}`;
          if (previous.some((entry) => entry.id === docId)) {
            return previous;
          }
          return [
            ...previous,
            {
              id: docId,
              groupId: newGroupId,
              userId,
              role: "owner",
              joinedAt: new Date().toISOString(),
            },
          ];
        });

        setGroups((previous) => [
          ...previous,
          {
            id: newGroupId,
            name: trimmedName,
            description: trimmedDescription,
            city: userProfile.currentCity || "Cape Town",
            isPublic: !isPrivate,
            isPrivate,
            image: resolvedImage || DEFAULT_GROUP_IMAGE,
            membersCount: 1,
            memberIds: [userId],
            adminIds: [userId],
            ownerId: userId,
            tags: normalisedTags,
            nextActivity: "TBD · coordinate with members",
            cadence: "Flexible",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photographer,
            photographerUrl,
          },
        ]);

        await fetchGroups();
        await appendNotification("Group created", `${trimmedName} is ready. Invite members to join.`);
        return newGroupId;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchGroups, requestGroupImage, user, userId, userProfile.currentCity]
  );

  const joinGroup = useCallback(
    async (groupId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      if (joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        const group = groups.find((item) => item.id === groupId);
        if (!group) {
          throw new Error("Group not found.");
        }

        await runTransaction(db, async (transaction) => {
          const groupRef = doc(db, "groups", groupId);
          const snapshot = await transaction.get(groupRef);
          if (!snapshot.exists()) {
            throw new Error("Group not found.");
          }
          const data = snapshot.data() || {};
          const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
          if (!memberIds.includes(userId)) {
            transaction.update(groupRef, {
              memberIds: arrayUnion(userId),
              membersCount: increment(1),
              updatedAt: serverTimestamp(),
            });
          }
        });

        await setDoc(
          doc(db, "groupMembers", `${groupId}_${userId}`),
          {
            groupId,
            userId,
            role: "member",
            joinedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setGroupMemberships((previous) => {
          const docId = `${groupId}_${userId}`;
          if (previous.some((entry) => entry.id === docId)) {
            return previous;
          }
          return [
            ...previous,
            {
              id: docId,
              groupId,
              userId,
              role: "member",
            joinedAt: new Date().toISOString(),
          },
        ];
        });

        setGroups((previous) =>
          previous.map((existing) => {
            if (existing.id !== groupId) return existing;
            const memberIds = Array.isArray(existing.memberIds) ? existing.memberIds : [];
            const alreadyMember = memberIds.includes(userId);
            return {
              ...existing,
              memberIds: alreadyMember ? memberIds : [...memberIds, userId],
              membersCount: (existing.membersCount ?? memberIds.length) + (alreadyMember ? 0 : 1),
            };
          })
        );

        try {
          await fetchGroups();
        } catch (refreshError) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to refresh groups after join", refreshError);
          }
        }

        if (group) {
          await appendNotification("Group joined", `Welcome to ${group.name}!`);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchGroups, groups, joinedGroups, user, userId]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      if (!joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        await deleteDoc(doc(db, "groupMembers", `${groupId}_${userId}`));

        await runTransaction(db, async (transaction) => {
          const groupRef = doc(db, "groups", groupId);
          const snapshot = await transaction.get(groupRef);
          if (!snapshot.exists()) {
            return;
          }
          const data = snapshot.data() || {};
          const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
          const membersCount =
            typeof data.membersCount === "number" && !Number.isNaN(data.membersCount) ? data.membersCount : memberIds.length;
          if (!memberIds.includes(userId)) {
            return;
          }
          transaction.update(groupRef, {
            memberIds: arrayRemove(userId),
            adminIds: arrayRemove(userId),
            membersCount: membersCount > 0 ? increment(-1) : 0,
            updatedAt: serverTimestamp(),
          });
        });

        setGroupMemberships((previous) => previous.filter((entry) => !(entry.groupId === groupId && entry.userId === userId)));
        setGroups((previous) =>
          previous.map((group) => {
            if (group.id !== groupId) return group;
            const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
            if (!memberIds.includes(userId)) return group;
            const nextMemberIds = memberIds.filter((id) => id !== userId);
            return {
              ...group,
              memberIds: nextMemberIds,
              membersCount: Math.max((group.membersCount ?? memberIds.length) - 1, nextMemberIds.length),
              adminIds: Array.isArray(group.adminIds) ? group.adminIds.filter((id) => id !== userId) : group.adminIds,
            };
          })
        );

        await fetchGroups();
      } finally {
        setIsMutating(false);
      }
    },
    [fetchGroups, joinedGroups, user, userId]
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
      waitlistedActivities,
      savedActivities,
      joinedGroups,
      ideaEndorsements,
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
      ideaEndorsements,
      isMutating,
      joinActivity,
      joinGroup,
      joinedActivities,
      waitlistedActivities,
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
