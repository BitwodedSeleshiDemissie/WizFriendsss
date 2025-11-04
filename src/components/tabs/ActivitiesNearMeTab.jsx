"use client";


import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";
import FriendInviteModal from "../FriendInviteModal";

const distanceOptions = [
  { label: "Any distance", value: "Any" },
  { label: "Within 5 km", value: "5" },
  { label: "Within 15 km", value: "15" },
  { label: "Within 30 km", value: "30" },
];

const dateOptions = [
  { label: "Any date", value: "Any" },
  { label: "Today", value: "Today" },
  { label: "This Week", value: "Week" },
  { label: "This Weekend", value: "Weekend" },
];

const WELLNESS_ART = [
  "/category-art/wellness/1600x1000_Rimini-Wellness.jpg",
  "/category-art/wellness/4-3.png",
  "/category-art/wellness/a22324c8-859e-420a-8fdf-170b5b461af6.webp",
  "/category-art/wellness/alula-wellness-festival-article-card-desktop.jpg",
  "/category-art/wellness/images.jpeg",
];

const FOOD_AND_DRINK_ART = [
  "/category-art/food-drink/EmptyName_62_9c9de251-eba2-4a3a-b7e3-fdfcf1e59a3c.jpg",
  "/category-art/food-drink/How-to-Throw-an-Aperitivo-Hour-Like-Italians-FT-BLOG0425-01-a16d0a64c3c24291a56e1d4f1dab5bb6.jpg",
  "/category-art/food-drink/images-1.jpeg",
  "/category-art/food-drink/images.jpeg",
  "/category-art/food-drink/tofd-2.webp",
];

const OUTDOORS_ART = [
  "/category-art/outdoors/2024OutdoorAdventureCourse-Aframe2024-2880x1286jpg-640w.webp",
  "/category-art/outdoors/a019f_segnavie.jpg",
  "/category-art/outdoors/axe-throwing-header.webp",
  "/category-art/outdoors/images-2.jpeg",
  "/category-art/outdoors/images.jpeg",
];

const ARTS_AND_CULTURE_ART = [
  "/category-art/arts-culture/cultural-festivals-in-greece-hero.jpg",
  "/category-art/arts-culture/GettyImages-530374398-5a5e624ac7822d00378b5931.jpg",
  "/category-art/arts-culture/id14604382-CZ_2129-scaled.webp",
  "/category-art/arts-culture/images-1.jpeg",
  "/category-art/arts-culture/images.jpeg",
];

const LEARNING_ART = [
  "/category-art/learning/eea-hub-workshops.jpg",
  "/category-art/learning/images-1.jpeg",
  "/category-art/learning/images.jpeg",
  "/category-art/learning/its-arcademy-courses-workshops-landscape.jpg",
  "/category-art/learning/litalianoporticando-1024x768.webp",
];

const VOLUNTEERING_ART = [
  "/category-art/volunteering/10r2a0762-1-2444x2000.jpg",
  "/category-art/volunteering/adobestock_128735726.jpeg",
  "/category-art/volunteering/images.jpeg",
  "/category-art/volunteering/multi-ethnic-young-people-team-600nw-2205868095.webp",
  "/category-art/volunteering/volunteer-abroad-in-italy-ivhq-rome-community-support.avif",
];

const NETWORKING_ART = [
  "/category-art/networking/download.jpeg",
  "/category-art/networking/images-1.jpeg",
  "/category-art/networking/images.jpeg",
  "/category-art/networking/Networking_Skills_see3dz.avif",
  "/category-art/networking/Progetto-senza-titolo-1-1024x740.jpg",
];

const CATEGORY_ILLUSTRATIONS = {
  Wellness: WELLNESS_ART,
  "Active & Wellness": [...WELLNESS_ART, ...OUTDOORS_ART],
  "Food & Drink": FOOD_AND_DRINK_ART,
  "Outdoors & Adventure": OUTDOORS_ART,
  "Arts & Culture": ARTS_AND_CULTURE_ART,
  "Sports & Fitness": OUTDOORS_ART,
  "Learning & Workshops": LEARNING_ART,
  "Tech & Learning": LEARNING_ART,
  Volunteering: VOLUNTEERING_ART,
  "Social Impact": VOLUNTEERING_ART,
  "Networking & Professional": NETWORKING_ART,
  "Professional & Networking": NETWORKING_ART,
  "Social & Connection": [...NETWORKING_ART, ...ARTS_AND_CULTURE_ART],
  Community: [...ARTS_AND_CULTURE_ART, ...NETWORKING_ART],
  Study: LEARNING_ART,
  Education: LEARNING_ART,
  "Study Group": LEARNING_ART,
};

const CATEGORY_KEYWORD_RULES = [
  {
    keywords: ["wellness", "active", "health", "fitness", "sport", "movement"],
    art: [...WELLNESS_ART, ...OUTDOORS_ART],
  },
  {
    keywords: ["food", "drink", "dinner", "brunch", "culinary", "chef", "cook", "taste"],
    art: FOOD_AND_DRINK_ART,
  },
  {
    keywords: ["outdoor", "advent", "trail", "hike", "run", "bike", "climb", "nature"],
    art: OUTDOORS_ART,
  },
  {
    keywords: ["art", "culture", "music", "creative", "film", "gallery", "dance"],
    art: ARTS_AND_CULTURE_ART,
  },
  {
    keywords: ["learn", "study", "workshop", "class", "tech", "education", "brainstorm", "course"],
    art: LEARNING_ART,
  },
  {
    keywords: ["volunteer", "impact", "charity", "donate", "service", "community"],
    art: VOLUNTEERING_ART,
  },
  {
    keywords: ["network", "professional", "career", "business", "meetup", "connection", "social"],
    art: NETWORKING_ART,
  },
];

const DEFAULT_CATEGORY_ART = [
  ...ARTS_AND_CULTURE_ART,
  ...NETWORKING_ART,
  ...WELLNESS_ART,
];

function getCategoryIllustrations(categoryLabel) {
  const trimmed = categoryLabel?.trim();

  if (trimmed && CATEGORY_ILLUSTRATIONS[trimmed]) {
    return CATEGORY_ILLUSTRATIONS[trimmed];
  }

  const lowered = trimmed?.toLowerCase();
  if (lowered) {
    const match = CATEGORY_KEYWORD_RULES.find(({ keywords }) =>
      keywords.some((keyword) => lowered.includes(keyword))
    );
    if (match) {
      return match.art;
    }
  }

  return DEFAULT_CATEGORY_ART;
}

const ActivityMapView = dynamic(() => import("../maps/ActivityMap"), { ssr: false });

const MAP_DEFAULT_CENTER = [-33.9249, 18.4241];

const FilterIcon = ({ className = "h-4 w-4" } = {}) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5h14M5 10h10M7 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MapIcon = ({ className = "h-4 w-4" } = {}) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4.5 7 3l6 2 4-1.5V16l-4 1.5-6-2-4 1.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 3v12M13 5v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ListIcon = ({ className = "h-4 w-4" } = {}) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6h12M4 10h12M4 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeartIcon = ({ filled = false, className = "h-4 w-4" } = {}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 21s-6.1-3.6-9-7.5C1.2 9.6 2.3 5.6 5.4 4c1.7-.9 3.8-.4 5 1 1.2-1.4 3.3-1.9 5-1 3.1 1.6 4.2 5.6 2.4 9.5-2.9 3.9-9.8 7.5-9.8 7.5Z" />
  </svg>
);

function matchesDateFilter(eventDate, filter) {
  if (filter === "Any") return true;
  const now = new Date();
  const event = new Date(eventDate);

  if (filter === "Today") {
    return (
      event.getDate() === now.getDate() &&
      event.getMonth() === now.getMonth() &&
      event.getFullYear() === now.getFullYear()
    );
  }

  if (filter === "Week") {
    const diff = (event - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  if (filter === "Weekend") {
    const day = event.getDay();
    return day === 5 || day === 6 || day === 0;
  }

  return true;
}

const EARTH_RADIUS_KM = 6371;

function calculateDistanceKm(origin, destination) {
  if (!origin || !destination) return NaN;
  const { lat: lat1, lng: lng1 } = origin;
  const { lat: lat2, lng: lng2 } = destination;
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return NaN;
  }
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export default function ActivitiesNearMeTab() {
  const {
    activities,
    categories,
    joinedActivities,
    waitlistedActivities,
    savedActivities,
    joinActivity,
    toggleSaveActivity,
    followUser,
    unfollowUser,
    followingDetails,
    friendCircleDetails,
    friendActivities,
    shareActivityWithFriends,
    currentUserId,
    loadingActivities,
  } = useAppData();
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setShowFilterPanel(!isMobile);
  }, [isMobile]);

  const [filters, setFilters] = useState({ category: "All", distance: "Any", date: "Any" });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: "All", distance: "Any", date: "Any" });
  };

  const handleToggleFilterPanel = () => {
    setShowFilterPanel((previous) => !previous);
  };

  const handleApplyFilters = () => {
    if (isMobile) {
      setShowFilterPanel(false);
    }
  };

  const [viewMode, setViewMode] = useState("list");
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendShareFeedback, setFriendShareFeedback] = useState("");
  const [friendShareError, setFriendShareError] = useState("");
  const [friendSharePending, setFriendSharePending] = useState(false);
  const friendCircle = useMemo(
    () => (Array.isArray(friendCircleDetails) ? friendCircleDetails : []),
    [friendCircleDetails]
  );
  const friendHostedActivities = useMemo(() => {
    if (!Array.isArray(friendActivities)) return [];
    const seen = new Set();
    return friendActivities
      .filter((activity) => {
        if (!activity || !activity.id) return false;
        if (seen.has(activity.id)) return false;
        seen.add(activity.id);
        return true;
      })
      .sort((a, b) => {
        const timeA = a?.dateTime ? new Date(a.dateTime).getTime() : 0;
        const timeB = b?.dateTime ? new Date(b.dateTime).getTime() : 0;
        return timeA - timeB;
      });
  }, [friendActivities]);

  const nearbyActivities = useMemo(() => {
    const base = activities.filter((activity) => activity.isNearby);

    return base
      .filter((activity) => {
        if (filters.category !== "All" && activity.category !== filters.category) {
          return false;
        }

        if (!matchesDateFilter(activity.dateTime, filters.date)) {
          return false;
        }

        if (filters.distance !== "Any") {
          const threshold = Number(filters.distance);
          if (Number(activity.distance || 0) > threshold) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  }, [activities, filters]);

  const activitiesWithCoordinates = useMemo(
    () =>
      nearbyActivities.filter(
        (activity) =>
          typeof activity.latitude === "number" &&
          !Number.isNaN(activity.latitude) &&
          typeof activity.longitude === "number" &&
          !Number.isNaN(activity.longitude)
      ),
    [nearbyActivities]
  );

  const fallbackCenter = useMemo(() => {
    if (activitiesWithCoordinates.length === 0) {
      return MAP_DEFAULT_CENTER;
    }
    const { lat, lng } = activitiesWithCoordinates.reduce(
      (acc, activity) => ({
        lat: acc.lat + activity.latitude,
        lng: acc.lng + activity.longitude,
      }),
      { lat: 0, lng: 0 }
    );
    return [lat / activitiesWithCoordinates.length, lng / activitiesWithCoordinates.length];
  }, [activitiesWithCoordinates]);

  useEffect(() => {
    if (viewMode !== "map") {
      setSelectedActivityId(null);
      return;
    }
    if (activitiesWithCoordinates.length === 0) {
      setSelectedActivityId(null);
      return;
    }
    if (!activitiesWithCoordinates.some((activity) => activity.id === selectedActivityId)) {
      setSelectedActivityId(activitiesWithCoordinates[0]?.id ?? null);
    }
  }, [viewMode, activitiesWithCoordinates, selectedActivityId]);

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return activitiesWithCoordinates.find((activity) => activity.id === selectedActivityId) ?? null;
  }, [activitiesWithCoordinates, selectedActivityId]);

  useEffect(() => {
    setFriendShareFeedback("");
    setFriendShareError("");
    setFriendSharePending(false);
  }, [selectedActivityId]);


  const selectedActivityMeta = useMemo(() => {
    if (!selectedActivity) return null;
    const eventDate = new Date(selectedActivity.dateTime);
    return {
      dateLabel: eventDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
      timeLabel: eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      host: selectedActivity.host ?? "Community Host",
      attendees: selectedActivity.attendees ?? 0,
    };
  }, [selectedActivity]);

  const selectedDistanceLabel = useMemo(() => {
    if (!selectedActivity) return null;
    let distance = Number(selectedActivity.distance);

    if (!Number.isFinite(distance) || distance <= 0) {
      if (
        userLocation &&
        Number.isFinite(selectedActivity.latitude) &&
        Number.isFinite(selectedActivity.longitude)
      ) {
        distance = calculateDistanceKm(userLocation, {
          lat: selectedActivity.latitude,
          lng: selectedActivity.longitude,
        });
      }
    }

    if (!Number.isFinite(distance) || distance <= 0) {
      return null;
    }

    const formatted = distance >= 10 ? distance.toFixed(0) : distance.toFixed(1);
    return `${formatted} km away`;
  }, [selectedActivity, userLocation]);

  const joinedSelected = selectedActivity ? joinedActivities.includes(selectedActivity.id) : false;
  const waitlistedSelected = selectedActivity ? waitlistedActivities.includes(selectedActivity.id) : false;
  const savedSelected = selectedActivity ? savedActivities.includes(selectedActivity.id) : false;
  const selectedHostId = selectedActivity?.hostId ?? null;
  const hostDisplayName = selectedActivityMeta?.host ?? selectedActivity?.host ?? "Community Host";
  const isSelfHost = selectedHostId && currentUserId && selectedHostId === currentUserId;
  const hostFollowRecord = selectedHostId
    ? followingDetails.find((connection) => connection.id === selectedHostId)
    : null;
  const isFollowingHost = Boolean(hostFollowRecord);

  const handleSelectActivity = useCallback((activityId) => {
    setSelectedActivityId(activityId ?? null);
  }, []);

  const handleUserLocate = useCallback((value) => {
    if (!value) return;
    if (Array.isArray(value) && value.length === 2) {
      setUserLocation({ lat: value[0], lng: value[1] });
      return;
    }
    if (Array.isArray(value.location) && value.location.length === 2) {
      const accuracyValue = Number.isFinite(value.accuracy) ? value.accuracy : null;
      setUserLocation({
        lat: value.location[0],
        lng: value.location[1],
        accuracy: accuracyValue,
      });
    }
  }, []);


  const handleFriendShare = useCallback(
    async (selectedIds = [], note = "") => {
      if (!selectedActivity) {
        setFriendShareError("Select an activity first to coordinate with friends.");
        return;
      }
      setFriendSharePending(true);
      try {
        const result = await shareActivityWithFriends(selectedActivity.id, selectedIds, note);
        const invited = result?.invited ?? (Array.isArray(selectedIds) ? selectedIds.length : 0);
        const skipped = result?.skipped ?? 0;
        const messages = [];
        if (invited > 0) {
          messages.push(`Saved for ${invited} friend${invited === 1 ? "" : "s"}.`);
        } else {
          messages.push("Saved for later coordination.");
        }
        if (skipped > 0) {
          messages.push(
            `${skipped} friend${skipped === 1 ? "" : "s"} still need a mutual follow before we can nudge them.`
          );
        }
        setFriendShareFeedback(messages.join(" "));
        setFriendShareError("");
        setShowFriendModal(false);
      } catch (error) {
        console.error("Failed to share activity with friends", error);
        setFriendShareError("We could not save that invite. Please try again.");
      } finally {
        setFriendSharePending(false);
      }
    },
    [selectedActivity, shareActivityWithFriends]
  );

  const isMapView = viewMode === "map";
  const isListView = !isMapView;

  if (loadingActivities) {
    return (
      <section className="rounded-3xl bg-white/80 backdrop-blur border border-white/50 shadow-xl p-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-semibold text-indigo-500">Loading activities around you...</p>
      </section>
    );
  }

  const filtersGrid = (
    <div className={`grid gap-4 sm:grid-cols-3 ${isMobile ? "mt-4" : "mt-6"}`}>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-gray-500">Category</label>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="All">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-gray-500">Distance</label>
        <select
          value={filters.distance}
          onChange={(e) => handleFilterChange("distance", e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {distanceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-gray-500">Date</label>
        <select
          value={filters.date}
          onChange={(e) => handleFilterChange("date", e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {dateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const categoryCounters = {};

  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-white/50 shadow-xl p-6 md:p-10">
        {isMobile ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleFilterPanel}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  showFilterPanel
                    ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                    : "border-indigo-200 bg-white text-indigo-600 hover:border-indigo-300 hover:text-pink-500"
                }`}
                aria-expanded={showFilterPanel}
              >
                <FilterIcon />
                <span>{showFilterPanel ? "Hide filters" : "Filter"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode(isMapView ? "list" : "map")}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isMapView
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-md"
                    : "border-indigo-200 bg-white text-indigo-600 hover:border-indigo-300 hover:text-pink-500"
                }`}
              >
                {isMapView ? <ListIcon /> : <MapIcon />}
                <span>{isMapView ? "List view" : "Map view"}</span>
              </button>
            </div>
            {showFilterPanel ? (
              <>
                {filtersGrid}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleApplyFilters}
                    className="flex-1 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-xl"
                  >
                    Apply filters
                  </motion.button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Activities near you</h2>
                <p className="text-gray-600 mt-2 max-w-xl">
                  Based on your current city and GPS radius. Adjust filters to narrow results by
                  category, date, or distance.
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-pink-500"
                >
                  Reset filters
                </button>
                <div className="inline-flex overflow-hidden rounded-full border border-indigo-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${isListView ? "bg-indigo-600 text-white" : "text-indigo-600 hover:text-pink-500"}`}
                  >
                    <ListIcon className="h-4 w-4" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("map")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${isMapView ? "bg-indigo-600 text-white" : "text-indigo-600 hover:text-pink-500"}`}
                  >
                    <MapIcon className="h-4 w-4" />
                    <span>Map</span>
                  </button>
                </div>
              </div>
            </div>

            {filtersGrid}
          </>
        )}
      </div>

      {friendCircle.length > 0 && friendHostedActivities.length > 0 ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-emerald-700">Friends are hosting soon</h3>
              <p className="text-sm text-emerald-600">
                Keep an eye on activities led by people you follow and coordinate when you are ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFriendShareError("");
                setFriendShareFeedback("");
                if (selectedActivity) {
                  setShowFriendModal(true);
                } else if (friendHostedActivities[0]) {
                  setViewMode("map");
                  setSelectedActivityId(friendHostedActivities[0].id);
                  setShowFriendModal(true);
                }
              }}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Communicate with friends
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {friendHostedActivities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Friend host</p>
                <p className="mt-1 font-medium text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">Hosted by {activity.host ?? "Community Host"}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(activity.dateTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("map");
                      setSelectedActivityId(activity.id);
                    }}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View on map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isMapView ? (
        <div className="space-y-6">
          {activitiesWithCoordinates.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <div className="relative h-[420px] sm:h-[480px] lg:h-[560px] rounded-3xl overflow-hidden shadow-xl ring-1 ring-indigo-100/70 bg-white">
                <ActivityMapView
                  activities={activitiesWithCoordinates}
                  selectedActivityId={selectedActivityId}
                  onSelect={handleSelectActivity}
                  fallbackCenter={fallbackCenter}
                  onLocate={handleUserLocate}
                />
              </div>
              <motion.div
                layout
                className="activity-map__detail-card rounded-3xl bg-white shadow-xl ring-1 ring-indigo-100/80 p-6 sm:p-8 flex flex-col"
              >
                {selectedActivity ? (
                  <div className="flex h-full flex-col gap-6">
                    <div className="space-y-3">
                      <span className="inline-flex max-w-fit items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        {selectedActivity.category}
                      </span>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedActivity.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600">{selectedActivity.description}</p>
                    </div>
                    <div className="space-y-3 text-sm text-slate-600">
                      {selectedActivityMeta?.dateLabel ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                            Date
                          </span>
                          <span>
                            {selectedActivityMeta.dateLabel} at {selectedActivityMeta.timeLabel}
                          </span>
                        </div>
                      ) : null}
                      {selectedActivity?.location ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                            Where
                          </span>
                          <span>{selectedActivity.location}</span>
                        </div>
                      ) : null}
                      {selectedDistanceLabel ? (
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                            Distance
                          </span>
                          <span>{selectedDistanceLabel}</span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                          Host
                        </span>
                        <span className="font-medium text-slate-700">{hostDisplayName}</span>
                        {selectedHostId && !isSelfHost ? (
                          <button
                            type="button"
                            onClick={() =>
                              isFollowingHost
                                ? unfollowUser(selectedHostId)
                                : followUser(selectedHostId, { displayName: hostDisplayName })
                            }
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              isFollowingHost
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            {isFollowingHost ? "Following" : "Follow host"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <motion.button
                        whileHover={{ scale: joinedSelected || waitlistedSelected ? 1 : 1.03 }}
                        whileTap={{ scale: joinedSelected || waitlistedSelected ? 1 : 0.97 }}
                        onClick={() => selectedActivity && joinActivity(selectedActivity.id)}
                        disabled={joinedSelected || waitlistedSelected}
                        className={`flex-1 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                          joinedSelected
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : waitlistedSelected
                            ? "bg-amber-100 text-amber-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-lg hover:shadow-xl"
                        }`}
                      >
                        {joinedSelected ? "Joined" : waitlistedSelected ? "Waitlisted" : "Join activity"}
                      </motion.button>
                      <button
                        type="button"
                        onClick={() => selectedActivity && toggleSaveActivity(selectedActivity.id)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                          savedSelected
                            ? "border-pink-500 bg-pink-50 text-pink-500"
                            : "border-gray-200 text-gray-400 hover:border-pink-500 hover:text-pink-500"
                        }`}
                        aria-label={savedSelected ? "Remove from saved" : "Save this activity"}
                      >
                        <HeartIcon filled={savedSelected} className="h-4 w-4" />
                      </button>
                    </div>
                    {friendShareFeedback ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
                        {friendShareFeedback}
                      </p>
                    ) : null}
                    {friendShareError ? (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                        {friendShareError}
                      </p>
                    ) : null}
                    {friendCircle.length > 0 && selectedActivity ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFriendShareError("");
                          setFriendShareFeedback("");
                          setShowFriendModal(true);
                        }}
                        className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-pink-500"
                      >
                        Communicate with friends
                      </button>
                    ) : null}
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {selectedActivityMeta?.attendees ?? 0} people already joined
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-center text-slate-500">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-500">Explore the interactive map</h3>
                      <p className="mt-2 text-sm">
                        Tap a marker to preview the activity or switch back to the list view to compare everything nearby.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-indigo-300 bg-white/70 p-10 text-center text-gray-500">
              <h3 className="text-lg font-semibold text-indigo-500">Map view coming soon</h3>
              <p className="mt-2 text-sm">
                None of the filtered activities include coordinates yet. Switch back to the list view or widen your filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {nearbyActivities.map((activity, index) => {
            const joined = joinedActivities.includes(activity.id);
            const waitlisted = waitlistedActivities.includes(activity.id);
            const saved = savedActivities.includes(activity.id);
            const eventDate = new Date(activity.dateTime);
            const hasValidDate = !Number.isNaN(eventDate.getTime());
            const dateLabel = hasValidDate
              ? eventDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
              : null;
            const timeLabel = hasValidDate
              ? eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
              : null;
            const categoryKey = activity.category ?? "";
            const counterKey = categoryKey || "__unknown__";
            const counter = categoryCounters[counterKey] ?? 0;
            categoryCounters[counterKey] = counter + 1;
            const artworkOptions = getCategoryIllustrations(categoryKey);
            const artworkSrc = artworkOptions.length > 0 ? artworkOptions[counter % artworkOptions.length] : null;
            const distanceValue = Number(activity.distance);
            const distanceLabel =
              Number.isFinite(distanceValue) && distanceValue > 0
                ? `${distanceValue >= 10 ? distanceValue.toFixed(0) : distanceValue.toFixed(1)} km away`
                : "Within city";
            const hostId = activity.hostId ?? null;
            const cardHostName = activity.host ?? "Community Host";
            const hostIsFriend = hostId ? friendCircle.some((friend) => friend.id === hostId) : false;
            const hostIsFollowed = hostId ? followingDetails.some((detail) => detail.id === hostId) : false;
            const hostIsSelf = hostId && currentUserId && hostId === currentUserId;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-3xl bg-white shadow-lg border border-gray-100 p-6 space-y-4 hover:shadow-2xl transition-all"
              >
                <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-100/80 to-pink-100/60 border border-indigo-100/80">
                  {artworkSrc ? (
                    <Image
                      src={artworkSrc}
                      alt={`${activity.category} illustration`}
                      width={640}
                      height={360}
                      className="w-full h-40 object-cover"
                      priority={index < 2}
                    />
                  ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50" />
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">
                      {activity.category}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">{activity.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {hostIsFriend ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Friend host
                      </span>
                    ) : null}
                    {activity.featured ? (
                      <span className="text-xs font-semibold text-pink-500 bg-pink-50 px-3 py-1 rounded-full">
                        Featured
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">{activity.description}</p>

                <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-600">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Date</span>
                    <span>{dateLabel ? `${dateLabel} at ${timeLabel}` : "Date to be announced"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Where</span>
                    <span>{activity.location || "To be confirmed"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Distance</span>
                    <span>{distanceLabel}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Hosted by {cardHostName}</span>
                    {hostId && !hostIsSelf ? (
                      <button
                        type="button"
                        onClick={() =>
                          hostIsFollowed
                            ? unfollowUser(hostId)
                            : followUser(hostId, { displayName: cardHostName })
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                          hostIsFollowed
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                            : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        }`}
                      >
                        {hostIsFollowed ? "Following" : "Follow"}
                      </button>
                    ) : null}
                  </div>
                  <span>{activity.attendees ?? 0} joined</span>
                </div>

                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: joined || waitlisted ? 1 : 1.03 }}
                    whileTap={{ scale: joined || waitlisted ? 1 : 0.97 }}
                    onClick={() => joinActivity(activity.id)}
                    disabled={joined || waitlisted}
                    className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      joined
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : waitlisted
                        ? "bg-amber-100 text-amber-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {joined ? "Joined" : waitlisted ? "Waitlisted" : "Join activity"}
                  </motion.button>

                  <button
                    onClick={() => toggleSaveActivity(activity.id)}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition ${
                      saved
                        ? "border-pink-500 text-pink-500 bg-pink-50"
                        : "border-gray-200 text-gray-400 hover:text-pink-500 hover:border-pink-500"
                    }`}
                    aria-label={saved ? "Remove from saved" : "Save this activity"}
                  >
                    <HeartIcon filled={saved} className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {nearbyActivities.length === 0 && (
            <div className="rounded-3xl border border-dashed border-indigo-300 bg-white/70 p-10 text-center text-gray-500">
              <h3 className="text-lg font-semibold text-indigo-500">No activities match your filters</h3>
              <p className="mt-2">
                Try widening your radius or changing the date to uncover more things happening around you.
              </p>
            </div>
          )}
        </div>
      )}
      <FriendInviteModal
        open={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onSubmit={handleFriendShare}
        friends={friendCircle}
        activity={selectedActivity}
        isSubmitting={friendSharePending}
      />
    </section>
  );
}




