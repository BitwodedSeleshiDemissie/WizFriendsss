"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

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

export default function ActivitiesNearMeTab() {
  const {
    activities,
    categories,
    joinedActivities,
    waitlistedActivities,
    savedActivities,
    joinActivity,
    toggleSaveActivity,
    loadingActivities,
  } = useAppData();
  const [filters, setFilters] = useState({ category: "All", distance: "Any", date: "Any" });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: "All", distance: "Any", date: "Any" });
  };

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

  if (loadingActivities) {
    return (
      <section className="rounded-3xl bg-white/80 backdrop-blur border border-white/50 shadow-xl p-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-semibold text-indigo-500">Loading activities around you…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-white/80 backdrop-blur border border-white/50 shadow-xl p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Activities near you</h2>
            <p className="text-gray-600 mt-2 max-w-xl">
              Based on your current city and GPS radius. Adjust filters to narrow results by
              category, date, or distance.
            </p>
          </div>

          <button
            onClick={resetFilters}
            className="self-start md:self-auto text-sm font-semibold text-indigo-600 hover:text-pink-500 transition"
          >
            Reset filters
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
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
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {nearbyActivities.map((activity, index) => {
          const joined = joinedActivities.includes(activity.id);
          const waitlisted = waitlistedActivities.includes(activity.id);
          const saved = savedActivities.includes(activity.id);
          const eventDate = new Date(activity.dateTime);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-3xl bg-white shadow-lg border border-gray-100 p-6 space-y-4 hover:shadow-2xl transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">
                    {activity.category}
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{activity.title}</h3>
                </div>
                {activity.featured && (
                  <span className="text-xs font-semibold text-pink-500 bg-pink-50 px-3 py-1 rounded-full">
                    Featured
                  </span>
                )}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">{activity.description}</p>

              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{eventDate.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{activity.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🧭</span>
                  <span>{activity.distance} km away</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Hosted by {activity.host}</span>
                <span>{activity.attendees} joined</span>
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
                  {saved ? "♥" : "♡"}
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
    </section>
  );
}
