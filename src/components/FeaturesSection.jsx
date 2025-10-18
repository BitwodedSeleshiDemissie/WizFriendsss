"use client";

import { motion } from "framer-motion";

const features = [
  { icon: "🗺️", title: "Discover Local Events", desc: "Find activities happening near you — from hikes to coffee meetups." },
  { icon: "🤝", title: "Meet New People", desc: "Join communities built around your interests and hobbies." },
  { icon: "💡", title: "Brainstorm Together", desc: "Suggest and vote on new ideas to bring your city to life." },
];

export default function FeaturesSection() {
  return (
    <section className="py-28 bg-gradient-to-b from-white to-indigo-50 text-gray-800">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          className="text-4xl font-extrabold mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          What Makes WizFriends Special
        </motion.h2>
        <div className="grid sm:grid-cols-3 gap-10">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="p-8 rounded-2xl bg-white shadow-sm hover:shadow-xl transition transform hover:-translate-y-2 border border-gray-100"
              whileHover={{ scale: 1.03 }}
            >
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="text-2xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
