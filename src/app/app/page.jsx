"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import ActivitiesNearMeTab from "../../components/tabs/ActivitiesNearMeTab";
import ExploreTab from "../../components/tabs/ExploreTab";
import BrainstormTab from "../../components/tabs/BrainstormTab";
import GroupsTab from "../../components/tabs/GroupsTab";
import ProfileTab from "../../components/tabs/ProfileTab";
import BottomTabNav from "../../components/BottomTabNav";
import { AppDataProvider, useAppData } from "../../context/AppDataContext";
import ProtectedRoute from "../../components/ProtectedRoute";

const TAB_CONFIG = [
  { id: "nearby", label: "Near Me", icon: "📍" },
  { id: "explore", label: "Explore", icon: "🧭" },
  { id: "brainstorm", label: "Brainstorm", icon: "💡" },
  { id: "groups", label: "Groups", icon: "🤝" },
  { id: "profile", label: "Profile", icon: "🧑" },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    createActivity,
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

  const [activeTab, setActiveTab] = useState("nearby");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formError, setFormError] = useState("");

  const defaultForm = useMemo(
    () => ({
      title: "",
      description: "",
      category: "",
      date: "",
      time: "",
      location: "",
      city: userProfile.currentCity,
      distance: "5",
      isFeatured: false,
      isVirtual: false,
    }),
    [userProfile.currentCity]
  );

  const [createForm, setCreateForm] = useState(defaultForm);

  const openCreateModal = useCallback(() => {
    if (activeTab !== "nearby") {
      setActiveTab("nearby");
      const destination = "/app";
      router.replace(destination, { scroll: false });
    }
    setShowCreateModal(true);
  }, [activeTab, router]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    const destination = activeTab === "nearby" ? "/app" : `/app?tab=${activeTab}`;
    router.replace(destination, { scroll: false });
  }, [activeTab, router]);

  useEffect(() => {
    setCreateForm(defaultForm);
  }, [defaultForm]);

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && TAB_CONFIG.some((tab) => tab.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (!tabParam && activeTab !== "nearby") {
      setActiveTab("nearby");
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId, options = { scroll: true }) => {
    if (!TAB_CONFIG.some((tab) => tab.id === tabId)) return;
    setActiveTab(tabId);
    const destination = tabId === "nearby" ? "/app" : `/app?tab=${tabId}`;
    router.replace(destination, { scroll: options.scroll });
  };

  const handleCreateActivitySubmit = async (event) => {
    event.preventDefault();
    setIsPublishing(true);
    setFormError("");
    try {
      await Promise.resolve(
        createActivity({
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          date: createForm.date,
          time: createForm.time,
          location: createForm.location,
          city: createForm.city,
          distance: createForm.distance,
          isFeatured: createForm.isFeatured,
          isVirtual: createForm.isVirtual,
        })
      );
      setCreateForm(defaultForm);
      closeCreateModal();
      handleTabChange("nearby", { scroll: false });
    } catch (error) {
      setFormError(error.message || "We couldn't publish the activity. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

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
      case "profile":
        return <ProfileTab />;
      default:
        return null;
    }
  };

  const totalUpcomingActivities = loadingActivities ? "…" : activities.length;
  const totalGroups = loadingGroups ? "…" : groups.length;
  const unreadNotifications = loadingNotifications ? "…" : notifications.length;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-100 text-gray-900 pb-40">
      <div className="max-w-7xl mx-auto px-5 pt-28 space-y-12">
        <header className="rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">
              HomeConnect · Product v1.0
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

        <section>{renderActiveTab()}</section>
      </div>

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
              className="relative max-w-xl w-full rounded-3xl bg-white shadow-2xl border border-white/60 p-6 md:p-8 space-y-6"
            >
              <button
                onClick={closeCreateModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label="Close create activity form"
              >
                ✕
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create a new activity</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Share the essentials—community members will see this in Activities Near Me and Explore.
                </p>
              </div>
              <form onSubmit={handleCreateActivitySubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Activity title"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    value={createForm.category}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Category (e.g. Wellness, Food)"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Location"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  {isPublishing || isMutating ? "Publishing..." : "Publish activity"}
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
    <ProtectedRoute>
      <AppDataProvider>
        <HomeContent />
      </AppDataProvider>
    </ProtectedRoute>
  );
}
