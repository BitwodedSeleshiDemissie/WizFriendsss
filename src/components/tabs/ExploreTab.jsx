"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

export default function ExploreTab() {
  const {
    activities,
    featuredActivities,
    trendingActivities,
    joinActivity,
    toggleSaveActivity,
    joinedActivities,
    waitlistedActivities,
    savedActivities,
    loadingActivities,
  } = useAppData();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");

  const cities = useMemo(() => {
    const unique = new Set(activities.map((activity) => activity.city));
    return ["All", ...Array.from(unique)];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return activities.filter((activity) => {
      const matchesCity = selectedCity === "All" || activity.city === selectedCity;
      const matchesSearch =
        !term ||
        activity.title.toLowerCase().includes(term) ||
        activity.category.toLowerCase().includes(term) ||
        activity.tags?.some((tag) => tag.toLowerCase().includes(term));
      return matchesCity && matchesSearch;
    });
  }, [activities, searchTerm, selectedCity]);

  if (loadingActivities) {
    return (
      <section className="rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-semibold text-indigo-500">Loading explore catalogue…</p>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10">
        <h2 className="text-3xl font-extrabold text-gray-900">Search & Explore</h2>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Look beyond your immediate neighbourhood. Discover activities across the city—or halfway across the globe—and bookmark the ones you want to experience.
        </p>

        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by keyword, interest, or host"
              className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          </div>

          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city === "All" ? "All cities" : city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {featuredActivities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Featured activities</h3>
            <span className="text-xs uppercase tracking-widest text-pink-500 font-semibold">
              Sponsored
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredActivities.map((activity) => {
              const joined = joinedActivities.includes(activity.id);
              const waitlisted = waitlistedActivities.includes(activity.id);
              const saved = savedActivities.includes(activity.id);
              const eventDate = new Date(activity.dateTime);

              return (
                <motion.div
                  key={activity.id}
                  whileHover={{ translateY: -6 }}
                  className="rounded-3xl border border-pink-100 bg-white shadow-xl p-6 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">
                        {activity.category}
                      </p>
                      <h4 className="text-lg font-bold text-gray-900 mt-1">{activity.title}</h4>
                    </div>
                    <span className="text-xs font-semibold text-pink-500 bg-pink-50 px-3 py-1 rounded-full">
                      Featured
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{activity.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>📍 {activity.location}</p>
                    <p>📅 {eventDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: joined || waitlisted ? 1 : 1.03 }}
                      whileTap={{ scale: joined || waitlisted ? 1 : 0.97 }}
                      disabled={joined || waitlisted}
                      onClick={() => joinActivity(activity.id)}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        joined
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : waitlisted
                          ? "bg-amber-100 text-amber-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md hover:shadow-lg"
                      }`}
                    >
                      {joined ? "Joined" : waitlisted ? "Waitlisted" : "Join"}
                    </motion.button>
                    <button
                      onClick={() => toggleSaveActivity(activity.id)}
                      className={`w-11 h-11 rounded-full border flex items-center justify-center transition ${
                        saved
                          ? "border-pink-500 text-pink-500 bg-pink-50"
                          : "border-gray-200 text-gray-400 hover:text-pink-500 hover:border-pink-500"
                      }`}
                    >
                      {saved ? "♥" : "♡"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {trendingActivities.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-indigo-50 to-pink-50 border border-white/60 shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-semibold text-gray-900">Trending this week</h3>
            <span className="text-xs uppercase tracking-[0.25em] text-indigo-500 font-semibold">
              Most joined
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingActivities.map((activity) => (
              <div key={activity.id} className="bg-white rounded-2xl shadow border border-gray-100 p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">
                  {activity.category}
                </p>
                <h4 className="text-base font-semibold text-gray-900">{activity.title}</h4>
                <p className="text-xs text-gray-500">👥 {activity.attendees} people attending</p>
                <p className="text-xs text-gray-500">📍 {activity.city}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">All activities</h3>
          <span className="text-sm text-gray-500">
            Showing {filteredActivities.length} results
          </span>
        </div>

        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const joined = joinedActivities.includes(activity.id);
            const waitlisted = waitlistedActivities.includes(activity.id);
            const saved = savedActivities.includes(activity.id);
            const eventDate = new Date(activity.dateTime);
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all p-5 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">
                        {activity.category}
                      </p>
                      {activity.isVirtual && (
                        <span className="text-xs font-semibold text-purple-500 bg-purple-50 px-3 py-1 rounded-full">
                          Virtual
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mt-1">{activity.title}</h4>
                    <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>📅 {eventDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    <p>📍 {activity.location}</p>
                    <p>🏷️ Tags: {activity.tags?.join(", ")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <motion.button
                    whileHover={{ scale: joined || waitlisted ? 1 : 1.03 }}
                    whileTap={{ scale: joined || waitlisted ? 1 : 0.97 }}
                    disabled={joined || waitlisted}
                    onClick={() => joinActivity(activity.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      joined
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : waitlisted
                        ? "bg-amber-100 text-amber-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md hover:shadow-lg"
                    }`}
                  >
                    {joined ? "Joined" : waitlisted ? "Waitlisted" : "Join"}
                  </motion.button>
                  <button
                    onClick={() => toggleSaveActivity(activity.id)}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center transition ${
                      saved
                        ? "border-pink-500 text-pink-500 bg-pink-50"
                        : "border-gray-200 text-gray-400 hover:text-pink-500 hover:border-pink-500"
                    }`}
                  >
                    {saved ? "♥" : "♡"}
                  </button>
                  <span className="text-xs text-gray-500">👥 {activity.attendees} attending</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
