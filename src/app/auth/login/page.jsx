"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../../lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/discover";
  const { user, loading: authLoading } = useAuth();

  // ✅ If already logged in, redirect immediately
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirect);
    }
  }, [authLoading, user, router, redirect]);

  // ⏳ Prevent flicker while checking auth
  if (authLoading || user) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Logged in as:", result.user.displayName);
      router.replace(redirect);
    } catch (error) {
      console.error("❌ Google login error:", error.message);
    } finally {
      setLoading(false);
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
        transition={{ duration: 0.6 }}
        className="relative bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl p-10 max-w-md w-full text-center border border-white/40"
      >
        <Image
          src="/logo.svg"
          alt="Logo"
          width={60}
          height={60}
          className="mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome to Commune
        </h1>
        <p className="text-gray-500 mb-8">
          Connect with like-minded people and join inspiring communities.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-6 py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <>
              <Image
                src="/google-icon.svg"
                alt="Google Icon"
                width={20}
                height={20}
              />
              Continue with Google
            </>
          )}
        </motion.button>

        <p className="text-sm text-gray-500 mt-6">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </motion.div>
    </main>
  );
}
