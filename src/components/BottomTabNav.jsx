"use client";

import { motion } from "framer-motion";

export default function BottomTabNav({ tabs, activeTab, onChange }) {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-full px-4 py-3 z-30">
      <div className="flex items-center justify-between gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-lg"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              <span aria-hidden="true" className="text-lg">
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

