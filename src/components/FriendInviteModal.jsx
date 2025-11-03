"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function buildFriendLabel(friend) {
  if (!friend) return "";
  if (typeof friend.name === "string" && friend.name.trim().length > 0) {
    return friend.name.trim();
  }
  if (typeof friend.id === "string" && friend.id.trim().length > 0) {
    return friend.id.trim();
  }
  return "Community member";
}

export default function FriendInviteModal({ open, onClose, onSubmit, friends = [], activity = null }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      const defaultSelection = friends.map((friend) => friend.id).filter(Boolean);
      setSelectedIds(defaultSelection);
      setNote("");
    }
  }, [friends, open]);

  const toggleFriend = (friendId) => {
    if (!friendId) return;
    setSelectedIds((previous) => {
      if (previous.includes(friendId)) {
        return previous.filter((id) => id !== friendId);
      }
      return [...previous, friendId];
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onSubmit === "function") {
      onSubmit(selectedIds, note);
    }
  };

  const selectedCount = selectedIds.length;
  const friendOptions = friends.map((friend) => ({
    id: friend.id,
    name: buildFriendLabel(friend),
  }));
  const activityTitle = activity?.title ?? "this activity";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-indigo-100/70"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">Communicate with friends</h3>
                <p className="text-sm text-gray-500">
                  Choose who you want to loop in about <span className="font-medium text-gray-700">{activityTitle}</span>.
                  We will store it so notifications can roll out the moment they are available.
                </p>
              </div>

              {friendOptions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-6 text-center text-sm text-indigo-600">
                  Add a few friends to your circle first. Once you follow each other, they will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Friend circle</p>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {friendOptions.map((friend) => {
                      const checked = selectedIds.includes(friend.id);
                      return (
                        <label
                          key={friend.id}
                          className={lex items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-sm transition }
                        >
                          <span className="font-medium">{friend.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFriend(friend.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="friend-note"
                  className="text-xs font-semibold uppercase tracking-wide text-indigo-500"
                >
                  Add a note
                </label>
                <textarea
                  id="friend-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="Leave a short context or question for your friends"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  {selectedCount} friend{selectedCount === 1 ? "" : "s"} selected
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: friendOptions.length === 0 ? 1 : 1.03 }}
                    whileTap={{ scale: friendOptions.length === 0 ? 1 : 0.97 }}
                    disabled={friendOptions.length === 0 || selectedCount === 0}
                    className={ounded-full px-4 py-2 text-sm font-semibold transition }
                  >
                    Save for later
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
