"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

function formatDate(value) {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : typeof value === "number"
      ? new Date(value)
      : value instanceof Date
      ? value
      : null;
  if (!date) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GroupsTab() {
  const {
    groups,
    joinedGroups,
    joinGroup,
    leaveGroup,
    createGroup,
    subscribeToGroupBulletins,
    fetchGroupProfiles,
    currentUserId,
    loadingGroups,
    isMutating,
  } = useAppData();

  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    tags: "",
    image: "",
  });
  const [createError, setCreateError] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [bulletins, setBulletins] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [manageError, setManageError] = useState("");
  const [manageFeedback, setManageFeedback] = useState("");
  const [isManaging, setIsManaging] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const [recentlyJoinedGroup, setRecentlyJoinedGroup] = useState(null);

  const noticeBulletins = useMemo(
    () =>
      bulletins.filter(
        (bulletin) => bulletin?.type === "notice" || !bulletin?.type
      ),
    [bulletins]
  );

  const availableGroups = useMemo(
    () => groups.filter((group) => !joinedGroups.includes(group.id)),
    [groups, joinedGroups]
  );

  const selectedGroup = useMemo(
    () => availableGroups.find((group) => group.id === selectedGroupId) || null,
    [availableGroups, selectedGroupId]
  );

  useEffect(() => {
    if (availableGroups.length === 0) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      return;
    }
    if (!selectedGroupId || !availableGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [availableGroups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setBulletins([]);
      return;
    }
    const unsubscribe = subscribeToGroupBulletins(selectedGroupId, setBulletins);
    return () => unsubscribe();
  }, [selectedGroupId, subscribeToGroupBulletins]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMemberProfiles({});
      return;
    }
    const group = availableGroups.find((item) => item.id === selectedGroupId);
    if (!group) return;

    fetchGroupProfiles(group.memberIds || [])
      .then((profiles) => setMemberProfiles(profiles))
      .catch(() => setMemberProfiles({}));
  }, [selectedGroupId, availableGroups, fetchGroupProfiles]);

  useEffect(() => {
    if (recentlyJoinedGroup && !joinedGroups.includes(recentlyJoinedGroup.id)) {
      setRecentlyJoinedGroup(null);
    }
  }, [joinedGroups, recentlyJoinedGroup]);

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName || !trimmedDescription) {
      setCreateError("Please provide a group name and description.");
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDescription,
      isPrivate: form.isPrivate,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      image: form.image.trim(),
    };

    try {
      setIsSubmittingCreate(true);
      setCreateError("");
      const newGroupId = await createGroup(payload);
      setForm({ name: "", description: "", isPrivate: false, tags: "", image: "" });
      setShowCreateForm(false);
      if (newGroupId) {
        setSelectedGroupId(newGroupId);
      }
    } catch (error) {
      setCreateError(error.message || "We couldn't create the group. Please try again.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleJoinGroup = async (group) => {
    try {
      setManageError("");
      setManageFeedback("");
      setIsManaging(true);
      setPendingGroupId(group.id);
      setPendingAction("join");
      await joinGroup(group.id);
      setManageFeedback(`You're now part of ${group.name}. Head to the inbox to say hello.`);
      setRecentlyJoinedGroup({ id: group.id, name: group.name });
    } catch (error) {
      setManageError(error.message || "Unable to join this group right now.");
    } finally {
      setPendingGroupId(null);
      setPendingAction(null);
      setIsManaging(false);
    }
  };

  const navigateToMessages = (groupId) => {
    const params = new URLSearchParams();
    params.set("tab", "messages");
    if (groupId) {
      params.set("group", groupId);
    }
    router.push(`/app?${params.toString()}`, { scroll: false });
  };

  const handleLeaveGroup = async (group) => {
    if (group.ownerId === currentUserId) {
      setManageError("Transfer ownership before leaving this community.");
      return;
    }
    try {
      setManageError("");
      setManageFeedback("");
      setIsManaging(true);
      setPendingGroupId(group.id);
      setPendingAction("leave");
      await leaveGroup(group.id);
      setManageFeedback(`You left ${group.name}.`);
    } catch (error) {
      setManageError(error.message || "Unable to leave this group right now.");
    } finally {
      setPendingGroupId(null);
      setPendingAction(null);
      setIsManaging(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Groups & recurring communities</h2>
            <p className="text-gray-600 mt-2 max-w-3xl">
              Spin up spaces that meet regularly, post updates, and keep a pulse on what members need.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError("");
            }}
            className="self-start rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            {showCreateForm ? "Close form" : "Create a group"}
          </motion.button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateGroup} className="mt-6 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Group name (e.g. Sunrise Trail Runners)"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="Tags (comma separated)"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              placeholder="Describe the group's vibe, commitments, and meeting cadence."
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              required
            />
            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(event) => setForm({ ...form, isPrivate: event.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Private group (invitation required)
            </label>
            <input
              type="url"
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
              placeholder="Optional image URL for the group"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {createError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-2">
                {createError}
              </p>
            )}
            <motion.button
              whileHover={{ scale: isSubmittingCreate ? 1 : 1.03 }}
              whileTap={{ scale: isSubmittingCreate ? 1 : 0.97 }}
              type="submit"
              disabled={isSubmittingCreate}
              className={`rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-3 shadow-md hover:shadow-xl transition-all ${
                isSubmittingCreate ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmittingCreate ? "Publishing..." : "Publish group"}
            </motion.button>
          </form>
        )}
      </div>

      {recentlyJoinedGroup && (
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-700">
              You're in {recentlyJoinedGroup.name}.
            </p>
            <p className="text-xs text-indigo-500">
              Head to the inbox to meet members and start chatting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => {
                navigateToMessages(recentlyJoinedGroup.id);
                setRecentlyJoinedGroup(null);
              }}
              className="rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition"
            >
              Go to messages
            </motion.button>
            <button
              type="button"
              onClick={() => setRecentlyJoinedGroup(null)}
              className="rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-500 hover:bg-indigo-50 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loadingGroups ? (
        <div className="rounded-3xl border border-white/60 bg-white/70 shadow-inner px-6 py-16 text-center text-sm font-semibold text-indigo-500">
          Loading community spaces…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px),minmax(0,1fr)] xl:grid-cols-[minmax(0,420px),minmax(0,1fr)]">
          <aside className="space-y-4">
            {availableGroups.length === 0 && (
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 p-10 text-center text-gray-500">
                You're already in every available community. Head to the inbox or launch a new group.
              </div>
            )}
            {availableGroups.map((group) => {
              const member = joinedGroups.includes(group.id);
              const owner = group.ownerId === currentUserId;
              const active = selectedGroupId === group.id;
              const canLeave = member && !owner;

              return (
                <motion.div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`cursor-pointer rounded-3xl border shadow-lg transition-all ${
                    active
                      ? "border-indigo-300 bg-white ring-2 ring-indigo-100"
                      : "border-gray-100 bg-white/80 hover:border-indigo-200 hover:-translate-y-1"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-stretch">
                    <div className="relative h-40 w-full overflow-hidden rounded-t-3xl lg:m-4 lg:h-auto lg:w-56 lg:flex-shrink-0 lg:rounded-3xl">
                      <Image
                        src={group.image || "/pics/1.jpg"}
                        alt={group.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-white">
                        <div>
                          <h3 className="text-lg font-semibold drop-shadow">{group.name}</h3>
                          <p className="text-xs text-white/80">{group.baseLocation}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            group.isPrivate ? "bg-white/80 text-gray-700" : "bg-emerald-400 text-white"
                          }`}
                        >
                          {group.isPrivate ? "Private" : "Open"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-5 space-y-3 lg:p-6">
                      <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>Members: {group.membersCount ?? group.memberIds?.length ?? 0}</span>
                        <span>Next: {group.nextActivity || "TBD"}</span>
                        <span>Cadence: {group.cadence || "Flexible"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(group.tags || []).map((tag) => (
                          <span key={tag} className="text-xs bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {member ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (canLeave) {
                                handleLeaveGroup(group);
                              }
                            }}
                            disabled={
                              !canLeave ||
                              isManaging ||
                              isMutating ||
                              (pendingGroupId === group.id && pendingAction === "leave")
                            }
                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                              canLeave
                                ? "bg-red-100 text-red-600 hover:bg-red-200"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            {pendingGroupId === group.id && pendingAction === "leave"
                              ? "Leaving..."
                              : canLeave
                              ? "Leave group"
                              : "Owner"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleJoinGroup(group);
                            }}
                            disabled={
                              isManaging ||
                              isMutating ||
                              (pendingGroupId === group.id && pendingAction === "join")
                            }
                            className="flex-1 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition"
                          >
                            {pendingGroupId === group.id && pendingAction === "join"
                              ? "Joining..."
                              : "Join group"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedGroupId(group.id);
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-indigo-200 text-indigo-600"
                              : "border-gray-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600"
                          }`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </aside>

          <div className="space-y-6">
            {selectedGroup ? (
              <div className="rounded-3xl border border-white/70 bg-white shadow-xl overflow-hidden">
                {selectedGroup.image ? (
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={selectedGroup.image}
                      alt={selectedGroup.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-center justify-between gap-3 text-white">
                      <div>
                        <h3 className="text-2xl font-bold drop-shadow">{selectedGroup.name}</h3>
                        <p className="text-sm text-white/80">{selectedGroup.baseLocation || "Hybrid"}</p>
                      </div>
                      <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-indigo-600">
                        {selectedGroup.isPrivate ? "Private" : "Open"}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-8 p-6">
                  <div className="flex flex-col gap-4">
                    {!selectedGroup.image && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h3>
                        <span className="text-xs font-semibold text-gray-500">
                          {selectedGroup.membersCount ?? selectedGroup.memberIds?.length ?? 0} members
                        </span>
                      </div>
                    )}
                    <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-600 sm:grid-cols-3">
                      <div>
                        <p className="text-lg font-semibold text-indigo-700">
                          {selectedGroup.membersCount ?? selectedGroup.memberIds?.length ?? 0}
                        </p>
                        <p className="uppercase tracking-[0.3em] text-indigo-400">Members</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">{selectedGroup.cadence || "Flexible"}</p>
                        <p className="uppercase tracking-[0.3em] text-indigo-400">Cadence</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">{selectedGroup.nextActivity || "Next activity TBA"}</p>
                        <p className="uppercase tracking-[0.3em] text-indigo-400">Next Up</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {(selectedGroup.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {manageFeedback && (
                      <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2">
                        {manageFeedback}
                      </p>
                    )}
                    {manageError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-2">
                        {manageError}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-[0.3em] mb-3">
                      Members
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-auto pr-1">
                      {(selectedGroup.memberIds || []).map((memberId) => {
                        const profile = memberProfiles[memberId];
                        const name = profile?.name || "Member";

                        return (
                          <div
                            key={memberId}
                            className="rounded-2xl bg-gray-50 px-4 py-2"
                          >
                            <p className="text-sm font-semibold text-gray-800">{name}</p>
                            <p className="text-xs text-gray-500">{profile?.email || memberId}</p>
                          </div>
                        );
                      })}
                      {selectedGroup.memberIds?.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                          No members yet. Invite your first collaborators.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-[0.3em]">
                      Notices
                    </h4>
                    {noticeBulletins.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        Nothing posted yet. Check back soon for group updates.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {noticeBulletins.map((bulletin) => (
                          <div
                            key={bulletin.id}
                            className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold text-indigo-700">
                                {bulletin.title}
                              </h5>
                              <span className="text-xs text-indigo-400">
                                {formatDate(bulletin.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-indigo-900">
                              {bulletin.message}
                            </p>
                            <p className="text-xs text-indigo-500">
                              {bulletin.createdByName || "Organizer"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 px-6 py-16 text-center text-sm text-gray-500">
                Discoverable groups will appear here. Check your inbox for communities you already joined.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
