"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { resolvePlaceFromText } from "../lib/placeSuggestions";
import { useAuth } from "./AuthContext";
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

const TABLES = {
  activities: "activities",
  groups: "groups",
  ideas: "ideas",
  notifications: "notifications",
  profiles: "profiles",
  activityJoins: "user_activity_join",
  activitySaves: "user_activity_save",
  groupMembers: "group_members",
  ideaEndorsements: "idea_endorse",
  groupBulletins: "group_bulletins",
  groupMessages: "group_messages",
};

const ACTIVITIES_CACHE_KEY = "wizfriends.cache.activities";
const GROUPS_CACHE_KEY = "wizfriends.cache.groups";
const IDEAS_CACHE_KEY = "wizfriends.cache.ideas";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function coerceIso(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
  }
  return null;
}

function ensureNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return fallback;
}

function ensureBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  return fallback;
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item == null) return "";
      return String(item).trim();
    })
    .filter(Boolean);
}

function ensureObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function normalizeProfileRow(row = {}, fallback = {}) {
  const profile = {
    ...fallback,
    ...row,
  };
  profile.id = row.id ?? fallback.id ?? null;
  profile.name = row.name ?? fallback.name ?? "";
  profile.tagline = row.tagline ?? fallback.tagline ?? "";
  profile.homeCity = row.homeCity ?? row.home_city ?? fallback.homeCity ?? "";
  profile.currentCity = row.currentCity ?? row.current_city ?? fallback.currentCity ?? "";
  profile.photoURL = row.photoURL ?? row.photo_url ?? fallback.photoURL ?? "";
  profile.bio = row.bio ?? row.about ?? fallback.bio ?? "";
  profile.role = row.role ?? row.profile_role ?? fallback.role ?? "";
  profile.pronouns = row.pronouns ?? row.pronoun ?? fallback.pronouns ?? "";
  profile.website = row.website ?? row.portfolio ?? row.site ?? fallback.website ?? "";
  profile.phone = row.phone ?? row.phone_number ?? fallback.phone ?? "";
  profile.interests = ensureStringArray(row.interests ?? fallback.interests ?? []);
  profile.profileCompletion = ensureNumber(
    row.profileCompletion ?? row.profile_completion ?? fallback.profileCompletion ?? 60,
    60
  );
  profile.createdAt = coerceIso(row.createdAt ?? row.created_at) ?? fallback.createdAt ?? new Date().toISOString();
  profile.updatedAt = coerceIso(row.updatedAt ?? row.updated_at) ?? new Date().toISOString();
  return profile;
}



const PROFILE_COLUMN_MAP = {
  name: "name",
  email: "email",
  tagline: "tagline",
  bio: "bio",
  role: "role",
  pronouns: "pronouns",
  website: "website",
  phone: "phone",
  interests: "interests",
  homeCity: "home_city",
  currentCity: "current_city",
  profileCompletion: "profile_completion",
  photoURL: "photo_url",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function mapProfileUpdatesToRow(updates = {}) {
  const mapped = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const column = PROFILE_COLUMN_MAP[key];
    if (!column) {
      // ignore fields we do not persist in the profile table
      return;
    }
    mapped[column] = value;
  });
  return mapped;
}

function normaliseActivity(row) {
  if (!row) return null;
  const dateTime =
    coerceIso(
      row.dateTime ??
        row.start_time ??
        row.startTime ??
        row.date_time ??
        row.date ??
        row.startAt ??
        row.start_at
    ) ?? new Date().toISOString();
  const endTime =
    coerceIso(
      row.end_time ??
        row.endTime ??
        row.end_at ??
        row.endAt
    ) ?? null;
  const attendees =
    ensureNumber(
      row.attendeeCount ??
        row.attendee_count ??
        row.attendees,
      0
    );
  const tags = ensureStringArray(row.tags ?? []);
  const latitudeRaw = ensureNumber(
    row.latitude ??
      row.lat ??
      row.latDegrees ??
      row.lat_degrees ??
      row.lat_decimal,
    null
  );
  const longitudeRaw = ensureNumber(
    row.longitude ??
      row.lng ??
      row.lon ??
      row.long ??
      row.lngDegrees ??
      row.lng_degrees ??
      row.lng_decimal,
    null
  );
  const locationTextRaw = row.location ?? row.location_name ?? row.address ?? "";
  const locationText = typeof locationTextRaw === "string" ? locationTextRaw.trim() : "";
  const cityTextRaw = row.city ?? row.city_name ?? row.cityName ?? "";
  const cityText =
    typeof cityTextRaw === "string" && cityTextRaw.trim() ? cityTextRaw.trim() : "Torino";
  const isVirtual = ensureBoolean(row.isVirtual ?? row.is_virtual ?? false);
  const isNearby = ensureBoolean(row.isNearby ?? row.is_nearby ?? true);

  let latitude = Number.isFinite(latitudeRaw) ? latitudeRaw : null;
  let longitude = Number.isFinite(longitudeRaw) ? longitudeRaw : null;

  if (!isVirtual && (latitude == null || longitude == null)) {
    const resolved = resolvePlaceFromText({ location: locationText, city: cityText });
    if (resolved) {
      if (latitude == null && typeof resolved.latitude === "number") {
        latitude = resolved.latitude;
      }
      if (longitude == null && typeof resolved.longitude === "number") {
        longitude = resolved.longitude;
      }
    }
  }

  return {
    id: row.id ?? generateId(),
    title: row.title ?? "Untitled activity",
    description: row.description ?? "",
    category: row.category ?? "Community",
    dateTime,
    startTime: dateTime,
    endTime,
    city: cityText,
    location: locationText,
    locationName: row.location_name ?? row.location ?? "",
    address: row.address ?? row.location ?? "",
    host: row.host ?? row.host_name ?? row.hostName ?? "Community Host",
    hostId: row.hostId ?? row.host_user_id ?? row.hostUserId ?? SEED_OWNER.id,
    distance: ensureNumber(
      row.distance ??
        row.distance_km ??
        (typeof row.distance_m === "number" ? row.distance_m / 1000 : undefined),
      0
    ),
    attendees,
    tags,
    featured: ensureBoolean(row.featured ?? row.isFeatured ?? row.is_featured ?? false),
    isNearby,
    isVirtual,
    visibility: row.visibility ?? (isVirtual ? "private" : "public"),
    maxAttendees: row.maxAttendees ?? row.max_attendees ?? null,
    latitude,
    longitude,
    createdAt: coerceIso(row.created_at ?? row.createdAt) ?? new Date().toISOString(),
    updatedAt: coerceIso(row.updated_at ?? row.updatedAt),
  };
}

function normaliseGroup(row) {
  if (!row) return null;
  const ownerId = row.ownerId ?? row.owner_id ?? row.created_by ?? SEED_OWNER.id;
  const adminIds = ensureStringArray(row.adminIds ?? row.admin_ids ?? row.admins ?? []);
  const memberIds = ensureStringArray(row.memberIds ?? row.member_ids ?? row.members ?? []);
  return {
    id: row.id ?? generateId(),
    name: row.name ?? "Untitled group",
    description: row.description ?? "",
    isPrivate: ensureBoolean(row.isPrivate ?? row.is_private ?? false),
    isPublic: ensureBoolean(
      row.isPublic ??
        row.is_public ??
        !ensureBoolean(row.isPrivate ?? row.is_private ?? false)
    ),
    tags: ensureStringArray(row.tags ?? []),
    image: row.image ?? row.image_url ?? DEFAULT_GROUP_IMAGE,
    baseLocation: row.baseLocation ?? row.base_location ?? "",
    nextActivity: row.nextActivity ?? row.next_activity ?? "",
    cadence: row.cadence ?? "",
    ownerId,
    adminIds: adminIds.length ? adminIds : [ownerId],
    memberIds: memberIds.length ? memberIds : [ownerId],
    membersCount:
      ensureNumber(row.membersCount ?? row.members_count, memberIds.length) || (memberIds.length || 1),
    createdAt: coerceIso(row.created_at ?? row.createdAt) ?? new Date().toISOString(),
    updatedAt: coerceIso(row.updated_at ?? row.updatedAt),
  };
}

function normaliseIdea(row) {
  if (!row) return null;
  const supporters = ensureStringArray(row.supporters ?? row.supporter_ids ?? []);
  const endorsementCount = ensureNumber(
    row.endorsementCount ?? row.endorsement_count ?? supporters.length,
    supporters.length
  );
  const endorsementThreshold = ensureNumber(
    row.endorsementThreshold ?? row.endorsement_threshold ?? ENDORSEMENT_THRESHOLD,
    ENDORSEMENT_THRESHOLD
  );
  return {
    id: row.id ?? generateId(),
    title: row.title ?? row.promptText ?? "Community idea",
    promptText: row.promptText ?? row.prompt_text ?? "",
    description: row.description ?? row.aiSuggestion ?? row.ai_suggestion ?? "",
    aiSuggestion: row.aiSuggestion ?? row.ai_suggestion ?? "",
    category: row.category ?? "Social & Connection",
    city: row.city ?? "Cape Town",
    endorsementCount,
    endorsementThreshold,
    status: row.status ?? "open",
    supporters,
    tags: ensureStringArray(row.tags ?? []),
    preferredLocation: row.preferredLocation ?? row.preferred_location ?? "",
    suggestedTime: row.suggestedTime ?? row.suggested_time ?? "",
    proposedStart: coerceIso(row.proposedStart ?? row.proposed_start),
    proposedEnd: coerceIso(row.proposedEnd ?? row.proposed_end),
    createdAt: coerceIso(row.created_at ?? row.createdAt) ?? new Date().toISOString(),
    updatedAt: coerceIso(row.updated_at ?? row.updatedAt),
    createdBy: row.createdBy ?? row.created_by ?? null,
    launchedActivityId: row.launchedActivityId ?? row.launched_activity_id ?? null,
  };
}


function shouldDisplayIdea(idea) {
  return Boolean(idea) && idea.status !== "launched" && !idea.launchedActivityId;
}

function normaliseNotification(row) {
  if (!row) return null;
  return {
    id: row.id ?? generateId(),
    title: row.title ?? "",
    message: row.message ?? "",
    recipientId: row.recipientId ?? row.recipient_id ?? null,
    read: ensureBoolean(row.read ?? row.is_read ?? false),
    createdAt: coerceIso(row.created_at ?? row.createdAt) ?? new Date().toISOString(),
    timeLabel: row.timeLabel ?? row.time_label ?? null,
  };
}

function normaliseJoin(row) {
  if (!row) return null;
  const activityId = row.activityId ?? row.activity_id ?? null;
  const userId = row.userId ?? row.user_id ?? null;
  return {
    id: row.id ?? `${activityId ?? generateId()}_${userId ?? generateId()}`,
    activityId,
    userId,
    status: row.status ?? "joined",
    joinedAt: coerceIso(row.joinedAt ?? row.joined_at) ?? new Date().toISOString(),
  };
}

function normaliseSave(row) {
  if (!row) return null;
  const activityId = row.activityId ?? row.activity_id ?? null;
  const userId = row.userId ?? row.user_id ?? null;
  return {
    id: row.id ?? `${activityId ?? generateId()}_${userId ?? generateId()}`,
    activityId,
    userId,
    savedAt: coerceIso(row.savedAt ?? row.saved_at) ?? new Date().toISOString(),
  };
}

function normaliseMembership(row) {
  if (!row) return null;
  const groupId = row.groupId ?? row.group_id ?? null;
  const userId = row.userId ?? row.user_id ?? null;
  return {
    id: row.id ?? `${groupId ?? generateId()}_${userId ?? generateId()}`,
    groupId,
    userId,
    role: row.role ?? "member",
    joinedAt: coerceIso(row.joinedAt ?? row.joined_at) ?? new Date().toISOString(),
  };
}

function normaliseBulletin(row) {
  if (!row) return null;
  const optionsRaw = Array.isArray(row.options) ? row.options : [];
  const voters = ensureObject(row.voters);
  return {
    id: row.id ?? generateId(),
    groupId: row.groupId ?? row.group_id ?? null,
    type: row.type ?? "notice",
    title: row.title ?? "",
    message: row.message ?? "",
    question: row.question ?? "",
    options: optionsRaw.map((option) => {
      if (typeof option === "string") {
        return { id: generateId(), label: option, votes: 0 };
      }
      if (!option || typeof option !== "object") {
        return { id: generateId(), label: "", votes: 0 };
      }
      return {
        id: option.id ?? generateId(),
        label: option.label ?? "",
        votes: ensureNumber(option.votes ?? 0, 0),
      };
    }),
    voters,
    createdAt: coerceIso(row.created_at ?? row.createdAt) ?? new Date().toISOString(),
    createdById: row.createdById ?? row.created_by_id ?? row.created_by ?? null,
    createdByName: row.createdByName ?? row.created_by_name ?? "",
  };
}

function normaliseGroupMessage(row) {
  if (!row) return null;
  return {
    id: row.id ?? generateId(),
    groupId: row.groupId ?? row.group_id ?? null,
    senderId: row.senderId ?? row.sender_id ?? null,
    senderName: row.senderName ?? row.sender_name ?? "",
    content: row.content ?? row.message ?? "",
    createdAt: coerceIso(row.createdAt ?? row.created_at) ?? new Date().toISOString(),
    system: ensureBoolean(row.system ?? row.isSystem ?? false),
  };
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
  } catch {
    // Ignore quota and private mode errors.
  }
}

export function AppDataProvider({ children }) {
  const { user, session, loading: authLoading } = useAuth();
  const userId = user?.id ?? user?.uid ?? session?.user?.id ?? null;
  const displayName =
    user?.user_metadata?.full_name ??
    user?.displayName ??
    user?.email ??
    session?.user?.email ??
    "Community member";

  const [activities, setActivities] = useState(() =>
    readCollectionCache(ACTIVITIES_CACHE_KEY, INITIAL_ACTIVITIES.map(normaliseActivity).filter(Boolean))
  );
  const [groups, setGroups] = useState(() =>
    readCollectionCache(GROUPS_CACHE_KEY, INITIAL_GROUPS.map(normaliseGroup).filter(Boolean))
  );
  const [ideas, setIdeas] = useState(() =>
    readCollectionCache(IDEAS_CACHE_KEY, INITIAL_IDEAS.map(normaliseIdea).filter(Boolean)).filter(shouldDisplayIdea)
  );
  const [notifications, setNotifications] = useState([]);
  const [profileDoc, setProfileDoc] = useState(null);
  const [activityJoins, setActivityJoins] = useState([]);
  const [activitySaves, setActivitySaves] = useState([]);
  const [groupMemberships, setGroupMemberships] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});

  const [ideaEndorsements, setIdeaEndorsements] = useState([]);

  const [loadingActivities, setLoadingActivities] = useState(activities.length === 0);
  const [loadingGroups, setLoadingGroups] = useState(groups.length === 0);
  const [loadingIdeas, setLoadingIdeas] = useState(ideas.length === 0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const profilesCacheRef = useRef(new Map());

  const canUseIdsWithSupabase = useCallback(
    (...ids) => ids.every((id) => id == null || isValidUuid(id)),
    []
  );

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

  const savedActivities = useMemo(
    () => activitySaves.map((item) => item.activityId),
    [activitySaves]
  );

  const joinedGroups = useMemo(
    () => groupMemberships.map((item) => item.groupId),
    [groupMemberships]
  );

  const userProfile = useMemo(() => {
    if (!userId) {
      return {
        ...profileFallback,
        id: null,
        uid: null,
      };
    }
    const stored = profileDoc
      ? {
          ...profileDoc,
          createdAt: coerceIso(profileDoc.createdAt ?? profileDoc.created_at) ?? new Date().toISOString(),
          updatedAt: coerceIso(profileDoc.updatedAt ?? profileDoc.updated_at),
        }
      : {};
    return {
      ...profileFallback,
      ...stored,
      id: userId,
      uid: userId,
      name: stored.name ?? profileFallback.name ?? displayName,
      photoURL: stored.photoURL ?? stored.photo_url ?? profileFallback.photoURL,
      joinedActivities,
      savedActivities,
      joinedGroups,
    };
  }, [displayName, joinedActivities, joinedGroups, profileDoc, profileFallback, savedActivities, userId]);

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

  const loading =
    authLoading ||
    loadingActivities ||
    loadingGroups ||
    loadingIdeas ||
    profileLoading;

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      if (!supabase) {
        setActivities((previous) => {
          if (previous.length > 0) return previous;
          const fallback = INITIAL_ACTIVITIES.map(normaliseActivity).filter(Boolean);
          writeCollectionCache(ACTIVITIES_CACHE_KEY, fallback);
          return fallback;
        });
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.activities)
        .select("*")
        .order("start_time", { ascending: true });
      if (error) throw error;
      const mapped = (data ?? []).map(normaliseActivity).filter(Boolean);
      if (mapped.length === 0) {
        const fallback = INITIAL_ACTIVITIES.map(normaliseActivity).filter(Boolean);
        setActivities(fallback);
        writeCollectionCache(ACTIVITIES_CACHE_KEY, fallback);
        return;
      }
      setActivities(mapped);
      writeCollectionCache(ACTIVITIES_CACHE_KEY, mapped);
    } catch (error) {
      console.error("Failed to fetch activities", error);
      if (activities.length === 0) {
        const fallback = INITIAL_ACTIVITIES.map(normaliseActivity).filter(Boolean);
        setActivities(fallback);
      }
    } finally {
      setLoadingActivities(false);
    }
  }, [activities.length]);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      if (!supabase) {
        setGroups((previous) => {
          if (previous.length > 0) return previous;
          const fallback = INITIAL_GROUPS.map(normaliseGroup).filter(Boolean);
          writeCollectionCache(GROUPS_CACHE_KEY, fallback);
          return fallback;
        });
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.groups)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const mapped = (data ?? []).map(normaliseGroup).filter(Boolean);
      if (mapped.length === 0) {
        const fallback = INITIAL_GROUPS.map(normaliseGroup).filter(Boolean);
        setGroups(fallback);
        writeCollectionCache(GROUPS_CACHE_KEY, fallback);
        return;
      }
      setGroups(mapped);
      writeCollectionCache(GROUPS_CACHE_KEY, mapped);
    } catch (error) {
      console.error("Failed to fetch groups", error);
      if (groups.length === 0) {
        const fallback = INITIAL_GROUPS.map(normaliseGroup).filter(Boolean);
        setGroups(fallback);
      }
    } finally {
      setLoadingGroups(false);
    }
  }, [groups.length]);

  const fetchIdeas = useCallback(async () => {
    setLoadingIdeas(true);
    try {
      if (!supabase) {
        setIdeas((previous) => {
          if (previous.length > 0) return previous;
          const fallback = INITIAL_IDEAS.map(normaliseIdea).filter(Boolean).filter(shouldDisplayIdea);
          writeCollectionCache(IDEAS_CACHE_KEY, fallback);
          return fallback;
        });
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.ideas)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data ?? []).map(normaliseIdea).filter(Boolean).filter(shouldDisplayIdea);
      setIdeas(mapped);
      writeCollectionCache(IDEAS_CACHE_KEY, mapped);
    } catch (error) {
      console.error("Failed to fetch ideas", error);
      if (ideas.length === 0) {
        const fallback = INITIAL_IDEAS.map(normaliseIdea).filter(Boolean).filter(shouldDisplayIdea);
        setIdeas(fallback);
      }
    } finally {
      setLoadingIdeas(false);
    }
  }, [ideas.length]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setLoadingNotifications(true);
    try {
      if (!supabase) {
        const seeded = INITIAL_NOTIFICATIONS.filter(
          (item) => !item.recipientId || item.recipientId === userId
        ).map((item) =>
          normaliseNotification({
            ...item,
            recipientId: userId,
            createdAt: item.createdAt ?? new Date().toISOString(),
          })
        );
        setNotifications(seeded);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.notifications)
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNotifications((data ?? []).map(normaliseNotification).filter(Boolean));
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [userId]);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfileDoc(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      if (!supabase) {
        setProfileDoc(null);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const timestamp = new Date().toISOString();
        const fallbackProfile = {
          id: userId,
          name: profileFallback.name ?? displayName,
          email: user?.email ?? session?.user?.email ?? "",
          homeCity: profileFallback.homeCity,
          currentCity: profileFallback.currentCity,
          tagline: profileFallback.tagline ?? "",
          interests: ensureStringArray(profileFallback.interests ?? []),
          profileCompletion: profileFallback.profileCompletion ?? 60,
          photoURL: profileFallback.photoURL ?? "",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const payload = {
          id: userId,
          ...mapProfileUpdatesToRow({
            name: fallbackProfile.name,
            email: fallbackProfile.email,
            homeCity: fallbackProfile.homeCity,
            currentCity: fallbackProfile.currentCity,
            tagline: fallbackProfile.tagline,
            interests: fallbackProfile.interests,
            profileCompletion: fallbackProfile.profileCompletion,
            photoURL: fallbackProfile.photoURL,
            createdAt: fallbackProfile.createdAt,
            updatedAt: fallbackProfile.updatedAt,
          }),
        };
        const { data: inserted, error: insertError } = await supabase
          .from(TABLES.profiles)
          .upsert(payload, { onConflict: "id" })
          .select("*")
          .single();
        if (insertError) throw insertError;
        const normalized = normalizeProfileRow(inserted ?? payload, fallbackProfile);
        profilesCacheRef.current.set(userId, { id: userId, ...normalized });
        setProfileDoc(normalized);
        return;
      }
      const profile = normalizeProfileRow(data, profileFallback);
      profilesCacheRef.current.set(userId, { id: userId, ...profile });
      setProfileDoc(profile);
    } catch (error) {
      console.error("Failed to fetch profile", error);
      setProfileDoc(null);
    } finally {
      setProfileLoading(false);
    }
  }, [displayName, profileFallback, session, user, userId]);

  const fetchActivityConnections = useCallback(async () => {
    if (!userId) {
      setActivityJoins([]);
      setActivitySaves([]);
      return;
    }
    try {
      if (!supabase) {
        setActivityJoins([]);
        setActivitySaves([]);
        return;
      }
      const [{ data: joinsData, error: joinsError }, { data: savesData, error: savesError }] = await Promise.all([
        supabase.from(TABLES.activityJoins).select("*").eq("user_id", userId),
        supabase.from(TABLES.activitySaves).select("*").eq("user_id", userId),
      ]);
      if (joinsError) throw joinsError;
      if (savesError) throw savesError;
      setActivityJoins((joinsData ?? []).map(normaliseJoin).filter(Boolean));
      setActivitySaves((savesData ?? []).map(normaliseSave).filter(Boolean));
    } catch (error) {
      console.error("Failed to fetch activity connections", error);
    }
  }, [userId]);

  const fetchGroupMemberships = useCallback(async () => {
    if (!userId) {
      setGroupMemberships([]);
      return;
    }
    try {
      if (!supabase) {
        const seedMemberships = INITIAL_GROUPS.map((group) =>
          normaliseMembership({
            group_id: group.id,
            user_id: SEED_OWNER.id,
            role: "owner",
            joined_at: new Date().toISOString(),
          })
        ).filter(Boolean);
        setGroupMemberships(seedMemberships);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.groupMembers)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      setGroupMemberships((data ?? []).map(normaliseMembership).filter(Boolean));
    } catch (error) {
      console.error("Failed to fetch group memberships", error);
    }
  }, [userId]);

  const fetchIdeaEndorsements = useCallback(async () => {
    if (!userId) {
      setIdeaEndorsements([]);
      return;
    }
    try {
      if (!supabase) {
        setIdeaEndorsements([]);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.ideaEndorsements)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      const ids = (data ?? [])
        .map((row) => row.ideaId ?? row.idea_id)
        .filter(Boolean);
      setIdeaEndorsements(ids);
    } catch (error) {
      console.error("Failed to fetch idea endorsements", error);
    }
  }, [userId]);

  useEffect(() => {
    fetchActivities();
    fetchGroups();
    fetchIdeas();
  }, [fetchActivities, fetchGroups, fetchIdeas]);

  useEffect(() => {
    if (authLoading) return;
    fetchNotifications();
    fetchProfile();
    fetchActivityConnections();
    fetchGroupMemberships();
    fetchIdeaEndorsements();
  }, [
    authLoading,
    fetchActivityConnections,
    fetchGroupMemberships,
    fetchIdeaEndorsements,
    fetchNotifications,
    fetchProfile,
  ]);

  const appendNotification = useCallback(
    async (title, message, recipientId = userId) => {
      if (!recipientId) return null;
      const createdAt = new Date().toISOString();
      const optimistic = normaliseNotification({
        id: generateId(),
        title,
        message,
        recipientId,
        createdAt,
        read: false,
      });
      setNotifications((previous) => [optimistic, ...previous]);
      if (!supabase) {
        return optimistic.id;
      }
      const { data, error } = await supabase
        .from(TABLES.notifications)
        .insert({
          title,
          message,
          recipient_id: recipientId,
          read: false,
          created_at: createdAt,
        })
        .select("*")
        .single();
      if (error) {
        console.error("Failed to append notification", error);
        return optimistic.id;
      }
      const saved = normaliseNotification(data);
      setNotifications((previous) => {
        const filtered = previous.filter((item) => item.id !== optimistic.id);
        return [saved, ...filtered];
      });
      return saved.id;
    },
    [userId]
  );
  const fetchGroupMessages = useCallback(
    async (groupId) => {
      if (!groupId) return [];
      if (!supabase) {
        return [];
      }
      const { data, error } = await supabase
        .from(TABLES.groupMessages)
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        console.error("Failed to load group messages", error);
        return [];
      }
      const mapped = (data ?? []).map(normaliseGroupMessage).filter(Boolean);
      setGroupMessages((previous) => ({
        ...previous,
        [groupId]: mapped,
      }));
      return mapped;
    },
    [supabase]
  );

  const subscribeToGroupMessages = useCallback(
    (groupId) => {
      if (!groupId) return () => {};
      if (!supabase) {
        fetchGroupMessages(groupId);
        return () => {};
      }

      const sync = async () => {
        try {
          await fetchGroupMessages(groupId);
        } catch (error) {
          console.error("Failed to refresh group messages", error);
        }
      };

      sync();

      const channel = supabase
        .channel(`group_messages_${groupId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLES.groupMessages,
            filter: `group_id=eq.${groupId}`,
          },
          sync
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [fetchGroupMessages, supabase]
  );

  const sendGroupMessage = useCallback(
    async (groupId, content) => {
      if (!userId) throw new Error("Please sign in to chat.");
      const trimmed = (content ?? "").trim();
      if (!trimmed) return null;

      const senderName = userProfile?.name || displayName || "You";

      if (!supabase) {
        const fallback = normaliseGroupMessage({
          id: generateId(),
          groupId,
          senderId: userId,
          senderName: senderName,
          content: trimmed,
          createdAt: new Date().toISOString(),
          system: false,
        });
        setGroupMessages((previous) => ({
          ...previous,
          [groupId]: [...(previous[groupId] ?? []), fallback],
        }));
        return fallback.id;
      }

      const { data, error } = await supabase
        .from(TABLES.groupMessages)
        .insert({
          group_id: groupId,
          sender_id: userId,
          sender_name: senderName,
          content: trimmed,
          system: false,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Failed to send group message", error);
        throw error;
      }

      const saved = normaliseGroupMessage(data);
      setGroupMessages((previous) => ({
        ...previous,
        [groupId]: [...(previous[groupId] ?? []), saved],
      }));
      return saved.id;
    },
    [displayName, supabase, userId, userProfile?.name]
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
      if (!userId) throw new Error("Please sign in to create activities.");
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
        const endDateIso = new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const nowCity = city?.trim() || userProfile.currentCity || "Cape Town";
        const payload = {
          title: trimmedTitle,
          description: trimmedDescription,
          category: trimmedCategory || "Community",
          start_time: startTimeIso,
          end_time: endDateIso,
          city: nowCity,
          location_name: trimmedLocation,
          address: trimmedLocation,
          visibility: isVirtual ? "private" : "public",
          host_user_id: userId,
          created_by: userId,
          attendee_count: 1,
          is_featured: false,
          is_virtual: Boolean(isVirtual),
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let savedActivity = normaliseActivity({ id: generateId(), ...payload });
        if (supabase) {
          const { data, error } = await supabase
            .from(TABLES.activities)
            .insert(payload)
            .select("*")
            .single();
          if (error) throw error;
          savedActivity = normaliseActivity(data);
          await supabase
            .from(TABLES.activityJoins)
            .upsert({
              activity_id: savedActivity.id,
              user_id: userId,
              status: "joined",
              joined_at: new Date().toISOString(),
            });
        }
        setActivities((previous) => [savedActivity, ...previous]);
        setActivityJoins((previous) => {
          const entry = normaliseJoin({
            id: `${savedActivity.id}_${userId}`,
            activity_id: savedActivity.id,
            user_id: userId,
            status: "joined",
            joined_at: new Date().toISOString(),
          });
          const filtered = previous.filter((item) => item.id !== entry.id);
          return [...filtered, entry];
        });
        await appendNotification("Activity published", `${trimmedTitle} is now visible to the community.`);
        await fetchActivities();
        return savedActivity.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchActivities, userId, userProfile.currentCity]
  );

  const proposeBrainstormIdea = useCallback(
    async ({ title, description, category, date, time, location, city, isVirtual }) => {
      if (!userId) throw new Error("Please sign in to propose ideas.");
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
        const proposedEndIso = new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const nowCity = city?.trim() || userProfile.currentCity || "Cape Town";

        const friendlySuggestedTime = `${startDate.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} ${startDate.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}`;

        const tagSet = new Set();
        if (trimmedCategory) {
          tagSet.add(trimmedCategory.toLowerCase());
        }
        if (isVirtual) {
          tagSet.add("virtual");
        }
        const tags = Array.from(tagSet);

        const ideaPayload = {
          prompt_text: "",
          title: trimmedTitle,
          description: trimmedDescription,
          ai_suggestion: trimmedDescription,
          category: trimmedCategory || "Community",
          tags,
          preferred_location: trimmedLocation,
          suggested_time: friendlySuggestedTime,
          city: nowCity,
          supporters: [userId],
          endorsement_count: 1,
          endorsement_threshold: ENDORSEMENT_THRESHOLD,
          status: "open",
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          proposed_start: startTimeIso,
          proposed_end: proposedEndIso,
          launched_activity_id: null,
        };

        let ideaRecord = normaliseIdea({ id: generateId(), ...ideaPayload });
        if (supabase) {
          const { data, error } = await supabase.from(TABLES.ideas).insert(ideaPayload).select("*").single();
          if (error) throw error;
          ideaRecord = normaliseIdea(data);
          await supabase.from(TABLES.ideaEndorsements).upsert({
            idea_id: ideaRecord.id,
            user_id: userId,
            endorsed_at: new Date().toISOString(),
          });
        }

        let nextIdeas = [];
        setIdeas((previous) => {
          const updated = [ideaRecord, ...previous];
          nextIdeas = updated.filter(shouldDisplayIdea);
          return nextIdeas;
        });
        writeCollectionCache(IDEAS_CACHE_KEY, nextIdeas);

        setIdeaEndorsements((previous) =>
          previous.includes(ideaRecord.id) ? previous : [...previous, ideaRecord.id]
        );

        await appendNotification(
          "Idea submitted",
          `${trimmedTitle} is collecting endorsements before it launches as an activity.`
        );

        if (supabase) {
          await fetchIdeas();
        }

        return ideaRecord.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, fetchIdeas, supabase, userId, userProfile.currentCity]
  );

  const joinActivity = useCallback(
    async (activityId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (joinedActivities.includes(activityId) || waitlistedActivities.includes(activityId)) return;
      setIsMutating(true);
      try {
        let status = "joined";
        if (supabase) {
          const { data, error } = await supabase
            .from(TABLES.activities)
            .select("max_attendees, attendee_count")
            .eq("id", activityId)
            .maybeSingle();
          if (error) throw error;
          const maxAttendees = ensureNumber(data?.max_attendees ?? data?.maxAttendees ?? null, null);
          const attendeeCount = ensureNumber(data?.attendee_count ?? data?.attendeeCount ?? 0, 0);
          if (maxAttendees && attendeeCount >= maxAttendees) {
            status = "waitlist";
          } else {
            await supabase
              .from(TABLES.activities)
              .update({
                attendee_count: attendeeCount + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", activityId);
            status = "joined";
          }
          const { error: joinError } = await supabase
            .from(TABLES.activityJoins)
            .upsert({
              activity_id: activityId,
              user_id: userId,
              status,
              joined_at: new Date().toISOString(),
            });
          if (joinError) throw joinError;
        } else {
          const activity = activities.find((item) => item.id === activityId);
          const maxAttendees = activity?.maxAttendees ?? null;
          const attendeeCount = activity?.attendees ?? 0;
          if (maxAttendees && attendeeCount >= maxAttendees) {
            status = "waitlist";
          } else {
            status = "joined";
            setActivities((previous) =>
              previous.map((item) => {
                if (item.id !== activityId) return item;
                return { ...item, attendees: (item.attendees ?? 0) + 1 };
              })
            );
          }
        }

        setActivityJoins((previous) => {
          const entry = normaliseJoin({
            id: `${activityId}_${userId}`,
            activity_id: activityId,
            user_id: userId,
            status,
            joined_at: new Date().toISOString(),
          });
          const filtered = previous.filter((item) => item.id !== entry.id);
          return [...filtered, entry];
        });

        if (status === "joined") {
          setActivities((previous) =>
            previous.map((item) => {
              if (item.id !== activityId) return item;
              return { ...item, attendees: (item.attendees ?? 0) + 1 };
            })
          );
        }

        const activity = activities.find((item) => item.id === activityId);
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
              : "You're confirmed for this activity. See you there!"
          );
        }
      } finally {
        setIsMutating(false);
      }
    },
    [activities, appendNotification, joinedActivities, userId, waitlistedActivities]
  );

  const toggleSaveActivity = useCallback(
    async (activityId) => {
      if (!userId) throw new Error("Please sign in first.");
      const isSaved = savedActivities.includes(activityId);
      setIsMutating(true);
      try {
        if (isSaved) {
          if (supabase) {
            await supabase
              .from(TABLES.activitySaves)
              .delete()
              .eq("activity_id", activityId)
              .eq("user_id", userId);
          }
          setActivitySaves((previous) => previous.filter((item) => item.activityId !== activityId));
        } else {
          if (supabase) {
            await supabase
              .from(TABLES.activitySaves)
              .upsert({
                activity_id: activityId,
                user_id: userId,
                saved_at: new Date().toISOString(),
              });
          }
          setActivitySaves((previous) => {
            const entry = normaliseSave({
              id: `${activityId}_${userId}`,
              activity_id: activityId,
              user_id: userId,
              saved_at: new Date().toISOString(),
            });
            return [...previous.filter((item) => item.id !== entry.id), entry];
          });
        }
      } finally {
        setIsMutating(false);
      }
    },
    [savedActivities, userId]
  );

  const submitIdeaPrompt = useCallback(
    async (prompt) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error("Please describe your idea before submitting.");
      }

      setIsMutating(true);
      try {
        const suggestion = generateIdeaFromPrompt(trimmedPrompt, userProfile.currentCity || "Cape Town");
        const proposedStart = createDateFromSuggestion(suggestion.suggestedTime);
        const proposedEnd = new Date(new Date(proposedStart).getTime() + 90 * 60 * 1000).toISOString();

        const payload = {
          prompt_text: trimmedPrompt,
          title: suggestion.title,
          ai_suggestion: suggestion.description,
          category: suggestion.category,
          tags: suggestion.tags,
          preferred_location: suggestion.preferredLocation,
          suggested_time: suggestion.suggestedTime,
          city: userProfile.currentCity || "Cape Town",
          supporters: [userId],
          endorsement_count: 1,
          endorsement_threshold: ENDORSEMENT_THRESHOLD,
          status: "open",
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          proposed_start: proposedStart,
          proposed_end: proposedEnd,
          launched_activity_id: null,
        };

        let ideaRecord = normaliseIdea({ id: generateId(), ...payload });
        if (supabase) {
          const { data, error } = await supabase.from(TABLES.ideas).insert(payload).select("*").single();
          if (error) throw error;
          ideaRecord = normaliseIdea(data);
        }

        setIdeas((previous) => {
          const nextIdeas = [ideaRecord, ...previous].filter(shouldDisplayIdea);
          writeCollectionCache(IDEAS_CACHE_KEY, nextIdeas);
          return nextIdeas;
        });
        setIdeaEndorsements((previous) => (previous.includes(ideaRecord.id) ? previous : [...previous, ideaRecord.id]));
        await appendNotification("Idea published", `"${suggestion.title}" is live in Brainstorm.`);
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, userId, userProfile.currentCity]
  );

  const launchIdeaAsActivity = useCallback(
    async (idea, supporters) => {
      if (!idea) return null;
      const supporterList = Array.isArray(supporters) ? supporters.filter(Boolean) : [];
      const baseDescription =
        idea.description ?? idea.aiSuggestion ?? idea.promptText ?? "Community-generated idea";
      const now = new Date();

      const proposedStartIso = (() => {
        const fromIdea = idea.proposedStart ?? idea.proposed_start ?? null;
        if (fromIdea) {
          const parsed = new Date(fromIdea);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        }
        if (idea.suggestedTime) {
          const inferred = createDateFromSuggestion(idea.suggestedTime);
          if (inferred) {
            const parsed = new Date(inferred);
            if (!Number.isNaN(parsed.getTime())) {
              return parsed.toISOString();
            }
          }
        }
        const fallback = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        fallback.setHours(18, 0, 0, 0);
        return fallback.toISOString();
      })();

      const startDate = new Date(proposedStartIso);
      const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

      const city = idea.city || userProfile.currentCity || "Cape Town";
      const locationName = idea.preferredLocation || city || "To be confirmed";

      const hostUserId = canUseIdsWithSupabase(idea.createdBy) ? idea.createdBy : null;
      const createdById = hostUserId ?? (canUseIdsWithSupabase(userId) ? userId : null);

      const payload = {
        title: idea.title,
        description: baseDescription,
        category: idea.category || "Community",
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        city,
        location_name: locationName,
        address: locationName,
        visibility: "public",
        host_user_id: hostUserId,
        created_by: createdById,
        attendee_count: supporterList.length,
        max_attendees: null,
        is_featured: false,
        is_virtual: Boolean(idea.isVirtual ?? false),
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let activityRecord = normaliseActivity({ id: generateId(), ...payload });
      let activityId = activityRecord.id;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from(TABLES.activities)
            .insert({
              ...payload,
              host_user_id: hostUserId,
              created_by: createdById,
            })
            .select("*")
            .single();
          if (error) throw error;
          activityRecord = normaliseActivity(data);
          activityId = activityRecord.id;
        } catch (error) {
          console.error("Failed to promote idea to activity", error);
        }
      }

      setActivities((previous) => {
        const filtered = previous.filter((item) => item.id !== activityRecord.id);
        return [activityRecord, ...filtered];
      });

      await appendNotification(
        "Idea launched",
        `"${activityRecord.title}" is now scheduled as a community activity.`
      );

      return { activity: activityRecord, activityId };
    },
    [appendNotification, canUseIdsWithSupabase, setActivities, supabase, userId, userProfile.currentCity]
  );

  const endorseIdea = useCallback(
    async (ideaId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (ideaEndorsements.includes(ideaId)) return;

      const existingIdea = ideas.find((idea) => idea.id === ideaId) ?? null;
      setIsMutating(true);
      try {
        let supporters =
          Array.isArray(existingIdea?.supporters) && existingIdea.supporters.length > 0
            ? [...existingIdea.supporters]
            : [];
        if (!supporters.includes(userId)) {
          supporters.push(userId);
        }
        let threshold = existingIdea?.endorsementThreshold ?? ENDORSEMENT_THRESHOLD;
        let launchedActivityId = existingIdea?.launchedActivityId ?? null;
        let status = existingIdea?.status ?? "open";
        let remoteIdea = existingIdea ?? null;

        if (supabase) {
          try {
            const { data, error } = await supabase
              .from(TABLES.ideas)
              .select(
                "supporters, endorsement_count, endorsement_threshold, status, launched_activity_id, created_by, title, description, ai_suggestion, prompt_text, category, tags, preferred_location, city, proposed_start, proposed_end, suggested_time"
              )
              .eq("id", ideaId)
              .maybeSingle();
            if (error) throw error;
            if (data) {
              supporters = ensureStringArray(data.supporters ?? supporters);
              if (!supporters.includes(userId)) {
                supporters.push(userId);
              }
              threshold = ensureNumber(data.endorsement_threshold ?? threshold, ENDORSEMENT_THRESHOLD);
              launchedActivityId = data.launched_activity_id ?? launchedActivityId ?? null;
              status = data.status ?? status ?? "open";
              remoteIdea = normaliseIdea(data) ?? remoteIdea;
            }
          } catch (fetchError) {
            console.error("Failed to refresh idea before endorsement", fetchError);
          }
        }

        const uniqueSupporters = Array.from(
          new Set(
            supporters
              .map((value) => (value == null ? "" : String(value).trim()))
              .filter((value) => value.length > 0)
          )
        );
        const effectiveThreshold = Math.max(
          Number.isFinite(threshold) && threshold > 0 ? threshold : ENDORSEMENT_THRESHOLD,
          ENDORSEMENT_THRESHOLD
        );
        const nearlyReached = uniqueSupporters.length >= Math.max(effectiveThreshold - 1, 1);
        const readyToLaunch = uniqueSupporters.length >= effectiveThreshold;

        let finalLaunchedId = launchedActivityId ?? null;
        let finalStatus = status ?? "open";

        if (readyToLaunch) {
          if (!finalLaunchedId) {
            try {
              const launchResult = await launchIdeaAsActivity(remoteIdea, uniqueSupporters);
              finalLaunchedId = launchResult?.activityId ?? finalLaunchedId;
            } catch (launchError) {
              console.error("Failed to auto-launch idea after endorsement", launchError);
            }
          }
          finalStatus = finalLaunchedId ? "launched" : "ready";
        } else if (nearlyReached && finalStatus !== "launched") {
          finalStatus = "ready";
        } else if (!finalStatus) {
          finalStatus = "open";
        }

        setIdeaEndorsements((previous) => (previous.includes(ideaId) ? previous : [...previous, ideaId]));
        setIdeas((previous) => {
          const updated = previous.map((idea) => {
            if (idea.id !== ideaId) return idea;
            const thresholdValue = Math.max(
              Number.isFinite(idea.endorsementThreshold) && idea.endorsementThreshold > 0
                ? idea.endorsementThreshold
                : effectiveThreshold,
              ENDORSEMENT_THRESHOLD
            );
            const nextCount = uniqueSupporters.length;
            const nextStatus =
              finalLaunchedId != null
                ? "launched"
                : nextCount >= thresholdValue
                ? idea.status === "launched"
                  ? idea.status
                  : "ready"
                : finalStatus ?? idea.status ?? "open";

            return {
              ...idea,
              supporters: uniqueSupporters,
              endorsementCount: nextCount,
              status: nextStatus,
              endorsementThreshold: thresholdValue,
              launchedActivityId: finalLaunchedId ?? idea.launchedActivityId ?? null,
            };
          });
          const filtered = updated.filter(shouldDisplayIdea);
          writeCollectionCache(IDEAS_CACHE_KEY, filtered);
          return filtered;
        });

        if (supabase) {
          try {
            const payload = {
              supporters: uniqueSupporters,
              endorsement_count: uniqueSupporters.length,
              endorsement_threshold: effectiveThreshold,
              status: finalLaunchedId ? "launched" : finalStatus,
              updated_at: new Date().toISOString(),
            };
            if (finalLaunchedId) {
              payload.launched_activity_id = finalLaunchedId;
            }
            const { error: updateError } = await supabase.from(TABLES.ideas).update(payload).eq("id", ideaId);
            if (updateError) throw updateError;

            const { error: endorseError } = await supabase.from(TABLES.ideaEndorsements).upsert({
              idea_id: ideaId,
              user_id: userId,
              endorsed_at: new Date().toISOString(),
            });
            if (endorseError) throw endorseError;
          } catch (syncError) {
            console.error("Failed to sync endorsement with Supabase", syncError);
          }
        }
      } finally {
        setIsMutating(false);
      }
    },
    [ideaEndorsements, ideas, launchIdeaAsActivity, userId]
  );
  const createGroup = useCallback(
    async ({ name, description, tags, isPrivate, image }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      if (!trimmedName || !trimmedDescription) {
        throw new Error("Please provide a group name and description.");
      }

      setIsMutating(true);
      try {
        const now = new Date().toISOString();
        const payload = {
          name: trimmedName,
          description: trimmedDescription,
          tags: ensureStringArray(tags ?? []),
          is_private: Boolean(isPrivate),
          is_public: !isPrivate,
          image: image || DEFAULT_GROUP_IMAGE,
          owner_id: userId,
          admin_ids: [userId],
          member_ids: [userId],
          members_count: 1,
          created_at: now,
          updated_at: now,
        };

        let groupRecord = normaliseGroup({ id: generateId(), ...payload });
        if (supabase) {
          const { data, error } = await supabase.from(TABLES.groups).insert(payload).select("*").single();
          if (error) throw error;
          groupRecord = normaliseGroup(data);
          await supabase
            .from(TABLES.groupMembers)
            .upsert({
              group_id: groupRecord.id,
              user_id: userId,
              role: "owner",
              joined_at: now,
            });
        }

        setGroups((previous) => [groupRecord, ...previous]);
        setGroupMemberships((previous) => {
          const entry = normaliseMembership({
            id: `${groupRecord.id}_${userId}`,
            group_id: groupRecord.id,
            user_id: userId,
            role: "owner",
            joined_at: now,
          });
          const filtered = previous.filter((item) => item.groupId !== groupRecord.id || item.userId !== userId);
          return [...filtered, entry];
        });
        await appendNotification("Group created", `${trimmedName} is ready. Invite members to join.`);
        return groupRecord.id;
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, userId]
  );

  const joinGroup = useCallback(
    async (groupId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (joinedGroups.includes(groupId)) return;
      setIsMutating(true);
      try {
        const now = new Date().toISOString();
        if (supabase) {
          await supabase
            .from(TABLES.groupMembers)
            .upsert({
              group_id: groupId,
              user_id: userId,
              role: "member",
              joined_at: now,
            });
        }
        setGroupMemberships((previous) => {
          const entry = normaliseMembership({
            id: `${groupId}_${userId}`,
            group_id: groupId,
            user_id: userId,
            role: "member",
            joined_at: now,
          });
          const filtered = previous.filter((item) => item.id !== entry.id);
          return [...filtered, entry];
        });
        setGroups((previous) =>
          previous.map((group) => {
            if (group.id !== groupId) return group;
            const memberSet = new Set(group.memberIds ?? []);
            memberSet.add(userId);
            const updatedMembers = Array.from(memberSet);
            return {
              ...group,
              memberIds: updatedMembers,
              membersCount: updatedMembers.length,
            };
          })
        );
        const group = groups.find((item) => item.id === groupId);
        if (group) {
          await appendNotification("Group joined", `Welcome to ${group.name}!`);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [appendNotification, groups, joinedGroups, userId]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      if (!userId) throw new Error("Please sign in first.");
      const group = groups.find((item) => item.id === groupId);
      if (!group) {
        throw new Error("Group not found.");
      }
      if (group.ownerId === userId) {
        throw new Error("Transfer ownership before leaving this community.");
      }

      setIsMutating(true);
      try {
        if (supabase) {
          await supabase
            .from(TABLES.groupMembers)
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", userId);
        }
        setGroupMemberships((previous) => previous.filter((item) => !(item.groupId === groupId && item.userId === userId)));
        setGroups((previous) =>
          previous.map((item) => {
            if (item.id !== groupId) return item;
            const memberIds = (item.memberIds || []).filter((id) => id !== userId);
            return {
              ...item,
              memberIds,
              membersCount: memberIds.length,
              adminIds: (item.adminIds || []).filter((id) => id !== userId),
            };
          })
        );
      } finally {
        setIsMutating(false);
      }
    },
    [groups, userId]
  );

  const promoteGroupMember = useCallback(
    async (groupId, memberId) => {
      if (!userId) throw new Error("Please sign in first.");
      const group = groups.find((item) => item.id === groupId);
      if (!group) throw new Error("Group not found.");
      const isAdmin = group.ownerId === userId || (group.adminIds || []).includes(userId);
      if (!isAdmin) {
        throw new Error("Only owners or admins can promote members.");
      }

      if (supabase) {
        const { error } = await supabase
          .from(TABLES.groupMembers)
          .update({ role: "admin" })
          .eq("group_id", groupId)
          .eq("user_id", memberId);
        if (error) throw error;
      }

      setGroupMemberships((previous) =>
        previous.map((membership) =>
          membership.groupId === groupId && membership.userId === memberId
            ? { ...membership, role: "admin" }
            : membership
        )
      );
      setGroups((previous) =>
        previous.map((item) => {
          if (item.id !== groupId) return item;
          const adminIds = new Set(item.adminIds ?? []);
          adminIds.add(memberId);
          return { ...item, adminIds: Array.from(adminIds) };
        })
      );
    },
    [groups, userId]
  );

  const createGroupNotice = useCallback(
    async (groupId, { title, message }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedTitle = title.trim();
      const trimmedMessage = message.trim();
      if (!trimmedTitle || !trimmedMessage) {
        throw new Error("Please complete the notice before posting.");
      }
      if (!supabase) return;
      const payload = {
        group_id: groupId,
        type: "notice",
        title: trimmedTitle,
        message: trimmedMessage,
        created_at: new Date().toISOString(),
        created_by_id: userId,
        created_by_name: userProfile.name ?? displayName,
      };
      const { error } = await supabase.from(TABLES.groupBulletins).insert(payload);
      if (error) {
        throw error;
      }
    },
    [displayName, userId, userProfile.name]
  );

  const createGroupPoll = useCallback(
    async (groupId, { question, options }) => {
      if (!userId) throw new Error("Please sign in first.");
      const trimmedQuestion = question.trim();
      const normalizedOptions = (options ?? [])
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
      if (!supabase) return;
      const payload = {
        group_id: groupId,
        type: "poll",
        question: trimmedQuestion,
        options: normalizedOptions,
        voters: {},
        created_at: new Date().toISOString(),
        created_by_id: userId,
        created_by_name: userProfile.name ?? displayName,
      };
      const { error } = await supabase.from(TABLES.groupBulletins).insert(payload);
      if (error) throw error;
    },
    [displayName, userId, userProfile.name]
  );

  const voteGroupPoll = useCallback(
    async (groupId, bulletinId, optionId) => {
      if (!userId) throw new Error("Please sign in first.");
      if (!supabase) throw new Error("Supabase is not configured. Voting is currently unavailable.");

      const { data, error } = await supabase
        .from(TABLES.groupBulletins)
        .select("*")
        .eq("id", bulletinId)
        .eq("group_id", groupId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Poll not found.");
      const poll = normaliseBulletin(data);
      if (poll.type !== "poll") {
        throw new Error("This bulletin is not a poll.");
      }

      const voters = { ...poll.voters };
      const previousVote = voters[userId] ?? null;
      if (previousVote === optionId) return;

      const options = poll.options.map((option) => {
        if (option.id === optionId) {
          return { ...option, votes: ensureNumber(option.votes ?? 0, 0) + 1 };
        }
        if (previousVote && option.id === previousVote) {
          return { ...option, votes: Math.max(ensureNumber(option.votes ?? 0, 0) - 1, 0) };
        }
        return option;
      });
      voters[userId] = optionId;

      const { error: updateError } = await supabase
        .from(TABLES.groupBulletins)
        .update({ options, voters })
        .eq("id", bulletinId)
        .eq("group_id", groupId);
      if (updateError) throw updateError;
    },
    [userId]
  );

  const subscribeToGroupBulletins = useCallback((groupId, handler) => {
    if (!groupId) {
      handler([]);
      return () => {};
    }
    let active = true;

    const load = async () => {
      if (!active) return;
      if (!supabase) {
        handler([]);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.groupBulletins)
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load group bulletins", error);
        handler([]);
        return;
      }
      handler((data ?? []).map(normaliseBulletin).filter(Boolean));
    };

    load();

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const channel = supabase
      .channel(`group_bulletins_${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.groupBulletins,
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchGroupProfiles = useCallback(async (memberIds) => {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return {};
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

    if (missing.length > 0 && supabase) {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select("*")
        .in("id", missing);
      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          const rawName = [
            row.name,
            row.full_name,
            row.fullName,
            row.display_name,
            row.displayName,
            row.preferred_name,
            row.preferredName,
            row.username,
            row.user_name,
            typeof row.email === "string" ? row.email.split("@")[0] : null,
          ].find((value) => typeof value === "string" && value.trim().length > 0);
          const profile = {
            id: row.id,
            name: rawName ? rawName.trim() : "",
            email: row.email ?? row.user_email ?? "",
            tagline: row.tagline ?? row.headline ?? "",
            bio: row.bio ?? row.about ?? "",
            interests: ensureStringArray(row.interests ?? []),
            currentCity: row.currentCity ?? row.current_city ?? "",
            homeCity: row.homeCity ?? row.home_city ?? "",
            profileCompletion: ensureNumber(row.profileCompletion ?? row.profile_completion ?? 0, 0),
            photoURL: row.photoURL ?? row.photo_url ?? "",
            createdAt: coerceIso(row.createdAt ?? row.created_at),
            pronouns: row.pronouns ?? row.pronoun ?? "",
            role: row.role ?? row.profile_role ?? "",
            website: row.website ?? row.portfolio ?? row.site ?? "",
            phone: row.phone ?? row.phone_number ?? "",
          };
          cache.set(profile.id, profile);
          result[profile.id] = profile;
        });
      }
    }

    missing.forEach((id) => {
      if (!result[id] && cache.has(id)) {
        result[id] = cache.get(id);
      }
    });

    return result;
  }, [supabase]);

  const updateProfile = useCallback(
    async (partialUpdates = {}) => {
      if (!userId) {
        throw new Error("You need to be signed in to update your profile.");
      }
      const baseProfile = normalizeProfileRow(profileDoc ?? {}, profileFallback);
      if (!supabase) {
        const mergedProfile = normalizeProfileRow(
          { ...baseProfile, ...partialUpdates, id: userId },
          baseProfile
        );
        profilesCacheRef.current.set(userId, mergedProfile);
        setProfileDoc(mergedProfile);
        return mergedProfile;
      }

      setIsMutating(true);
      try {
        const payload = {
          id: userId,
          ...mapProfileUpdatesToRow(partialUpdates),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from(TABLES.profiles)
          .upsert(payload, { onConflict: "id" })
          .select("*")
          .single();
        if (error) {
          throw error;
        }
        const mergedProfile = normalizeProfileRow(data ?? payload, baseProfile);
        profilesCacheRef.current.set(userId, mergedProfile);
        setProfileDoc(mergedProfile);
        return mergedProfile;
      } catch (error) {
        console.error("Failed to update profile", error);
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [profileDoc, profileFallback, supabase, userId]
  );

  const uploadProfilePhoto = useCallback(
    async (file) => {
      if (!file) {
        throw new Error("Please choose an image to upload.");
      }
      if (!userId) {
        throw new Error("You need to be signed in to upload a profile photo.");
      }

      const safeName = (file.name || "profile").replace(/[^\w.-]/gi, "_").toLowerCase();
      const objectPath = `${userId}/${Date.now()}-${safeName || "profile"}`;
      let photoURL = "";

      if (supabase) {
        try {
          const storage = supabase.storage.from("profile-photos");
          const { error: uploadError } = await storage.upload(objectPath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || "image/jpeg",
          });
          if (uploadError && (!uploadError.message || !uploadError.message.includes("Duplicate"))) {
            throw uploadError;
          }
          const { data: publicUrlData } = storage.getPublicUrl(objectPath);
          photoURL = publicUrlData?.publicUrl || "";
        } catch (error) {
          console.warn("Falling back to inline profile photo storage", error);
        }
      }

      if (!photoURL) {
        const buffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
        }
        photoURL = `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
      }

      const updated = await updateProfile({ photoURL });
      return updated.photoURL;
    },
    [supabase, updateProfile, userId]
  );

  const contextValue = useMemo(
    () => ({
      activities,
      categories,
      featuredActivities,
      trendingActivities,
      groups,
      groupMessages,
      subscribeToGroupMessages,
      fetchGroupMessages,
      ideas,
      notifications,
      userProfile,
      joinedActivities,
      waitlistedActivities,
      savedActivities,
      joinedGroups,
      ideaEndorsements,
      createActivity,
      proposeBrainstormIdea,
      joinActivity,
      toggleSaveActivity,
      submitIdeaPrompt,
      endorseIdea,
      createGroup,
      joinGroup,
      sendGroupMessage,
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
      updateProfile,
      uploadProfilePhoto,
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
      fetchGroupProfiles,
      featuredActivities,
      groups,
      groupMessages,
      subscribeToGroupMessages,
      fetchGroupMessages,
      ideas,
      ideaEndorsements,
      isMutating,
      uploadProfilePhoto,
      updateProfile,
      joinActivity,
      proposeBrainstormIdea,
      joinGroup,
      sendGroupMessage,
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
      waitlistedActivities,
      promoteGroupMember,
    ]
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};



