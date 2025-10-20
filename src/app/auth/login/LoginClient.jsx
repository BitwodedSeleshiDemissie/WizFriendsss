"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function LoginClient({ redirectTo }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [authLoading, user, router, redirectTo]);

  if (authLoading || user) {
    return null;
  }

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured. Please refresh the page and try again.");
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
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("❌ Google login error:", error);
      setLoading(false);
      const message =
        error?.message ??
        "Google sign-in failed. Please try again in a new tab or contact support if the issue persists.";
      setErrorMessage(message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-pink-100 relative overflow-hidden">
      {/* Background blur and decorations */}
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-pink-300/30 rounded-full blur-3xl animate-pulse" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 w-full max-w-md"
      >
        <h1 className="text-3xl font-extrabold text-transparent bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-center">
          Welcome Back
        </h1>
        <p className="text-center text-gray-500 mt-2 mb-8">
          Log in to continue your journey
        </p>

        {/* Dummy form (non-functional for now) */}
        <form className="space-y-5">
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-500 shadow-lg hover:shadow-xl transition-all"
          >
            Log In
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow h-px bg-gray-200"></div>
          <span className="px-4 text-sm text-gray-400">or</span>
          <div className="flex-grow h-px bg-gray-200"></div>
        </div>

        {/* Google Login */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl border border-gray-300 bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 text-gray-600 font-medium"
        >
          <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
          {loading ? "Connecting..." : "Continue with Google"}
        </motion.button>
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-500 text-center">{errorMessage}</p>
        ) : null}

        <p className="text-center text-gray-500 mt-8">
          Don’t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-indigo-600 hover:text-pink-500 transition"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
