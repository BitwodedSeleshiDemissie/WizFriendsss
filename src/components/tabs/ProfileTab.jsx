"use client";

import { useMemo } from "react";
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

export default function ProfileTab() {
  const {
    userProfile: user,
    activities,
    groups,
    joinedActivities,
    joinedGroups,
    savedActivities,
    notifications,
    loading,
    ideaEndorsements,
  } = useAppData();

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

  if (loading) {
    return (
      <section className="min-h-[50vh] flex items-center justify-center bg-white/70 rounded-3xl border border-white/60 shadow-inner">
        <p className="text-sm font-semibold text-indigo-500">Loading profile data…</p>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">Profile</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">{user.name}</h2>
            <p className="text-gray-600 mt-2">{user.tagline}</p>
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
              <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                Home: {user.homeCity}
              </span>
              <span className="bg-pink-50 text-pink-500 px-3 py-1 rounded-full">
                Current: {user.currentCity}
              </span>
            </div>
          </div>
          <div className="lg:w-60 bg-gradient-to-r from-indigo-600/10 to-pink-600/10 border border-white/70 rounded-3xl p-6 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Profile completion</p>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-pink-500"
                style={{ width: `${user.profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">Complete your profile to unlock organiser insights.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Activities joined" value={joinedActivities.length} icon="🎉" />
        <StatCard label="Groups" value={joinedGroups.length} icon="🤝" />
        <StatCard label="Ideas endorsed" value={ideasEndorsed} icon="💡" />
        <StatCard label="Upcoming invites" value={notifications.length} icon="🔔" />
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
                  {eventDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {activity.location}
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
                {(group.membersCount ?? group.members ?? 0)} members · next {group.nextActivity}
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
                {activity.city} · {activity.category}
              </p>
            </div>
          )}
        />
      </div>

      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10 space-y-6">
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
