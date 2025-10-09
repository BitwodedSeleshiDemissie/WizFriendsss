"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

const communities = [
  {
    id: 1,
    title: "Oceanview Co-Living",
    type: "Co-living",
    image: "/pics/1.jpg",
    description:
      "Beachfront shared house with mindful living spaces, weekly surf lessons, and eco-friendly practices.",
    location: "Signal Hill",
    price: "R4 500 / month",
    spotsLeft: 2,
    amenities: ["Surf Shed", "Shared Studio", "Community Garden"],
  },
  {
    id: 2,
    title: "The Creative Courtyard",
    type: "Creative Collective",
    image: "/pics/2.jpg",
    description:
      "Renovated heritage home with art studios, podcast booth, and rooftop cinema nights.",
    location: "Bo-Kaap",
    price: "R5 200 / month",
    spotsLeft: 4,
    amenities: ["Art Studio", "Podcast Booth", "Rooftop Cinema"],
  },
  {
    id: 3,
    title: "Ubuntu Impact House",
    type: "Social Impact",
    image: "/pics/3.jpg",
    description:
      "Live with changemakers focused on sustainability projects and weekly volunteering outreaches.",
    location: "Woodstock",
    price: "R3 800 / month",
    spotsLeft: 1,
    amenities: ["Workshop Space", "Bike Share", "Community Dinners"],
  },
  {
    id: 4,
    title: "Cape Tech Loft",
    type: "Tech & Startup",
    image: "/pics/4.jpg",
    description:
      "Modern loft-style apartments with 24/7 coworking lab, maker space, and mentorship circles.",
    location: "City Bowl",
    price: "R6 000 / month",
    spotsLeft: 5,
    amenities: ["Cowork Lab", "Maker Space", "Mentor Sessions"],
  },
  {
    id: 5,
    title: "Mindful Grove",
    type: "Wellness Retreat",
    image: "/pics/5.jpg",
    description:
      "Forest-edge sanctuary with meditation domes, plant-based kitchen, and nature therapy trails.",
    location: "Newlands",
    price: "R4 900 / month",
    spotsLeft: 3,
    amenities: ["Meditation Domes", "Plant-based Kitchen", "Forest Trails"],
  },
  {
    id: 6,
    title: "Global Food House",
    type: "Culinary Collective",
    image: "/pics/6.jpg",
    description:
      "International foodie home with chef-curated dinners, fermentation lab, and spice library.",
    location: "Observatory",
    price: "R5 500 / month",
    spotsLeft: 2,
    amenities: ["Chef Kitchen", "Fermentation Lab", "Spice Library"],
  },
];

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const communityTypes = Array.from(new Set(communities.map((item) => item.type)));

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  const filteredCommunities = communities.filter((community) => {
    if (selectedTypes.length === 0) return true;
    return selectedTypes.includes(community.type);
  });

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

        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500 uppercase tracking-[0.35em]">
            Browse by Community Type
          </p>
          <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
            {communityTypes.map((type) => {
              const isActive = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
          <Link href="/discover/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all text-lg"
            >
              + List Your Community
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Communities Grid */}
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredCommunities.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transition-all hover:-translate-y-1 border border-gray-100"
          >
            <div className="relative h-56 w-full">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                {item.type}
              </span>
              <span className="absolute bottom-4 right-4 bg-white/80 backdrop-blur text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                {item.spotsLeft} spots left
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-indigo-500 font-semibold">{item.location}</p>
                </div>
                <span className="text-lg font-semibold text-gray-900">{item.price}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                {item.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {item.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-5 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all"
              >
                Join this Community
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
