"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app";

  const handleGoogleSignup = async () => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Please try again later.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
          : redirectTo;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (error) {
      console.error("❌ Google signup error:", error);
      setLoading(false);
      setErrorMessage(
        error?.message ?? "Google signup failed. Please try again or contact support if the issue persists."
      );
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-white to-indigo-100 relative overflow-hidden">
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-indigo-300/30 rounded-full blur-3xl animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 w-full max-w-md"
      >
        <h1 className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-pink-500 to-indigo-600 bg-clip-text text-center">
          Create Your Account
        </h1>
        <p className="text-center text-gray-500 mt-2 mb-8">
          Join a community that feels like home
        </p>

        <form className="space-y-5">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all"
          >
            Sign Up
          </motion.button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow h-px bg-gray-200"></div>
          <span className="px-4 text-sm text-gray-400">or</span>
          <div className="flex-grow h-px bg-gray-200"></div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full py-3 rounded-xl border border-gray-300 bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 text-gray-600 font-medium"
        >
          <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
          {loading ? "Connecting..." : "Continue with Google"}
        </motion.button>

        {errorMessage ? <p className="mt-4 text-sm text-red-500 text-center">{errorMessage}</p> : null}

        <p className="text-center text-gray-500 mt-8">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-pink-500 hover:text-indigo-600 transition"
          >
            Log in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
//
