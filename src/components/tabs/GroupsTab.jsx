"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

const DEFAULT_POLL_OPTIONS = ["Option 1", "Option 2", ""];

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
    promoteGroupMember,
    createGroupNotice,
    createGroupPoll,
    voteGroupPoll,
    subscribeToGroupBulletins,
    fetchGroupProfiles,
    currentUserId,
    userProfile,
    loadingGroups,
    isMutating,
  } = useAppData();

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

  const [noticeForm, setNoticeForm] = useState({ title: "", message: "" });
  const [pollForm, setPollForm] = useState({
    question: "",
    options: DEFAULT_POLL_OPTIONS,
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const isMember = selectedGroup ? joinedGroups.includes(selectedGroup.id) : false;
  const isOwner = selectedGroup?.ownerId === currentUserId;
  const isAdmin =
    isOwner || (selectedGroup?.adminIds || []).includes(currentUserId ?? "__");

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

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
    const group = groups.find((item) => item.id === selectedGroupId);
    if (!group) return;

    fetchGroupProfiles(group.memberIds || [])
      .then((profiles) => setMemberProfiles(profiles))
      .catch(() => setMemberProfiles({}));
  }, [selectedGroupId, groups, fetchGroupProfiles]);

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
      await joinGroup(group.id);
      setManageFeedback(`You're now part of ${group.name}.`);
    } catch (error) {
      setManageError(error.message || "Unable to join this group right now.");
    } finally {
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
      await leaveGroup(group.id);
      setManageFeedback(`You left ${group.name}.`);
    } catch (error) {
      setManageError(error.message || "Unable to leave this group right now.");
    } finally {
      setIsManaging(false);
    }
  };

  const runAdminAction = async (action, successMessage) => {
    try {
      setManageError("");
      setManageFeedback("");
      setIsManaging(true);
      await action();
      if (successMessage) {
        setManageFeedback(successMessage);
      }
    } catch (error) {
      setManageError(error.message || "Unable to complete that action.");
    } finally {
      setIsManaging(false);
    }
  };

  const handleNoticeSubmit = async (event) => {
    event.preventDefault();
    if (!selectedGroupId) return;
    await runAdminAction(
      () =>
        createGroupNotice(selectedGroupId, {
          title: noticeForm.title,
          message: noticeForm.message,
        }),
      "Notice posted."
    );
    setNoticeForm({ title: "", message: "" });
  };

  const handlePollSubmit = async (event) => {
    event.preventDefault();
    if (!selectedGroupId) return;
    await runAdminAction(
      () =>
        createGroupPoll(selectedGroupId, {
          question: pollForm.question,
          options: pollForm.options,
        }),
      "Poll created."
    );
    setPollForm({ question: "", options: DEFAULT_POLL_OPTIONS });
  };

  const handlePromoteMember = async (memberId) => {
    if (!selectedGroupId) return;
    await runAdminAction(
      () => promoteGroupMember(selectedGroupId, memberId),
      "Member promoted to admin."
    );
  };

  const handleVote = async (pollId, optionId) => {
    if (!selectedGroupId) return;
    await runAdminAction(() => voteGroupPoll(selectedGroupId, pollId, optionId));
  };

  const updatePollOption = (index, value) => {
    setPollForm((prev) => {
      const next = [...prev.options];
      next[index] = value;
      return { ...prev, options: next };
    });
  };

  const addPollOption = () => {
    setPollForm((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const removePollOption = (index) => {
    setPollForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Groups & recurring communities</h2>
            <p className="text-gray-600 mt-2 max-w-3xl">
              Spin up spaces that meet regularly, post updates, collect votes, and keep a pulse on what
              members need.
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

      {loadingGroups ? (
        <div className="rounded-3xl border border-white/60 bg-white/70 shadow-inner px-6 py-16 text-center text-sm font-semibold text-indigo-500">
          Loading community spaces…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)]">
          <div className="space-y-4">
            {groups.length === 0 && (
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 p-10 text-center text-gray-500">
                No groups yet. Create one to kickstart recurring experiences.
              </div>
            )}
            {groups.map((group) => {
              const member = joinedGroups.includes(group.id);
              const owner = group.ownerId === currentUserId;
              const admin =
                owner || (group.adminIds || []).includes(currentUserId ?? "__");
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
                      ? "border-indigo-300 bg-white"
                      : "border-gray-100 bg-white/80 hover:border-indigo-200"
                  }`}
                >
                  <div className="relative h-40 w-full overflow-hidden rounded-t-3xl">
                    <Image
                      src={group.image || "/pics/1.jpg"}
                      alt={group.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                      <div>
                        <h3 className="text-lg font-semibold drop-shadow">{group.name}</h3>
                        <p className="text-xs text-white/80">{group.baseLocation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {admin && (
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-600">
                            Admin
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            group.isPrivate ? "bg-white/80 text-gray-700" : "bg-emerald-400 text-white"
                          }`}
                        >
                          {group.isPrivate ? "Private" : "Open"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>👥 {group.membersCount ?? group.memberIds?.length ?? 0} members</span>
                      <span>📅 {group.nextActivity}</span>
                      <span>🗓️ {group.cadence}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(group.tags || []).map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      {member ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canLeave) {
                              handleLeaveGroup(group);
                            }
                          }}
                          disabled={!canLeave || isManaging || isMutating}
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                            canLeave
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {canLeave ? "Leave group" : "Owner"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleJoinGroup(group);
                          }}
                          disabled={isManaging || isMutating}
                          className="flex-1 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition"
                        >
                          Join group
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
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-6">
            {selectedGroup ? (
              <div className="rounded-3xl border border-white/70 bg-white shadow-xl p-6 space-y-8">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h3>
                    <span className="text-xs font-semibold text-gray-500">
                      {selectedGroup.membersCount ?? selectedGroup.memberIds?.length ?? 0} members
                    </span>
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
                      const isMemberAdmin = selectedGroup.adminIds?.includes(memberId);
                      const isSelectedOwner = selectedGroup.ownerId === memberId;

                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{name}</p>
                            <p className="text-xs text-gray-500">{profile?.email || memberId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelectedOwner ? (
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                                Owner
                              </span>
                            ) : isMemberAdmin ? (
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                                Admin
                              </span>
                            ) : null}
                            {isAdmin && !isSelectedOwner && !isMemberAdmin && (
                              <button
                                type="button"
                                onClick={() => handlePromoteMember(memberId)}
                                disabled={isManaging || isMutating}
                                className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 hover:border-indigo-400 hover:text-indigo-700 transition"
                              >
                                Promote
                              </button>
                            )}
                          </div>
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

                {isAdmin && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-indigo-700 uppercase tracking-[0.3em]">
                        Post a notice
                      </h4>
                      <form onSubmit={handleNoticeSubmit} className="space-y-3">
                        <input
                          type="text"
                          value={noticeForm.title}
                          onChange={(event) =>
                            setNoticeForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Title"
                          className="w-full rounded-2xl border border-indigo-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                        <textarea
                          value={noticeForm.message}
                          onChange={(event) =>
                            setNoticeForm((prev) => ({ ...prev, message: event.target.value }))
                          }
                          placeholder="Share an update with members..."
                          rows={3}
                          className="w-full rounded-2xl border border-indigo-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isManaging || isMutating}
                          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition disabled:opacity-60"
                        >
                          Post notice
                        </button>
                      </form>
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-5 space-y-4">
                      <h4 className="text-sm font-semibold text-pink-600 uppercase tracking-[0.3em]">
                        Run a poll
                      </h4>
                      <form onSubmit={handlePollSubmit} className="space-y-3">
                        <input
                          type="text"
                          value={pollForm.question}
                          onChange={(event) =>
                            setPollForm((prev) => ({ ...prev, question: event.target.value }))
                          }
                          placeholder="What should we focus on next?"
                          className="w-full rounded-2xl border border-pink-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                          required
                        />
                        <div className="space-y-2">
                          {pollForm.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(event) => updatePollOption(index, event.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 rounded-2xl border border-pink-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                required={index < 2}
                              />
                              {pollForm.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removePollOption(index)}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pink-500 hover:bg-pink-100"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={addPollOption}
                            className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-500 hover:border-pink-300 hover:text-pink-600 transition"
                          >
                            + Add option
                          </button>
                          <button
                            type="submit"
                            disabled={isManaging || isMutating}
                            className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition disabled:opacity-60"
                          >
                            Publish poll
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-[0.3em]">
                    Notices & Polls
                  </h4>
                  {bulletins.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      Nothing posted yet. Admins can share notices or run polls from the controls above.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {bulletins.map((bulletin) => {
                        if (bulletin.type === "notice") {
                          return (
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
                                {bulletin.createdByName || "Admin"}
                              </p>
                            </div>
                          );
                        }

                        const totalVotes = (bulletin.options || []).reduce(
                          (sum, option) => sum + (option.votes || 0),
                          0
                        );
                        const userVote = bulletin.voters?.[currentUserId ?? "__"] || null;

                        return (
                          <div
                            key={bulletin.id}
                            className="rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold text-pink-600">
                                {bulletin.question}
                              </h5>
                              <span className="text-xs text-pink-400">
                                {formatDate(bulletin.createdAt)}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {(bulletin.options || []).map((option) => {
                                const percentage =
                                  totalVotes > 0
                                    ? Math.round(((option.votes || 0) / totalVotes) * 100)
                                    : 0;
                                const selected = userVote === option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleVote(bulletin.id, option.id)}
                                    disabled={selected || isManaging || isMutating}
                                    className={`w-full rounded-2xl border px-4 py-2 text-left text-sm transition ${
                                      selected
                                        ? "border-pink-400 bg-white shadow"
                                        : "border-pink-200 bg-white/80 hover:border-pink-400"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-pink-700">{option.label}</span>
                                      <span className="text-xs text-pink-500">
                                        {option.votes || 0} votes
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-pink-100">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-pink-400 to-indigo-400 transition-all"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-pink-500">
                              Cast by {totalVotes} member{totalVotes === 1 ? "" : "s"}. Posted by{" "}
                              {bulletin.createdByName || "Admin"}.
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 px-6 py-16 text-center text-sm text-gray-500">
                Select a group to view details and manage the conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
