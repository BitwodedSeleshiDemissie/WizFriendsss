"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/pics/1.jpg",
  "/pics/2.jpg",
  "/pics/3.jpg",
  "/pics/4.jpg",
  "/pics/5.jpg",
  "/pics/6.jpg",
  "/pics/7.jpg",
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden bg-black text-white">
      {/* Background image slideshow */}
      <div className="absolute inset-0">
        <AnimatePresence>
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[current]}
              alt={`Background ${current + 1}`}
              fill
              priority
              className="object-cover w-full h-full opacity-80"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      {/* Hero text */}
      <div className="relative z-10 px-6 max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight"
        >
          Find Your People, Wherever You Are
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-200 mb-10"
        >
          Discover new experiences, connect with like-minded people, and make
          every place feel like home.
        </motion.p>
        <motion.a
          href="#"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition"
        >
          Get Started
        </motion.a>
      </div>
    </section>
  );
}
