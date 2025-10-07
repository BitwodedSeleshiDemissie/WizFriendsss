"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const cards = [
  {
    title: "Connect Through Experiences",
    text: "Join real-world activities and meet people who share your passions — from hiking adventures to creative meetups.",
    image: "/pics/3.jpg",
  },
  {
    title: "Discover Hidden Communities",
    text: "Explore curated groups near you or across the world. It’s about people, not just profiles.",
    image: "/pics/6.jpg",
  },
  {
    title: "Build Lifelong Memories",
    text: "Host or join events that bring people together — create stories worth sharing.",
    image: "/pics/2.jpg",
  },
];

export default function ExperienceSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-gray-50 to-white text-gray-900 overflow-hidden">
      {/* Gradient blobs for luxury background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-pink-200/20 rounded-full blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold mb-12"
        >
          Experiences That Bring People Closer
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          viewport={{ once: true }}
          className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-20"
        >
          Whether you’re traveling or exploring your city, we help you connect
          with people who make every moment unforgettable.
        </motion.p>

        {/* Floating cards */}
        <div className="grid md:grid-cols-3 gap-10">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="rounded-2xl overflow-hidden shadow-xl backdrop-blur-lg bg-white/70 border border-white/30"
            >
              <div className="relative h-60 w-full">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-8 text-left">
                <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                  {card.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{card.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
