"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../../context/AppDataContext";

function formatNotificationTime(notification) {
  if (notification.timeLabel) return notification.timeLabel;
  const createdAt = notification.createdAt?.toDate
    ? notification.createdAt.toDate()
    : typeof notification.createdAt === "number"
    ? new Date(notification.createdAt)
    : null;
  if (!createdAt) return "Just now";
  return createdAt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLogTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Recent";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ProfileTab() {
  const {
    userProfile: user,
    activities,
    groups,
    ideas,
    joinedActivities,
    joinedGroups,
    savedActivities,
    notifications,
    loading,
    ideaEndorsements,
    uploadProfilePhoto,
  } = useAppData();

  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const fileInputRef = useRef(null);

  const photoSource = photoPreview || user.photoURL || "/pics/1.jpg";
  const profileCompletion = Math.min(100, Math.max(0, Number(user.profileCompletion ?? 0)));
  const displayTagline = user.tagline || "Let's build community together.";
  const interests = Array.isArray(user.interests) ? user.interests.filter(Boolean) : [];
  const firstName = (user.name || "You").split(" ")[0];

  useEffect(() => {
    if (photoPreview && user.photoURL && photoPreview !== user.photoURL) {
      setPhotoPreview("");
    }
  }, [photoPreview, user.photoURL]);

  const handlePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (PNG, JPG).");
      event.target.value = "";
      return;
    }
    if (typeof uploadProfilePhoto !== "function") {
      setUploadError("Profile photo uploads are unavailable right now.");
      event.target.value = "";
      return;
    }
    setIsUploadingPhoto(true);
    setUploadError("");
    try {
      const url = await uploadProfilePhoto(file);
      setPhotoPreview(url);
    } catch (error) {
      setUploadError(error?.message || "We couldn't update your photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const joined = useMemo(
    () => activities.filter((activity) => joinedActivities.includes(activity.id)),
    [activities, joinedActivities]
  );

  const favourites = useMemo(
    () =>
      activities.filter(
        (activity) => (user.favourites || []).includes(activity.id) || savedActivities.includes(activity.id)
      ),
    [activities, savedActivities, user.favourites]
  );

  const myGroups = useMemo(
    () => groups.filter((group) => joinedGroups.includes(group.id)),
    [groups, joinedGroups]
  );

  const ideasEndorsed = useMemo(() => ideaEndorsements.length, [ideaEndorsements]);

  const activityLogEntries = useMemo(() => {
    const entries = [];
    const userId = user.id || user.uid || null;
    const ideaList = Array.isArray(ideas) ? ideas : [];

    joined.forEach((activity) => {
      entries.push({
        id: `joined-${activity.id}`,
        kind: "Joined activity",
        title: activity.title,
        detail: activity.location || activity.city || "",
        timestamp: activity.dateTime || activity.createdAt || activity.updatedAt || null,
      });
    });

    favourites.forEach((activity) => {
      entries.push({
        id: `saved-${activity.id}`,
        kind: "Saved activity",
        title: activity.title,
        detail: activity.category || activity.city || "",
        timestamp: activity.updatedAt || activity.dateTime || null,
      });
    });

    myGroups.forEach((group) => {
      entries.push({
        id: `group-${group.id}`,
        kind: "Joined group",
        title: group.name,
        detail: group.baseLocation || group.cadence || "",
        timestamp: group.createdAt || group.updatedAt || null,
      });
    });

    ideaList
      .filter((idea) => idea.createdBy && idea.createdBy === userId)
      .forEach((idea) => {
        entries.push({
          id: `idea-${idea.id}`,
          kind: "Proposed idea",
          title: idea.title,
          detail: idea.status ? `Status: ${idea.status}` : "",
          timestamp: idea.createdAt || idea.updatedAt || null,
        });
      });

    ideaList
      .filter((idea) => ideaEndorsements.includes(idea.id) && idea.createdBy !== userId)
      .forEach((idea) => {
        entries.push({
          id: `endorsed-${idea.id}`,
          kind: "Endorsed idea",
          title: idea.title,
          detail: idea.category || "",
          timestamp: idea.updatedAt || idea.createdAt || null,
        });
      });

    return entries
      .map((entry, index) => {
        const dt = entry.timestamp ? new Date(entry.timestamp) : null;
        return {
          ...entry,
          timestamp: dt && !Number.isNaN(dt.getTime()) ? dt : null,
          order: index,
        };
      })
      .sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
        if (a.timestamp) return -1;
        if (b.timestamp) return 1;
        return b.order - a.order;
      });
  }, [favourites, ideaEndorsements, ideas, joined, myGroups, user.id, user.uid]);

  if (loading) {
    return (
      <section className="min-h-[50vh] flex items-center justify-center bg-white/70 rounded-3xl border border-white/60 shadow-inner">
        <p className="text-sm font-semibold text-indigo-500">Loading profile data...</p>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white shadow-xl overflow-hidden">
        <div className="relative h-48 sm:h-64">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" />
        </div>
        <div className="px-6 pb-8 sm:px-10 -mt-16 sm:-mt-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative h-32 w-32 sm:h-36 sm:w-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                <Image src={photoSource} alt={`${user.name}'s profile photo`} fill sizes="144px" className="object-cover" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold text-white">{user.name}</p>
                  {joinedGroups.length ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80 bg-white/10 px-3 py-1 rounded-full shadow">
                      {joinedGroups.length} groups
                    </span>
                  ) : null}
                </div>
                {displayTagline ? <p className="text-sm text-white/90">{displayTagline}</p> : null}
                <div className="flex flex-wrap gap-2 text-xs text-white/80 mt-2">
                  {user.homeCity ? (
                    <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                      <span className="font-semibold text-white">Home</span>
                      {user.homeCity}
                    </span>
                  ) : null}
                  {user.currentCity ? (
                    <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                      <span className="font-semibold text-white">Current</span>
                      {user.currentCity}
                    </span>
                  ) : null}
                  {user.email ? (
                    <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                      <span className="font-semibold text-white">Email</span>
                      {user.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePhotoButtonClick}
                  disabled={isUploadingPhoto}
                  className={`inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-indigo-600 shadow transition hover:shadow-md ${
                    isUploadingPhoto ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isUploadingPhoto ? "Uploading..." : "Update photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowActivityLog((previous) => !previous)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                    showActivityLog
                      ? "border-white bg-white/15 text-white shadow"
                      : "border-white/70 text-white/90 hover:bg-white/10"
                  }`}
                  aria-expanded={showActivityLog}
                  aria-controls="activity-log"
                >
                  {showActivityLog ? "Hide log" : "Activity log"}
                </button>
                <a
                  href="#profile-settings"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Profile settings
                </a>
              </div>
              {uploadError ? (
                <p className="text-xs text-red-200 bg-white/10 border border-white/20 rounded-full px-4 py-1">
                  {uploadError}
                </p>
              ) : null}
              <div className="w-full sm:w-64 rounded-2xl border border-white/40 bg-white/20 backdrop-blur px-4 py-3 shadow">
                <p className="text-xs font-semibold text-white/90">Profile completion</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/80">Complete more profile details to unlock organiser insights.</p>
              </div>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Activities joined" value={joinedActivities.length} icon={<span aria-hidden="true">📅</span>} />
        <StatCard label="Groups" value={joinedGroups.length} icon={<span aria-hidden="true">🤝</span>} />
        <StatCard label="Ideas endorsed" value={ideasEndorsed} icon={<span aria-hidden="true">💡</span>} />
        <StatCard label="Upcoming invites" value={notifications.length} icon={<span aria-hidden="true">📬</span>} />
      </div>

      {showActivityLog ? (
        <ActivityLogCard
          entries={activityLogEntries}
          onClose={() => setShowActivityLog(false)}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-8 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">About {firstName}</h3>
          <p className="text-sm text-gray-600">{displayTagline}</p>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm text-gray-600">
            <div>
              <dt className="font-semibold text-gray-800">Home base</dt>
              <dd>{user.homeCity || "Add your home city"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-800">Current city</dt>
              <dd>{user.currentCity || "Add your current city"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-800">Groups</dt>
              <dd>{joinedGroups.length} joined</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-800">Activities</dt>
              <dd>{joinedActivities.length} attended</dd>
            </div>
            {user.email ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-gray-800">Contact</dt>
                <dd>{user.email}</dd>
              </div>
            ) : null}
          </dl>
          {interests.length ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span key={interest} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                  #{interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Add a few interests to let friends know what you care about.</p>
          )}
        </div>
        <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Highlights</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>{joinedActivities.length} activities participated in</li>
            <li>{joinedGroups.length} communities you check in with</li>
            <li>{favourites.length} favourites saved for later</li>
            <li>{notifications.length} recent notifications</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <a
              href="/app?tab=explore"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
            >
              Discover activities
            </a>
            <a
              href="/app?tab=groups"
              className="inline-flex items-center justify-center rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              Find groups
            </a>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title="My activities"
          description="Everything you have joined or created."
          emptyHint="Join an activity to see it here."
          items={joined}
          renderItem={(activity) => {
            const eventDate = new Date(activity.dateTime);
            return (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">{activity.title}</p>
                <p className="text-xs text-gray-500">
                  {eventDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - {activity.location}
                </p>
              </div>
            );
          }}
        />

        <Section
          title="Notifications"
          description="Stay in the loop with reminders and invites."
          emptyHint="You are all caught up."
          items={notifications}
          renderItem={(notification) => (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
              <p className="text-xs text-gray-500">{formatNotificationTime(notification)}</p>
              <p className="text-xs text-gray-500">{notification.message}</p>
            </div>
          )}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section
          title="My groups"
          description="Communities you meet with regularly."
          emptyHint="Join a group to build recurring connections."
          items={myGroups}
          renderItem={(group) => (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">{group.name}</p>
              <p className="text-xs text-gray-500">
                {(group.membersCount ?? group.members ?? 0)} members - next {group.nextActivity}
              </p>
            </div>
          )}
        />

        <Section
          title="Favourites"
          description="Saved events to revisit later."
          emptyHint="Tap the heart icon on activities you like."
          items={favourites}
          renderItem={(activity) => (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800">{activity.title}</p>
              <p className="text-xs text-gray-500">
                {activity.city} - {activity.category}
              </p>
            </div>
          )}
        />
      </div>

      <div id="profile-settings" className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <label className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            Event reminders
            <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
          </label>
          <label className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            New idea alerts
            <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
          </label>
          <label className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            Weekly digest
            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
          </label>
          <label className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            Allow organiser invites
            <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
          </label>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 shadow-lg p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-pink-600/10 text-2xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, description, emptyHint, items, renderItem }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-lg p-6 space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">{emptyHint}</p>
        ) : (
          items.map((item) => (
            <div key={item.id || item.title} className="rounded-2xl bg-gray-50 px-4 py-3">
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityLogCard({ entries, onClose }) {
  return (
    <div id="activity-log" className="rounded-3xl border border-gray-100 bg-white shadow-xl p-6 md:p-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity log</h3>
          <p className="text-sm text-gray-500">Timeline of everything you've been up to recently.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="self-start rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          Close log
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Your log is clear for now. Join an activity or endorse an idea to see it appear here.
        </p>
      ) : (
        <ol className="space-y-3 text-sm text-gray-600">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-indigo-500 font-semibold">{entry.kind}</p>
                  <p className="text-base font-semibold text-gray-900">{entry.title}</p>
                  {entry.detail ? <p className="text-xs text-gray-500 mt-1">{entry.detail}</p> : null}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatLogTime(entry.timestamp)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
