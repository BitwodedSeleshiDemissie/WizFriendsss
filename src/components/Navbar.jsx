"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const logoFont = Playfair_Display({ subsets: ["latin"], weight: ["700"] });


export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const { avatarUrl, firstName, fullNameInitials } = useMemo(() => {
    if (!user) {
      return { avatarUrl: null, firstName: null, fullNameInitials: null };
    }
    const metadata = user.user_metadata ?? {};
    const derivedAvatar =
      user.photoURL ??
      metadata.avatar_url ??
      metadata.avatarUrl ??
      null;

    const rawName =
      user.displayName ??
      metadata.full_name ??
      metadata.name ??
      metadata.preferred_name ??
      metadata.user_name ??
      metadata.username ??
      null;

    const fallbackFromEmail = user.email ? user.email.split("@")[0] : null;
    const safeName = rawName?.trim() || fallbackFromEmail || null;
    const safeFirstName = safeName ? safeName.split(" ")[0] : null;

    const initialsSource = rawName?.trim() || fallbackFromEmail || "WF";
    const initials = initialsSource
      .split(" ")
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);

    return {
      avatarUrl: derivedAvatar,
      firstName: safeFirstName,
      fullNameInitials: initials,
    };
  }, [user]);

  const openMessages = () => {
    router.push("/app?tab=messages");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Experience", href: "/app" },
    { label: "Brainstorm", href: "/app?tab=brainstorm" },
    { label: "Groups", href: "/app?tab=groups" },
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
            className={`${logoFont.className} text-3xl sm:text-4xl font-semibold tracking-[0.12em] leading-none bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent cursor-pointer`}
          >
            WizFriends
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
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openMessages}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-indigo-100 bg-white text-lg text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                aria-label="Open inbox"
              >
                <span aria-hidden="true">💬</span>
              </motion.button>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="User avatar"
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-indigo-500 shadow-sm object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-100 text-sm font-semibold text-indigo-700 shadow-sm">
                  {fullNameInitials}
                </span>
              )}
              <span className="font-medium text-gray-700">
                {firstName ?? "Member"}
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
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="User"
                  width={50}
                  height={50}
                  className="rounded-full border-2 border-indigo-500 object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-500 bg-indigo-100 text-base font-semibold text-indigo-700">
                  {fullNameInitials}
                </span>
              )}
              <span className="text-gray-800 font-medium">
                {firstName ?? user.email}
              </span>
              <button
                onClick={() => {
                  openMessages();
                  setMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                <span aria-hidden="true">💬</span> Inbox
              </button>
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
