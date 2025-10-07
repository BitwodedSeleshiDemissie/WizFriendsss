"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";


export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Discover", href: "/discover" },
    { label: "Communities", href: "/auth/login" },
    { label: "Events", href: "/auth/login" },
    { label: "About", href: "/about" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-lg bg-white/80 border-b border-white/20 shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="select-none">
          <motion.h1
            whileHover={{ scale: 1.05 }}
            className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent cursor-pointer"
          >
            HomeConnect
          </motion.h1>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-10 text-gray-800">
          {navLinks.map(({ label, href }, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05 }}>
              <Link
                href={href}
                className="font-medium hover:text-indigo-600 transition-all text-lg tracking-wide"
              >
                {label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Right Side: User or Join Button */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              {user.photoURL && (
                <Image
                  src={user.photoURL}
                  alt="User avatar"
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-indigo-500 shadow-sm"
                />
              )}
              <span className="font-medium text-gray-700">
                {user.displayName?.split(" ")[0]}
              </span>
              <button
                onClick={logout}
                className="text-sm font-semibold text-indigo-600 hover:text-pink-500 transition"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg hover:shadow-xl transition-all text-sm uppercase tracking-wide"
              >
                Join Now
              </motion.button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-xl py-4 space-y-3 text-center"
        >
          {navLinks.map(({ label, href }, i) => (
            <Link
              key={i}
              href={href}
              className="block text-lg font-medium text-gray-700 hover:text-indigo-600 transition"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}

          {user ? (
            <div className="flex flex-col items-center mt-4 space-y-2">
              {user.photoURL && (
                <Image
                  src={user.photoURL}
                  alt="User"
                  width={50}
                  height={50}
                  className="rounded-full border-2 border-indigo-500"
                />
              )}
              <span className="text-gray-800 font-medium">
                {user.displayName}
              </span>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="text-sm text-indigo-600 font-semibold hover:text-pink-500 transition"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signup"
              className="inline-block mt-2 bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg transition"
              onClick={() => setMenuOpen(false)}
            >
              Join Now
            </Link>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
}
