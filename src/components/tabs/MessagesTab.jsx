"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppData } from "../../context/AppDataContext";

const MAX_PREVIEW_LENGTH = 72;

function formatPreviewTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildPreview(thread) {
  if (!thread.lastMessage) return "No messages yet";
  const author = thread.lastMessage.system
    ? "System"
    : thread.lastMessage.senderName || "Member";
  const body = thread.lastMessage.system
    ? thread.lastMessage.content
    : `${author}: ${thread.lastMessage.content}`;
  return body.length > MAX_PREVIEW_LENGTH ? `${body.slice(0, MAX_PREVIEW_LENGTH)}...` : body;
}

export default function MessagesTab({ initialGroupId = null }) {
  const {
    groups,
    joinedGroups,
    groupMessages,
    subscribeToGroupMessages,
    sendGroupMessage,
    leaveGroup,
    currentUserId,
    userProfile,
    fetchGroupProfiles,
  } = useAppData();

  const router = useRouter();

  const joinedGroupItems = useMemo(
    () => groups.filter((group) => joinedGroups.includes(group.id)),
    [groups, joinedGroups]
  );

  const threads = useMemo(
    () =>
      joinedGroupItems.map((group) => {
        const messages = groupMessages[group.id] ?? [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        return {
          ...group,
          messages,
          lastMessage,
        };
      }),
    [joinedGroupItems, groupMessages]
  );

  const [activeGroupId, setActiveGroupId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const messageEndRef = useRef(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  useEffect(() => {
    if (typeof subscribeToGroupMessages !== "function") return undefined;
    const unsubs = joinedGroupItems.map((group) => subscribeToGroupMessages(group.id));
    return () => {
      unsubs.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          try {
            unsubscribe();
          } catch (_) {
            // Ignore subscription cleanup errors
          }
        }
      });
    };
  }, [joinedGroupItems, subscribeToGroupMessages]);

  useEffect(() => {
    if (threads.length === 0) {
      if (activeGroupId !== null) {
        setActiveGroupId(null);
      }
      return;
    }
    if (initialGroupId && threads.some((thread) => thread.id === initialGroupId)) {
      if (activeGroupId !== initialGroupId) {
        setActiveGroupId(initialGroupId);
      }
      return;
    }
    if (!activeGroupId || !threads.some((thread) => thread.id === activeGroupId)) {
      setActiveGroupId(threads[0].id);
    }
  }, [threads, activeGroupId, initialGroupId]);

  useEffect(() => {
    setError("");
  }, [activeGroupId]);

  useEffect(() => {
    setShowGroupInfo(false);
  }, [activeGroupId]);

  const activeThread = activeGroupId
    ? threads.find((thread) => thread.id === activeGroupId) ?? null
    : null;
  const messages = activeThread?.messages ?? [];
  const draftValue = activeGroupId ? drafts[activeGroupId] ?? "" : "";

  const activeThreadId = activeThread?.id ?? null;
  const memberIdsForActive = Array.isArray(activeThread?.memberIds)
    ? activeThread.memberIds.filter(Boolean)
    : [];
  const memberIdsKey = memberIdsForActive.join("|");

  useEffect(() => {
    setMembersError("");
    if (!activeThreadId) {
      setMembersLoading(false);
      setMemberProfiles({});
      setShowGroupInfo(false);
      return;
    }
    if (memberIdsForActive.length === 0) {
      setMembersLoading(false);
      setMemberProfiles({});
      return;
    }
    if (typeof fetchGroupProfiles !== "function") {
      setMembersLoading(false);
      setMembersError("Member directory is unavailable right now.");
      setMemberProfiles({});
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    fetchGroupProfiles(memberIdsForActive)
      .then((profiles) => {
        if (!cancelled) {
          setMemberProfiles(profiles);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMemberProfiles({});
          setMembersError(err?.message || "We couldn't load the member list. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMembersLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, fetchGroupProfiles, memberIdsKey]);
  useEffect(() => {
    if (!activeGroupId) return;
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, activeGroupId]);

  const handleViewProfile = (memberId) => {
    if (!memberId) return;
    setShowGroupInfo(false);
    if (memberId === currentUserId) {
      router.push("/app?tab=profile");
      return;
    }
    router.push(`/profile/${memberId}`);
  };
  const handleDraftChange = (event) => {
    if (!activeGroupId) return;
    const { value } = event.target;
    setDrafts((previous) => ({ ...previous, [activeGroupId]: value }));
  };

  const handleSend = async () => {
    if (!activeGroupId) return;
    const raw = drafts[activeGroupId] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) return;
    setSending(true);
    setError("");
    try {
      await sendGroupMessage(activeGroupId, trimmed);
      setDrafts((previous) => ({ ...previous, [activeGroupId]: "" }));
    } catch (err) {
      setError(err?.message || "We couldn't deliver your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await handleSend();
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const handleLeaveActiveGroup = async () => {
    if (!activeThread || leaving) return;
    if (activeThread.ownerId === currentUserId) {
      setError("Transfer ownership before leaving this community.");
      return;
    }
    setLeaving(true);
    setError("");
    try {
      await leaveGroup(activeThread.id);
      setDrafts((previous) => {
        if (!previous[activeThread.id]) return previous;
        const next = { ...previous };
        delete next[activeThread.id];
        return next;
      });
    } catch (err) {
      setError(err?.message || "We couldn't update your membership. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const canLeaveActive = Boolean(activeThread) && activeThread.ownerId !== currentUserId;
  const activeMemberCount = activeThread?.membersCount ?? memberIdsForActive.length;
  const layoutColumns = showGroupInfo && activeThread
    ? "xl:grid-cols-[300px_minmax(0,1fr)_320px]"
    : "xl:grid-cols-[300px_minmax(0,1fr)]";

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-6 shadow-xl">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Group inbox</h2>
          <p className="text-sm text-gray-600">
            Directly message your recurring communities. Threads update instantly during your session and new spaces appear as you join them.
          </p>
        </div>
      </div>
      <div className={`grid gap-6 lg:grid-cols-[300px,minmax(0,1fr)] ${layoutColumns}`}>
        <aside className="rounded-3xl border border-white/60 bg-white/80 shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Spaces</h3>
            <span className="text-xs font-semibold text-indigo-500">{threads.length}</span>
          </div>
          {threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-sm text-indigo-500 text-center">
              Join a community from the Groups tab to start chatting here.
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => {
                const active = thread.id === activeGroupId;
                const preview = buildPreview(thread);
                const previewTime = formatPreviewTime(thread.lastMessage?.createdAt);
                return (
                  <motion.button
                    key={thread.id}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveGroupId(thread.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition flex items-center gap-3 ${
                      active
                        ? "border-indigo-300 bg-indigo-50/80 shadow"
                        : "border-transparent bg-white/80 hover:border-indigo-200"
                    }`}
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl">
                      <Image
                        src={thread.image || "/pics/1.jpg"}
                        alt={thread.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{thread.name}</p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{previewTime}</span>
                      </div>
                      <p className="truncate text-xs text-gray-500">{preview}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </aside>
        <div className="rounded-3xl border border-white/70 bg-white/90 shadow-xl flex flex-col">
          {activeThread ? (
            <>
                                                        <header className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl">
                    <Image
                      src={activeThread.image || "/pics/1.jpg"}
                      alt={activeThread.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{activeThread.name}</h4>
                    <p className="text-xs text-gray-500">
                      {(activeThread.baseLocation || "Hybrid").trim()} - {activeMemberCount} members
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowGroupInfo((previous) => !previous)}
                      className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                        showGroupInfo
                          ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                          : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      }`}
                    >
                      {showGroupInfo ? "Hide members" : "View members"}
                    </motion.button>
                    {canLeaveActive ? (
                      <motion.button
                        type="button"
                        whileHover={{ scale: leaving ? 1 : 1.02 }}
                        whileTap={{ scale: leaving ? 1 : 0.97 }}
                        onClick={handleLeaveActiveGroup}
                        disabled={leaving}
                        className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          leaving
                            ? "cursor-not-allowed border-red-200 text-red-300"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        {leaving ? "Leaving..." : "Leave group"}
                      </motion.button>
                    ) : (
                      <span className="self-center text-xs text-gray-400">You manage this space</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Cadence</p>
                    <p className="text-sm font-semibold text-indigo-600">{activeThread.cadence || "Flexible"}</p>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col gap-3 overflow-y-auto px-6 py-6">
                  {messages.map((message) => {
                    const key = `${message.id}-${message.createdAt}`;
                    const isOwn = message.senderId && message.senderId === currentUserId;
                    const isSystem = message.system;
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          isSystem ? "justify-center" : isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        {isSystem ? (
                          <span className="rounded-full bg-gray-100 px-4 py-1 text-xs font-medium text-gray-500">
                            {message.content}
                          </span>
                        ) : (
                          <div
                            className={`max-w-[75%] rounded-3xl px-4 py-3 shadow ${
                              isOwn
                                ? "bg-gradient-to-r from-indigo-600 to-pink-500 text-white"
                                : "bg-white border border-gray-100 text-gray-800"
                            }`}
                          >
                            {!isOwn && (
                              <p className="mb-1 text-xs font-semibold text-indigo-500">
                                {message.senderName || "Member"}
                              </p>
                            )}
                            <p className={`text-sm whitespace-pre-wrap ${isOwn ? "text-white" : "text-gray-700"}`}>
                              {message.content}
                            </p>
                            <p
                              className={`mt-2 text-[10px] uppercase tracking-[0.3em] ${
                                isOwn ? "text-white/70" : "text-gray-400"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={messageEndRef} />
                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                      Start the conversation. Introduce yourself or share your next meetup idea.
                    </div>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="border-t border-gray-100 px-6 py-5 space-y-3">
                {error && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500">
                    {error}
                  </p>
                )}
                <textarea
                  value={draftValue}
                  onChange={handleDraftChange}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={`Message ${activeThread.name}`}
                  className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{userProfile?.name || "You"}</span>
                    <span>-</span>
                    <span>{formatPreviewTime(new Date().toISOString())}</span>
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: sending ? 1 : 0.97 }}
                    disabled={sending || !draftValue.trim()}
                    className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition ${
                      sending || !draftValue.trim() ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl"
                    }`}
                  >
                    {sending ? "Sending..." : "Send"}
                  </motion.button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-gray-500">
              <p className="text-base font-semibold text-gray-600">No conversations yet</p>
              <p>Join a group to unlock shared threads and real-time updates.</p>
            </div>
          )}
        </div>
        {showGroupInfo && activeThread && (
          <aside className="rounded-3xl border border-white/70 bg-white/90 shadow-xl space-y-6 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Group info</h3>
                <p className="text-xs text-gray-400">{activeMemberCount} member{activeMemberCount === 1 ? "" : "s"}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupInfo(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-base font-semibold text-gray-900">{activeThread.name}</p>
              {activeThread.description ? (
                <p className="text-sm leading-relaxed text-gray-600">{activeThread.description}</p>
              ) : null}
              <div className="space-y-1 text-xs text-gray-500">
                {activeThread.baseLocation ? (
                  <p>{(activeThread.baseLocation || "Hybrid").trim()}</p>
                ) : null}
                {activeThread.cadence ? <p>Cadence: {activeThread.cadence}</p> : null}
              </div>
              {Array.isArray(activeThread.tags) && activeThread.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-indigo-500">
                  {activeThread.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Members</h4>
              {membersLoading ? (
                <p className="text-sm text-gray-500">Loading members...</p>
              ) : membersError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-500">{membersError}</p>
              ) : memberIdsForActive.length === 0 ? (
                <p className="text-sm text-gray-500">No members listed yet.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {memberIdsForActive.map((memberId) => {
                    const profile = memberProfiles[memberId];
                    const displayName =
                      profile?.name || (memberId === currentUserId ? "You" : "Community member");
                    const subtitle =
                      profile?.tagline ||
                      profile?.currentCity ||
                      profile?.email ||
                      (memberId === currentUserId ? "Tap to view your profile" : "Tap to view profile");
                    const roleLabel =
                      memberId === activeThread.ownerId
                        ? "Owner"
                        : activeThread.adminIds?.includes(memberId)
                        ? "Admin"
                        : null;
                    const avatar = profile?.photoURL || "/pics/1.jpg";
                    return (
                      <button
                        key={memberId}
                        type="button"
                        onClick={() => handleViewProfile(memberId)}
                        className="group w-full text-left"
                      >
                        <div className="flex items-center gap-3 rounded-2xl border border-transparent bg-white/80 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-indigo-100">
                            <Image src={avatar} alt={displayName} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800">{displayName}</p>
                            <p className="truncate text-xs text-gray-500">{subtitle}</p>
                          </div>
                          {roleLabel && (
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
                              {roleLabel}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

