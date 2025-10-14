"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

const STORAGE_KEY_POTENTIAL = "wizfriends_potential_events";

export default function NewActivityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    image: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedForm = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
    };

    if (!trimmedForm.title || !trimmedForm.category || !trimmedForm.description) {
      return;
    }

    const newProposal = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      ...trimmedForm,
      endorsements: [],
      createdAt: new Date().toISOString(),
      createdBy: user ? user.uid : "anonymous",
      status: "potential",
    };

    try {
      const existing = (() => {
        if (typeof window === "undefined") return [];
        const raw = window.localStorage.getItem(STORAGE_KEY_POTENTIAL);
        return raw ? JSON.parse(raw) : [];
      })();

      const updated = [...existing, newProposal];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY_POTENTIAL, JSON.stringify(updated));
      }

      router.push("/discover?tab=potential");
    } catch (error) {
      console.error("Failed to save activity proposal", error);
      router.push("/discover?tab=potential");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-50 flex items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-2xl max-w-lg w-full"
      >
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-8">
          Propose a New Activity
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Got an idea for an event? Submit it below and get 3 people to vouch for it to make it live.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="title"
            placeholder="Activity Title"
            value={form.title}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            required
          />

          <input
            type="text"
            name="category"
            placeholder="Category (e.g. Outdoors, Social, Fitness)"
            value={form.category}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
            required
          />

          <textarea
            name="description"
            placeholder="Describe the activity..."
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
            required
          />

          <input
            type="text"
            name="image"
            placeholder="Image URL (optional)"
            value={form.image}
            onChange={handleChange}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Submit for Review
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
