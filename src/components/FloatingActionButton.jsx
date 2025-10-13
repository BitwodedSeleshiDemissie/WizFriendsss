"use client";

import { motion } from "framer-motion";

export default function FloatingActionButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-6 md:right-10 bg-gradient-to-r from-indigo-600 to-pink-500 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-bold z-40"
      aria-label="Create a new activity"
    >
      +
    </motion.button>
  );
}

