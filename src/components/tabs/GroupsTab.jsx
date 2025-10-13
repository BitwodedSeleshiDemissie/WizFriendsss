"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";

export default function GroupsTab({ groups, joinedGroups, onJoinGroup, onCreateGroup }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    tags: "",
    image: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();
    if (!trimmedName || !trimmedDescription) return;

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
      setIsSubmitting(true);
      setFormError("");
      await onCreateGroup(payload);
      setShowCreateForm(false);
      setForm({ name: "", description: "", isPrivate: false, tags: "", image: "" });
    } catch (error) {
      console.error("Failed to create group", error);
      setFormError("We couldn't create the group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-10">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Groups & recurring communities</h2>
            <p className="text-gray-600 mt-2 max-w-3xl">
              Join ongoing circles that meet regularly. Groups are a place to stay connected, chat, and plan fresh activities with people who share your passions.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setFormError("");
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
            {formError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-2">
                {formError}
              </p>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className={`rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-3 shadow-md hover:shadow-xl transition-all ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Publishing..." : "Publish group"}
            </motion.button>
          </form>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {groups.map((group) => {
          const joined = joinedGroups.includes(group.id);
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-100 bg-white shadow-lg overflow-hidden"
            >
              <div className="relative h-48 w-full">
                <Image
                  src={group.image || "/pics/1.jpg"}
                  alt={group.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <h3 className="text-xl font-bold drop-shadow">{group.name}</h3>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      group.isPrivate ? "bg-white/80 text-gray-700" : "bg-emerald-400 text-white"
                    }`}
                  >
                    {group.isPrivate ? "Private" : "Open"}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">{group.description}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-500">
                  <p>👥 {group.members} members</p>
                  <p>📅 Next: {group.nextActivity}</p>
                  <p>📍 Base: {group.baseLocation}</p>
                  <p>🗓️ Cadence: {group.cadence}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                {group.photographer && (
                  <p className="text-xs text-gray-400">
                    Photo by{" "}
                    <a
                      href={group.photographerUrl ?? "#"}
                      target={group.photographerUrl ? "_blank" : undefined}
                      rel={group.photographerUrl ? "noreferrer" : undefined}
                      className="hover:text-indigo-500 underline underline-offset-2"
                    >
                      {group.photographer}
                    </a>{" "}
                    via Unsplash
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: joined ? 1 : 1.03 }}
                  whileTap={{ scale: joined ? 1 : 0.97 }}
                  disabled={joined}
                  onClick={() => onJoinGroup(group.id)}
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all ${
                    joined
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md hover:shadow-xl"
                  }`}
                >
                  {joined ? "Member" : "Join group"}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
