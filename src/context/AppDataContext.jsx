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

  const apiFetch = useCallback(
    async (path, { method = "GET", body, headers = {}, requireAuth = false } = {}) => {
      const finalHeaders = new Headers(headers);
      let finalBody = body;

      if (body && typeof body === "object" && !(body instanceof FormData)) {
        finalBody = JSON.stringify(body);
      }

      if (finalBody && !(finalBody instanceof FormData) && !finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }

      if (requireAuth) {
        if (!user) {
          throw new Error("Please sign in first.");
        }
        const token = await user.getIdToken();
        finalHeaders.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(path, {
        method,
        headers: finalHeaders,
        body: finalBody,
        credentials: "same-origin",
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const errorData = await response.json();
          message = errorData?.detail || errorData?.message || message;
        } catch {
          // ignore JSON parsing errors
        }
        throw new Error(message || "Request failed");
      }

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }

      return null;
    },
    [user]
  );

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
      let data = await apiFetch("/api/activities");
      if ((!data || data.length === 0) && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        data = await apiFetch("/api/activities");
      }

      if (!Array.isArray(data)) {
        setActivities([]);
        writeCollectionCache(ACTIVITIES_CACHE_KEY, []);
        return;
      }

      const currentCity = userProfile.currentCity || "Cape Town";
      const normalised = data.map((activity) => {
        const startTime = activity.startTime || activity.dateTime || activity.createdAt || new Date().toISOString();
        const endTime = activity.endTime || null;
        const locationLabel =
          activity.locationName ||
          activity.address ||
          (activity.city ? `${activity.city}${activity.address ? ` · ${activity.address}` : ""}` : "To be announced");

        return {
          id: activity.id,
          title: activity.title ?? "Untitled activity",
          description: activity.description ?? "",
          category: activity.category ?? "Community",
          dateTime: startTime,
          endTime,
          city: activity.city ?? null,
          location: locationLabel,
          host: activity.hostUserId ? "Community host" : activity.host ?? "Community host",
          hostId: activity.hostUserId ?? null,
          distance: activity.distanceKm ?? activity.distance ?? 0,
          attendees: activity.attendeeCount ?? activity.joinedCount ?? activity.attendees ?? 0,
          tags: activity.tags ?? [],
          isNearby:
            Boolean(activity.city) &&
            Boolean(currentCity) &&
            activity.city.toLowerCase() === currentCity.toLowerCase(),
          featured: Boolean(activity.isFeatured),
          isVirtual:
            activity.visibility === "private"
              ? false
              : Boolean(activity.city) && activity.city.toLowerCase() === "remote",
          visibility: activity.visibility ?? "public",
          maxAttendees: activity.maxAttendees ?? null,
        };
      });

      setActivities(normalised);
      writeCollectionCache(ACTIVITIES_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    } finally {
      setLoadingActivities(false);
    }
  }, [apiFetch, seedDatabase, userProfile.currentCity]);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      let data = await apiFetch("/api/groups");
      if ((!data || data.length === 0) && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        data = await apiFetch("/api/groups");
      }

      if (!Array.isArray(data)) {
        setGroups([]);
        writeCollectionCache(GROUPS_CACHE_KEY, []);
        return;
      }

      const normalised = data.map((group) => ({
        id: group.id,
        name: group.name ?? "Untitled group",
        description: group.description ?? "",
        city: group.city ?? userProfile.currentCity ?? "",
        isPublic: group.isPublic ?? !group.isPrivate,
        isPrivate: group.isPublic === false,
        image: group.bannerUrl ?? group.image ?? DEFAULT_GROUP_IMAGE,
        bannerUrl: group.bannerUrl ?? null,
        photographer: group.photographer ?? null,
        photographerUrl: group.photographerUrl ?? null,
        membersCount: group.membersCount ?? 0,
        memberIds: group.memberIds ?? [],
        adminIds: group.adminIds ?? [],
        ownerId: group.ownerId ?? group.createdBy ?? null,
        tags: group.tags ?? [],
        nextActivity: group.nextActivity ?? null,
        cadence: group.cadence ?? null,
        createdAt: group.createdAt ?? null,
        updatedAt: group.updatedAt ?? null,
      }));

      setGroups(normalised);
      writeCollectionCache(GROUPS_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoadingGroups(false);
    }
  }, [apiFetch, seedDatabase, userProfile.currentCity]);

  const fetchIdeas = useCallback(async () => {
    setLoadingIdeas(true);
    try {
      let data = await apiFetch("/api/ideas");
      if ((!data || data.length === 0) && !seedAppliedRef.current) {
        seedAppliedRef.current = true;
        await seedDatabase();
        data = await apiFetch("/api/ideas");
      }

      if (!Array.isArray(data)) {
        setIdeas([]);
        writeCollectionCache(IDEAS_CACHE_KEY, []);
        return;
      }

      const currentCity = userProfile.currentCity || "Cape Town";
      const normalised = data.map((idea) => {
        const endorsementCount = idea.endorsementCount ?? (Array.isArray(idea.supporters) ? idea.supporters.length : 0);
        const proposedStart = idea.proposedTimeWindow?.start ?? idea.proposedStart ?? null;
        const proposedEnd = idea.proposedTimeWindow?.end ?? idea.proposedEnd ?? null;
        const preferredLocation = idea.preferredLocation ?? idea.city ?? "To be announced";

        return {
          id: idea.id,
          title: idea.title ?? idea.promptText ?? "Community idea",
          promptText: idea.promptText ?? "",
          description: idea.aiSuggestion ?? idea.description ?? "",
          city: idea.city ?? currentCity,
          endorsementCount,
          endorsementThreshold: idea.endorsementThreshold ?? ENDORSEMENT_THRESHOLD,
          status: idea.status ?? "open",
          tags: idea.tags ?? [],
          supporters: idea.supporters ?? [],
          preferredLocation,
          proposedTimeWindow: idea.proposedTimeWindow ?? null,
          proposedStart,
          proposedEnd,
          createdAt: idea.createdAt ?? null,
          updatedAt: idea.updatedAt ?? null,
        };
      });

      setIdeas(normalised);
      writeCollectionCache(IDEAS_CACHE_KEY, normalised);
    } catch (error) {
      console.error("Failed to fetch ideas", error);
    } finally {
      setLoadingIdeas(false);
    }
  }, [apiFetch, seedDatabase, userProfile.currentCity]);

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
      if (!user) throw new Error("Please sign in to create activities.");
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

        const payload = {
          title: trimmedTitle,
          description: trimmedDescription,
          category: trimmedCategory || undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          city: city?.trim() || userProfile.currentCity || "Cape Town",
          lat: 0,
          lng: 0,
          locationName: trimmedLocation || undefined,
          address: trimmedLocation || undefined,
          visibility: isVirtual ? "private" : "public",
          hostGroupId: undefined,
          maxAttendees: undefined,
        };

        const response = await apiFetch("/api/activities", {
          method: "POST",
          requireAuth: true,
          body: payload,
        });

        const newActivityId = response?.id ?? null;

        if (newActivityId) {
          try {
            await apiFetch(`/api/activities/${newActivityId}/join`, {
              method: "POST",
              requireAuth: true,
              body: { status: "joined" },
            });
          } catch (joinError) {
            console.warn("Automatic activity join failed", joinError);
          }
        }

        await fetchActivities();
        await appendNotification("Activity published", `${trimmedTitle} is now visible to the community.`);
        return newActivityId;
      } finally {
        setIsMutating(false);
      }
    },
    [apiFetch, appendNotification, fetchActivities, user, userProfile.currentCity]
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
        let usedFallback = false;
        try {
          const result = await apiFetch(`/api/activities/${activityId}/join`, {
            method: "POST",
            requireAuth: true,
            body: { status: "joined" },
          });
          status = result?.status ?? "joined";
        } catch (error) {
          const message =
            (error && typeof error === "object" && "message" in error && typeof error.message === "string"
              ? error.message
              : "") || "";
          const allowFallback = message.toLowerCase().includes("failed");
          if (!allowFallback) {
            throw error instanceof Error
              ? error
              : new Error("We couldn't join this activity right now. Please try again.");
          }

          usedFallback = true;
          try {
            const maxAttendees =
              activity && typeof activity.maxAttendees === "number" ? activity.maxAttendees : null;
            const attendeeCount = activity && typeof activity.attendees === "number" ? activity.attendees : 0;
            status =
              maxAttendees && attendeeCount >= maxAttendees && !Number.isNaN(maxAttendees)
                ? "waitlist"
                : "joined";

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
          } catch (fallbackError) {
            console.error("Activity join fallback failed", fallbackError);
            const fallbackMessage =
              fallbackError instanceof Error && fallbackError.message
                ? fallbackError.message
                : "Unable to join this activity right now.";
            throw new Error(fallbackMessage);
          }
        }

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

        if (usedFallback && status === "joined") {
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
    [activities, apiFetch, appendNotification, fetchActivities, joinedActivities, user, userId, waitlistedActivities]
  );

  const toggleSaveActivity = useCallback(
    async (activityId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      const isSaved = savedActivities.includes(activityId);
      setIsMutating(true);
      try {
        await apiFetch(`/api/activities/${activityId}/save`, {
          method: "POST",
          requireAuth: true,
          body: { saved: !isSaved },
        });

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
    [apiFetch, savedActivities, user, userId]
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

        const response = await apiFetch("/api/ideas", {
          method: "POST",
          requireAuth: true,
          body: {
            promptText: trimmedPrompt,
            city: userProfile.currentCity || "Cape Town",
            aiSuggestion: suggestion.description,
            proposedStart,
            proposedEnd: proposedEndDate,
          },
        });

        const newIdeaId = response?.id ?? generateId();
        setIdeas((previous) => [
          {
            id: newIdeaId,
            title: suggestion.title,
            promptText: trimmedPrompt,
            description: suggestion.description,
            city: userProfile.currentCity || "Cape Town",
            endorsementCount: 0,
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
    [apiFetch, appendNotification, fetchIdeas, user, userId, userProfile.currentCity]
  );

  const endorseIdea = useCallback(
    async (ideaId) => {
      if (!user) throw new Error("Please sign in first.");
      setIsMutating(true);
      try {
        await apiFetch(`/api/ideas/${ideaId}/endorse`, {
          method: "POST",
          requireAuth: true,
        });
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
    [apiFetch, user, userId]
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

        const bannerUrl = resolvedImage && /^https?:\/\//i.test(resolvedImage) ? resolvedImage : undefined;

        const response = await apiFetch("/api/groups", {
          method: "POST",
          requireAuth: true,
          body: {
            name: trimmedName,
            description: trimmedDescription,
            city: userProfile.currentCity || "Cape Town",
            isPublic: !isPrivate,
            bannerUrl,
          },
        });

        const newGroupId = response?.id ?? null;

        if (newGroupId) {
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
        }

        await fetchGroups();
        await appendNotification("Group created", `${trimmedName} is ready. Invite members to join.`);
        return newGroupId;
      } finally {
        setIsMutating(false);
      }
    },
    [apiFetch, appendNotification, fetchGroups, requestGroupImage, user, userId, userProfile.currentCity]
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

        let usedFallback = false;
        try {
          await apiFetch(`/api/groups/${groupId}/members`, {
            method: "POST",
            requireAuth: true,
            body: {},
          });
        } catch (error) {
          const message =
            (error && typeof error === "object" && "message" in error && typeof error.message === "string"
              ? error.message
              : "") || "";
          const allowFallback = message.toLowerCase().includes("failed");
          if (!allowFallback) {
            throw error instanceof Error
              ? error
              : new Error("We couldn't join this group right now. Please try again.");
          }

          usedFallback = true;
          try {
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
          } catch (fallbackError) {
            console.error("Group join fallback failed", fallbackError);
            const fallbackMessage =
              fallbackError instanceof Error && fallbackError.message
                ? fallbackError.message
                : "Unable to join this group right now.";
            throw new Error(fallbackMessage);
          }
        }

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
    [apiFetch, appendNotification, fetchGroups, groups, joinedGroups, user, userId]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      if (!userId || !user) throw new Error("Please sign in first.");
      if (!joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        await apiFetch(`/api/groups/${groupId}/members`, {
          method: "DELETE",
          requireAuth: true,
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
    [apiFetch, fetchGroups, joinedGroups, user, userId]
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
