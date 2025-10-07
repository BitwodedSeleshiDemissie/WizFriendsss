"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LuxuryShowcase() {
  return (
    <section className="relative py-40 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-pink-100 opacity-70 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-20">
        {/* Left text content */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex-1"
        >
          <h2 className="text-5xl md:text-6xl font-extrabold leading-tight mb-8">
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Connection Redefined
            </span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-10">
            Every feature is crafted with intention — effortless, elegant, and
            deeply human. From how you discover communities to the way you
            connect, this platform feels personal and inspiring.
          </p>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            href="#"
            className="inline-block bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition"
          >
            Explore the Experience
          </motion.a>
        </motion.div>

        {/* Right visual showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          className="flex-1 relative"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <Image
              src="/pics/5.jpg"
              alt="Luxury Experience"
              width={800}
              height={500}
              className="object-cover w-full h-full transform hover:scale-105 transition duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Floating blur orb */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-400/40 rounded-full blur-3xl animate-pulse" />
        </motion.div>
      </div>
    </section>
  );
}
