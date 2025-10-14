"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

function AboutPageContent() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectTo = useMemo(() => {
    if (!pathname) return "/app";
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const handleJoinClick = () => {
    router.push(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-indigo-50 to-purple-100 text-gray-800 font-body">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 text-center px-6 overflow-hidden">
        <motion.img
          src="/pics/com.jpg"
          alt="People connecting across cultures"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-indigo-50/80 to-purple-100/70 backdrop-blur-sm" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-heading text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent"
          >
            Our Story
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-8 text-lg md:text-xl leading-relaxed text-gray-700"
          >
            <span className="font-semibold text-indigo-600">WizFriends</span> 
            was born from a feeling shared by millions — the ache of being far 
            from home, searching for belonging in an unfamiliar place. Whether 
            you’re an international student, a young professional, or simply 
            someone starting over, we believe connection shouldn’t be a luxury — 
            it should be effortless, human, and real.
          </motion.p>
        </div>
      </section>

      {/* Data & Story Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-indigo-700 mb-6">
            A Global Challenge of Belonging
          </h2>
          <p className="text-gray-700 leading-relaxed mb-5 text-lg">
            According to{" "}
            <span className="font-semibold text-indigo-600">UNESCO</span>, 
            nearly <strong>1 in 3 international students</strong> experience 
            deep loneliness within their first year abroad. But it’s not just 
            students — professionals and families in new environments often face 
            the same quiet disconnection.
          </p>
          <p className="text-gray-700 leading-relaxed mb-5 text-lg">
            The <strong>U.S. Surgeon General’s 2023 report</strong> officially 
            named loneliness a public health crisis — linking isolation to a{" "}
            <span className="font-semibold text-indigo-600">
              29% higher risk of heart disease
            </span>{" "}
            and a{" "}
            <span className="font-semibold text-indigo-600">
              32% higher risk of stroke
            </span>. But more than health, it’s about happiness — the 
            fundamental need to feel seen, heard, and part of something larger.
          </p>
          <p className="text-gray-700 leading-relaxed text-lg">
            That’s why we’re building{" "}
            <span className="font-semibold text-indigo-600">WizFriends</span>: 
            a place where every new city can feel like home — through shared 
            passions, meaningful experiences, and the people who make it all matter.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
        >
          <img
            src="/pics/com.jpg"
            alt="People building community"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 to-pink-500/20" />
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="text-center py-28 px-8 bg-white/70 backdrop-blur-sm shadow-inner">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-heading text-5xl font-bold text-indigo-700 mb-6"
        >
          Our Mission
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="max-w-3xl mx-auto text-lg text-gray-700 leading-relaxed"
        >
          We exist to help people rediscover belonging — by connecting them 
          through shared interests, authentic communities, and real human 
          stories. WizFriends isn’t just an app — it’s a movement toward a 
          more connected, compassionate world.
        </motion.p>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center">
        {!loading && !user && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJoinClick}
            className="inline-block bg-gradient-to-r from-indigo-600 to-pink-500 text-white text-lg font-semibold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all"
          >
            Join the Movement
          </motion.button>
        )}
      </section>
    </main>
  );
}

export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-indigo-50 to-purple-100 text-gray-600">
          <p className="text-sm font-semibold text-indigo-500">Loading our story…</p>
        </main>
      }
    >
      <AboutPageContent />
    </Suspense>
  );
}
