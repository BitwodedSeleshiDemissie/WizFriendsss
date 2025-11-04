"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import ActivitiesNearMeTab from "../../components/tabs/ActivitiesNearMeTab";
import ExploreTab from "../../components/tabs/ExploreTab";
import BrainstormTab from "../../components/tabs/BrainstormTab";
import MessagesTab from "../../components/tabs/MessagesTab";
import GroupsTab from "../../components/tabs/GroupsTab";
import ProfileTab from "../../components/tabs/ProfileTab";
import BottomTabNav from "../../components/BottomTabNav";
import { AppDataProvider, useAppData } from "../../context/AppDataContext";
import ProtectedRoute from "../../components/ProtectedRoute";
import { searchPlaceSuggestions } from "../../lib/placeSuggestions";

const TAB_CONFIG = [
  { id: "nearby", label: "Near Me", icon: "📍" },
  { id: "explore", label: "Explore", icon: "🧭" },
  { id: "brainstorm", label: "Brainstorm", icon: "💡" },
  { id: "groups", label: "Groups", icon: "🤝" },
  { id: "messages", label: "Inbox", icon: "💬" },
  { id: "profile", label: "Profile", icon: "🧑" },
];

const CATEGORY_OPTIONS = [
  "Wellness",
  "Food & Drink",
  "Outdoors & Adventure",
  "Arts & Culture",
  "Sports & Fitness",
  "Learning & Workshops",
  "Volunteering",
  "Networking & Professional",
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const groupParam = searchParams?.get("group");
  const initialMessageGroupId = groupParam || null;
  const {
    proposeBrainstormIdea,
    userProfile,
    activities,
    notifications,
    groups,
    loading,
    loadingActivities,
    loadingGroups,
    loadingNotifications,
    isMutating,
  } = useAppData();

  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam && TAB_CONFIG.some((tab) => tab.id === tabParam)) {
      return tabParam;
    }
    if (!tabParam && groupParam) {
      return "messages";
    }
    return "nearby";
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formError, setFormError] = useState("");

  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleViewportChange = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  const defaultForm = useMemo(
    () => ({
      title: "",
      description: "",
      category: "",
      date: "",
      time: "",
      location: "",
      lat: null,
      lng: null,
      city: userProfile.currentCity,
      distance: "5",
      isFeatured: false,
      isVirtual: false,
    }),
    [userProfile.currentCity]
  );

  const [createForm, setCreateForm] = useState(defaultForm);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationBlurTimeout = useRef(null);

  const locationSuggestions = useMemo(() => {
    const query = createForm.location?.trim();
    const baseCity = createForm.city?.trim() || userProfile.currentCity || "";
    if (!query) {
      return [];
    }
    return searchPlaceSuggestions(query, baseCity);
  }, [createForm.location, createForm.city, userProfile.currentCity]);

  const handleLocationChange = (event) => {
    const value = event.target.value;
    setCreateForm((prev) => ({
      ...prev,
      location: value,
      lat: null,
      lng: null,
    }));
    if (locationBlurTimeout.current) {
      clearTimeout(locationBlurTimeout.current);
      locationBlurTimeout.current = null;
    }
    setLocationDropdownOpen(true);
  };

  const handleLocationFocus = () => {
    if (locationBlurTimeout.current) {
      clearTimeout(locationBlurTimeout.current);
      locationBlurTimeout.current = null;
    }
    setLocationDropdownOpen(true);
  };

  const handleLocationBlur = () => {
    if (locationBlurTimeout.current) {
      clearTimeout(locationBlurTimeout.current);
    }
    locationBlurTimeout.current = setTimeout(() => {
      setLocationDropdownOpen(false);
    }, 120);
  };

  const handleSelectLocationSuggestion = (suggestion) => {
    setCreateForm((prev) => ({
      ...prev,
      location: suggestion.name,
      city: prev.city || suggestion.city,
      lat: typeof suggestion.latitude === "number" ? suggestion.latitude : prev.lat,
      lng: typeof suggestion.longitude === "number" ? suggestion.longitude : prev.lng,
    }));
    if (locationBlurTimeout.current) {
      clearTimeout(locationBlurTimeout.current);
      locationBlurTimeout.current = null;
    }
    setLocationDropdownOpen(false);
  };


  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    const params = new URLSearchParams();
    if (activeTab !== "nearby") {
      params.set("tab", activeTab);
    }
    if (activeTab === "messages" && initialMessageGroupId) {
      params.set("group", initialMessageGroupId);
    }
    const query = params.toString();
    const destination = query ? `/app?${query}` : "/app";
    router.replace(destination, { scroll: false });
  }, [activeTab, initialMessageGroupId, router]);

  useEffect(() => {
    setCreateForm(defaultForm);
  }, [defaultForm]);

  useEffect(() => {
    return () => {
      if (locationBlurTimeout.current) {
        clearTimeout(locationBlurTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (tabParam && TAB_CONFIG.some((tab) => tab.id === tabParam)) {
      setActiveTab((previous) => (previous === tabParam ? previous : tabParam));
      return;
    }
    if (!tabParam && groupParam) {
      setActiveTab((previous) => (previous === "messages" ? previous : "messages"));
      return;
    }
    setActiveTab((previous) => (previous === "nearby" ? previous : "nearby"));
  }, [tabParam, groupParam]);

  const handleTabChange = (tabId, options = {}) => {
    const { scroll = true, groupId = null } = options;
    if (!TAB_CONFIG.some((tab) => tab.id === tabId)) return;
    setActiveTab(tabId);
    const params = new URLSearchParams();
    if (tabId !== "nearby") {
      params.set("tab", tabId);
    }
    if (tabId === "messages" && groupId) {
      params.set("group", groupId);
    }
    const query = params.toString();
    const destination = query ? `/app?${query}` : "/app";
    router.replace(destination, { scroll });
  };

  const handleCreateActivitySubmit = async (event) => {
    event.preventDefault();
    setIsPublishing(true);
    setFormError("");
    try {
      await Promise.resolve(
        proposeBrainstormIdea({
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          date: createForm.date,
          time: createForm.time,
          location: createForm.location,
          city: createForm.city,
          isVirtual: createForm.isVirtual,
        })
      );
      setCreateForm(defaultForm);
      setShowCreateModal(false);
      setActiveTab("brainstorm");
      router.replace("/app?tab=brainstorm", { scroll: false });
    } catch (error) {
      setFormError(error.message || "We couldn't submit the idea. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const isMessagesView = activeTab === "messages";
  const messagesViewportOffset = isMessagesView
    ? isMobileViewport
      ? "9.5rem"
      : "14.5rem"
    : "18.5rem";

  const mainClassName = [
    "relative min-h-screen min-h-[100dvh] bg-gradient-to-b from-white via-indigo-50 to-pink-100 text-gray-900",
    isMessagesView ? "overflow-hidden pb-24 lg:pb-32" : "pb-40",
  ].join(" ");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "nearby":
        return <ActivitiesNearMeTab />;
      case "explore":
        return <ExploreTab />;
      case "brainstorm":
        return <BrainstormTab onCreateActivity={openCreateModal} />;
      case "groups":
        return <GroupsTab />;
      case "messages":
        return <MessagesTab initialGroupId={initialMessageGroupId} viewportOffset={messagesViewportOffset} />;
      case "profile":
        return <ProfileTab />;
      default:
        return null;
    }
  };

  const totalUpcomingActivities = loadingActivities ? "…" : activities.length;
  const totalGroups = loadingGroups ? "…" : groups.length;
  const unreadNotifications = loadingNotifications ? "…" : notifications.length;
  const showDashboardHero = activeTab === "nearby" && !isMobileViewport;

  return (
    <main className={mainClassName}>

      {isMessagesView ? (
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24">
          {renderActiveTab()}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-5 pt-20 sm:pt-24 lg:pt-28 space-y-12">
          {showDashboardHero && (
            <header className="rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">
                  WizFriends - Product v1.0
                </p>
                <h1 className="text-4xl md:text-5xl font-black leading-tight">
                  Find your people, wherever you are.
                </h1>
                <p className="text-gray-600 max-w-2xl">
                  Built for newcomers, locals, and community builders. Discover activities, surface new ideas,
                  spin up recurring groups, and keep everything organised in one place.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">Activities Near Me</span>
                  <span className="bg-pink-50 text-pink-500 px-3 py-1 rounded-full">Explore & Featured</span>
                  <span className="bg-purple-50 text-purple-500 px-3 py-1 rounded-full">Brainstorm with AI</span>
                  <span className="bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full">Groups & Community</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Profile Hub</span>
                </div>
              </div>
              <div className="lg:w-72 bg-gradient-to-br from-indigo-600/10 to-pink-600/10 border border-white/70 rounded-3xl p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-800">Product health snapshot</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Upcoming activities</span>
                    <span className="font-semibold text-indigo-600">{totalUpcomingActivities}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active groups</span>
                    <span className="font-semibold text-pink-500">{totalGroups}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Open notifications</span>
                    <span className="font-semibold text-purple-500">{unreadNotifications}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Success = new members joining or endorsing within 3 days, at least one event per first session,
                  and weekly returners hosting or attending.
                </p>
              </div>
            </header>
          )}

          <section className={showDashboardHero ? "" : "pt-6"}>{renderActiveTab()}</section>
        </div>
      )}


      <BottomTabNav
        tabs={TAB_CONFIG}
        activeTab={activeTab}
        onChange={(tabId) => handleTabChange(tabId, { scroll: false })}
      />

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-white/60 p-6 md:p-8 space-y-6 sm:max-h-[calc(100vh-4rem)]"
            >
              <button
                onClick={closeCreateModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label="Close create activity form"
              >
                ✕
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Propose a new community experience</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Share the essentials—your idea will appear in Brainstorm and gather endorsements before it
                  goes live in the activities feed.
                </p>
              </div>
              <form onSubmit={handleCreateActivitySubmit} className="space-y-4">
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Event title (e.g. Sunrise trail run)"
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <select
                  value={createForm.category}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={createForm.location}
                      onChange={handleLocationChange}
                      onFocus={handleLocationFocus}
                      onBlur={handleLocationBlur}
                      placeholder="Location"
                      autoComplete="off"
                      className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    {locationDropdownOpen && locationSuggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-lg">
                        {locationSuggestions.map((suggestion) => (
                          <li key={suggestion.id}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectLocationSuggestion(suggestion)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 focus:outline-none"
                            >
                              <span className="block font-medium text-gray-800">{suggestion.name}</span>
                              <span className="block text-xs text-gray-500">
                                {suggestion.subtitle || `${suggestion.city}, ${suggestion.region}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder="Describe who it's for and what to expect..."
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="time"
                    value={createForm.time}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, time: event.target.value }))}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <input
                    type="number"
                    min="0"
                    value={createForm.distance}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, distance: event.target.value }))}
                    placeholder="Distance (km)"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={createForm.isVirtual}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, isVirtual: event.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Virtual event
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={createForm.isFeatured}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Feature this listing
                  </label>
                </div>
                {formError && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-2">
                    {formError}
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: isPublishing || isMutating ? 1 : 1.03 }}
                  whileTap={{ scale: isPublishing || isMutating ? 1 : 0.97 }}
                  type="submit"
                  disabled={isPublishing || isMutating}
                  className={`w-full rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all ${
                    isPublishing || isMutating ? "cursor-not-allowed opacity-80" : ""
                  }`}
                >
                  {isPublishing || isMutating ? "Submitting..." : "Submit for endorsements"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-indigo-50 to-pink-100 text-gray-500">
          <p className="text-sm font-semibold text-indigo-500">Loading your dashboard…</p>
        </main>
      }
    >
      <ProtectedRoute>
        <AppDataProvider>
          <HomeContent />
        </AppDataProvider>
      </ProtectedRoute>
    </Suspense>
  );
}

