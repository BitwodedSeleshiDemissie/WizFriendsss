"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

const activities = [
  {
    id: 1,
    title: "Sunset Hike at Signal Hill",
    category: "Outdoors",
    image: "/pics/1.jpg",
    description:
      "Join fellow adventurers for a breathtaking sunset view. Perfect for photography and nature lovers.",
  },
  {
    id: 2,
    title: "Coffee & Conversations",
    category: "Social",
    image: "/pics/2.jpg",
    description:
      "A relaxed coffee meetup where locals and newcomers share stories, ideas, and laughter.",
  },
  {
    id: 3,
    title: "Beach Cleanup Drive",
    category: "Community",
    image: "/pics/3.jpg",
    description:
      "Make an impact with others passionate about sustainability and keeping our beaches clean.",
  },
  {
    id: 4,
    title: "Coding & Chill Meetup",
    category: "Tech",
    image: "/pics/4.jpg",
    description:
      "Bring your laptop, grab a drink, and code together with fellow developers in your city.",
  },
  {
    id: 5,
    title: "Weekend Yoga Flow",
    category: "Wellness",
    image: "/pics/5.jpg",
    description:
      "Center your mind and body with a calm yoga flow by the park every Sunday morning.",
  },
  {
    id: 6,
    title: "Foodies Unite: Local Tasting Tour",
    category: "Culture",
    image: "/pics/6.jpg",
    description:
      "Taste the best local cuisines while meeting new people from different backgrounds.",
  },
];

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // ✅ Only redirect after Firebase finishes loading
  useEffect(() => {
    if (!loading) {
      if (!user) {
        const redirectTo = encodeURIComponent("/discover");
        router.replace(`/auth/login?redirect=${redirectTo}`);
      } else {
        setChecking(false);
      }
    }
  }, [user, loading, router]);

  if (checking) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-50 text-gray-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-medium">Checking your account...</p>
      </main>
    );
  }

  // ✅ Authenticated View
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-50 pt-28 px-6 pb-20">
      {/* Header Section */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-4"
        >
          {user?.displayName
            ? `Welcome back, ${user.displayName.split(" ")[0]} 👋`
            : "Discover Communities Near You"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center text-gray-600 max-w-2xl mx-auto mb-10"
        >
          Explore events, meetups, and experiences that connect you with people
          who share your passions and lifestyle.
        </motion.p>

        <Link href="/discover/new">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all text-lg"
          >
            + Post an Activity
          </motion.button>
        </Link>
      </div>

      {/* Activities Grid */}
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {activities.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transition-all hover:-translate-y-1"
          >
            <div className="relative h-56 w-full">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                {item.category}
              </span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{item.description}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-5 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all"
              >
                Join
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
