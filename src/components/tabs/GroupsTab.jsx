"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

export default function GroupsTab() {
  const {
    groups,
    joinedGroups,
    joinGroup,
    leaveGroup,
    createGroup,
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

  const [manageError, setManageError] = useState("");
  const [manageFeedback, setManageFeedback] = useState("");
  const [isManaging, setIsManaging] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const [recentlyJoinedGroup, setRecentlyJoinedGroup] = useState(null);

  const availableGroups = useMemo(
    () => groups.filter((group) => !joinedGroups.includes(group.id)),
    [groups, joinedGroups]
  );

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
        setRecentlyJoinedGroup({ id: newGroupId, name: trimmedName });
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

  const navigateToMessages = (groupId) => {
    const params = new URLSearchParams();
    params.set("tab", "messages");
    if (groupId) {
      params.set("group", groupId);
    }
    router.push(`/app?${params.toString()}`, { scroll: false });
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

      {loadingGroups ? (
        <div className="rounded-3xl border border-white/60 bg-white/70 shadow-inner px-6 py-16 text-center text-sm font-semibold text-indigo-500">
          Loading community spaces…
        </div>
      ) : (
        <div className="space-y-4">
          {availableGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 p-10 text-center text-gray-500">
              You're already in every available community. Head to the inbox or launch a new group.
            </div>
          ) : (
            availableGroups.map((group) => {
              const member = joinedGroups.includes(group.id);
              const owner = group.ownerId === currentUserId;
              const canLeave = member && !owner;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-gray-100 bg-white/80 shadow-lg transition-all hover:border-indigo-200 hover:-translate-y-1"
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
                            onClick={() => {
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
                            onClick={() => handleJoinGroup(group)}
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
                          onClick={() => navigateToMessages(group.id)}
                          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:border-indigo-200 hover:text-indigo-600 transition"
                        >
                          Messages
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
