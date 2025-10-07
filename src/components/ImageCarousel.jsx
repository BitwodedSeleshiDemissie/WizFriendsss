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

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full overflow-hidden py-20 bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h2 className="text-4xl font-bold text-gray-800 mb-3">
          Explore Our Activities
        </h2>
        <p className="text-gray-500 text-lg">
          A glimpse into what makes our community special.
        </p>
      </div>

      <div className="relative w-full h-[500px] flex justify-center items-center">
        <AnimatePresence>
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute w-full flex justify-center"
          >
            <Image
              src={images[current]}
              alt={`Activity ${current + 1}`}
              width={1000}
              height={600}
              className="rounded-3xl shadow-2xl object-cover w-[90%] h-[500px]"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center mt-6 gap-3">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === current ? "bg-indigo-600 w-6" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
