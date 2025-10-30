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

export default function MessagesTab({ initialGroupId = null, viewportOffset = "18.5rem" }) {
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
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

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
    setShowGroupDetails(false);
    setShowMembersList(false);
  }, [activeGroupId]);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileChat(false);
      return;
    }
    if (!activeGroupId) {
      setShowMobileChat(false);
    }
  }, [isMobile, activeGroupId]);

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

  const visibleThreads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return threads;
    }
    return threads.filter((thread) => {
      const nameMatch = thread.name?.toLowerCase().includes(query);
      const previewText = buildPreview(thread).toLowerCase();
      return nameMatch || previewText.includes(query);
    });
  }, [threads, searchTerm]);

  useEffect(() => {
    setMembersError("");
    if (!activeThreadId) {
      setMembersLoading(false);
      setMemberProfiles({});
      setShowGroupDetails(false);
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

  const handleOpenGroupDetails = () => {
    setShowMembersList(false);
    setShowGroupDetails(true);
  };

  const handleCloseGroupDetails = () => {
    setShowGroupDetails(false);
    setShowMembersList(false);
  };

  const handleToggleMembersList = () => {
    setShowMembersList((previous) => !previous);
  };

  const handleViewProfile = (memberId) => {
    if (!memberId) return;
    handleCloseGroupDetails();
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

  const handleSelectThread = (groupId) => {
    setActiveGroupId(groupId);
    if (isMobile) {
      setShowMobileChat(true);
    }
  };

  const handleBackToThreads = () => {
    if (!isMobile) return;
    setShowMobileChat(false);
    setShowGroupDetails(false);
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
    if (!activeThread) return;
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
      handleCloseGroupDetails();
    } catch (err) {
      setError(err?.message || "We couldn't update your membership. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const canLeaveActive = Boolean(activeThread) && activeThread.ownerId !== currentUserId;
  const activeMemberCount = activeThread?.membersCount ?? memberIdsForActive.length;
  const layoutColumns = "lg:grid-cols-[360px_minmax(0,1fr)]";
  const asideVisibility = isMobile && showMobileChat ? "hidden" : "flex";
  const chatVisibility = isMobile && !showMobileChat ? "hidden" : "flex";
  // Keep the inbox anchored inside the viewport so only the inner panels scroll.
  // The parent passes the viewport offset (top padding + bottom nav clearance).
  const constrainedHeight = `calc(min(100vh, 100dvh) - ${viewportOffset})`;

  return (
    <section
      className="flex flex-1 flex-col gap-4 overflow-hidden"
      style={{ height: constrainedHeight, maxHeight: constrainedHeight }}
    >
      <div
        className={`grid h-full flex-1 min-h-0 grid-cols-1 ${layoutColumns} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm`}
        style={{ height: "100%" }}
      >
        <aside className={`${asideVisibility} min-h-0 flex-col border-b border-gray-200 bg-gray-50 lg:border-b-0 lg:border-r`}>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
              <p className="text-xs text-gray-500">Stay in touch with your groups.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/app?tab=groups")}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
            >
              Find groups
            </button>
          </div>
          <div className="px-4 pb-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-500">
            <span>
              {threads.length} {threads.length === 1 ? "chat" : "chats"}
            </span>
            {searchTerm.trim() && (
              <span>Showing {visibleThreads.length}</span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2">
            {threads.length === 0 ? (
              <div className="mx-3 mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                Join a group to start messaging together.
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="mx-3 mt-6 rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                No chats match your search.
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {visibleThreads.map((thread) => {
                  const active = thread.id === activeGroupId;
                  const preview = buildPreview(thread);
                  const previewTime = formatPreviewTime(thread.lastMessage?.createdAt);
                  return (
                    <motion.button
                      key={thread.id}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectThread(thread.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active ? "bg-blue-50" : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
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
                          <p className={`truncate text-sm font-semibold ${active ? "text-blue-600" : "text-gray-900"}`}>
                            {thread.name}
                          </p>
                          <span className="whitespace-nowrap text-xs text-gray-400">{previewTime}</span>
                        </div>
                        <p className="truncate text-xs text-gray-500">{preview}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
        <div className={`${chatVisibility} min-h-0 flex-col bg-white`}>
          {activeThread ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  {isMobile && showMobileChat && (
                    <button
                      type="button"
                      onClick={handleBackToThreads}
                      className="mr-1 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                      aria-label="Back to chats"
                    >
                      &larr;
                    </button>
                  )}
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-200 sm:h-12 sm:w-12">
                    <Image
                      src={activeThread.image || "/pics/1.jpg"}
                      alt={activeThread.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-gray-900 sm:text-base">{activeThread.name}</h4>
                    <p className="text-xs text-gray-400">
                      {(activeThread.baseLocation || "Hybrid").trim()} {activeThread.cadence ? ` - ${activeThread.cadence}` : ""}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleOpenGroupDetails}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Group info
                </motion.button>
              </header>
              <button
                type="button"
                onClick={handleOpenGroupDetails}
                className="flex w-full items-center justify-between border-b border-gray-200 bg-white px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                <span>Members</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-blue-600 normal-case">
                  {activeMemberCount} {activeMemberCount === 1 ? "member" : "members"}
                  <span aria-hidden="true">&gt;</span>
                </span>
              </button>
              <div className="flex-1 min-h-0 overflow-hidden bg-gray-50">
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-6 py-6">
                  {messages.map((message) => {
                    const key = `${message.id}-${message.createdAt}`;
                    const isOwn = message.senderId && message.senderId === currentUserId;
                    const isSystem = message.system;
                    const senderDisplayName = message.senderId === currentUserId
                      ? "You"
                      : message.senderName || memberProfiles[message.senderId]?.name || "Member";
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
                          <span className="rounded-full bg-gray-200 px-4 py-1 text-xs font-medium text-gray-600">
                            {message.content}
                          </span>
                        ) : (
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow ${
                              isOwn ? "bg-blue-500 text-white" : "bg-white text-gray-800"
                            }`}
                          >
                            <p
                              className={`mb-1 text-xs font-semibold ${
                                isOwn ? "text-blue-100" : "text-gray-600"
                              }`}
                            >
                              {senderDisplayName}
                            </p>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`mt-2 text-[11px] ${
                                isOwn ? "text-blue-100" : "text-gray-400"
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
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                      Start the conversation and welcome everyone in.
                    </div>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="border-t border-gray-200 px-6 py-4">
                {error && (
                  <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500">
                    {error}
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <textarea
                    value={draftValue}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder={`Message ${activeThread.name}`}
                    className="w-full flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: sending ? 1 : 0.97 }}
                    disabled={sending || !draftValue.trim()}
                    className={`inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow transition ${
                      sending || !draftValue.trim() ? "opacity-70" : "hover:bg-blue-600"
                    }`}
                  >
                    {sending ? "Sending..." : "Send"}
                  </motion.button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-gray-500">
              <p className="text-base font-semibold text-gray-600">Select a chat to begin</p>
              <p>Choose a conversation from the list or join a group to start messaging.</p>
            </div>
          )}
        </div>
        {showGroupDetails && activeThread ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
            <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <button
                type="button"
                onClick={handleCloseGroupDetails}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                aria-label="Close group details"
              >
                <span aria-hidden="true">&times;</span>
              </button>
              <div className="space-y-6 px-6 py-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{activeThread.name}</h3>
                  {activeThread.description ? (
                    <p className="text-sm text-gray-600">{activeThread.description}</p>
                  ) : null}
                  {(activeThread.baseLocation || activeThread.cadence) ? (
                    <div className="space-y-1 text-xs text-gray-400">
                      {activeThread.baseLocation ? <p>{(activeThread.baseLocation || "Hybrid").trim()}</p> : null}
                      {activeThread.cadence ? <p>Cadence: {activeThread.cadence}</p> : null}
                    </div>
                  ) : null}
                  {Array.isArray(activeThread.tags) && activeThread.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1 text-xs text-blue-600">
                      {activeThread.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-blue-50 px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: showMembersList ? 1 : 1.02 }}
                    whileTap={{ scale: showMembersList ? 1 : 0.97 }}
                    onClick={handleToggleMembersList}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <span>{showMembersList ? "Hide members" : "See members"}</span>
                    <span className="text-xs text-gray-400">
                      {activeMemberCount} {activeMemberCount === 1 ? "member" : "members"}
                    </span>
                  </motion.button>
                  {showMembersList ? (
                    membersLoading ? (
                      <p className="text-sm text-gray-500">Loading members...</p>
                    ) : membersError ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-500">{membersError}</p>
                    ) : memberIdsForActive.length === 0 ? (
                      <p className="text-sm text-gray-500">No members listed yet.</p>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {memberIdsForActive.map((memberId) => {
                          const profile = memberProfiles[memberId];
                          const displayName =
                            profile?.name || (memberId === currentUserId ? "You" : "Community member");
                          const subtitle =
                            profile?.tagline ||
                            profile?.currentCity ||
                            profile?.email ||
                            (memberId === currentUserId ? "View your profile" : "View profile");
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
                              <div className="flex items-center gap-3 rounded-xl border border-transparent bg-gray-50 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50">
                                <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                                  <Image src={avatar} alt={displayName} fill sizes="36px" className="object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-gray-800">{displayName}</p>
                                  <p className="truncate text-xs text-gray-500">{subtitle}</p>
                                </div>
                                {roleLabel && (
                                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase text-blue-600">
                                    {roleLabel}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : null}
                </div>
                {canLeaveActive ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: leaving ? 1 : 1.02 }}
                    whileTap={{ scale: leaving ? 1 : 0.97 }}
                    onClick={handleLeaveActiveGroup}
                    disabled={leaving}
                    className={`w-full rounded-full border px-4 py-3 text-sm font-semibold transition ${
                      leaving
                        ? "cursor-not-allowed border-red-200 text-red-300"
                        : "border-red-200 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {leaving ? "Leaving..." : "Leave group"}
                  </motion.button>
                ) : (
                  <p className="text-center text-xs text-gray-400">You manage this group</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}


