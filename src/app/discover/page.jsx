"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEYS = {
  potential: "wizfriends_potential_events",
  live: "wizfriends_live_events",
};

const MIN_ENDORSEMENTS = 3;



const LOCATION_STORAGE_KEY = "wizfriends_preferred_city";

const KNOWN_CITIES = [
  { name: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
  { name: "Durban", lat: -29.8587, lng: 31.0218 },
  { name: "Pretoria", lat: -25.7479, lng: 28.2293 },
  { name: "Stellenbosch", lat: -33.9346, lng: 18.861 },
];

const EARTH_RADIUS_KM = 6371;

const LOCATION_ALIAS_LOOKUP = {
  "signal hill": "Cape Town",
  "bo-kaap": "Cape Town",
  woodstock: "Cape Town",
  "city bowl": "Cape Town",
  newlands: "Cape Town",
  observatory: "Cape Town",
  "global food house": "Cape Town",
  "mindful grove": "Cape Town",
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function guessCityFromLocation(location) {
  const normalized = normalizeText(location);
  if (!normalized) return "";

  if (LOCATION_ALIAS_LOOKUP[normalized]) {
    return LOCATION_ALIAS_LOOKUP[normalized];
  }

  for (const [alias, city] of Object.entries(LOCATION_ALIAS_LOOKUP)) {
    if (normalized.includes(alias)) {
      return city;
    }
  }

  for (const city of KNOWN_CITIES) {
    if (normalized.includes(normalizeText(city.name))) {
      return city.name;
    }
  }

  return "";
}

function findNearestCity(lat, lng) {
  let bestMatch = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  KNOWN_CITIES.forEach((city) => {
    const distance = haversineDistance(lat, lng, city.lat, city.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { name: city.name, distance };
    }
  });

  return bestMatch;
}

function sanitisePotentialEvents(events = []) {
  return events.map((event) => {
    const rawLocation =
      typeof event.location === "string"
        ? event.location
        : typeof event.preferredLocation === "string"
        ? event.preferredLocation
        : "";
    const cleanedLocation = rawLocation.trim();
    const derivedCity =
      (typeof event.city === "string" ? event.city.trim() : "") ||
      guessCityFromLocation(cleanedLocation);

    return {
      ...event,
      city: derivedCity,
      location: cleanedLocation || derivedCity || "",
    };
  });
}

function sanitiseMemberEvents(events = []) {
  return events.map((event) => {
    const rawLocation =
      typeof event.location === "string"
        ? event.location
        : typeof event.preferredLocation === "string"
        ? event.preferredLocation
        : "";
    const cleanedLocation = rawLocation.trim();
    const derivedCity =
      (typeof event.city === "string" ? event.city.trim() : "") ||
      guessCityFromLocation(cleanedLocation);

    return {
      ...event,
      city: derivedCity,
      location: cleanedLocation || derivedCity || "",
    };
  });
}

const communities = [
  {
    id: 1,
    title: "Oceanview Co-Living",
    type: "Co-living",
    image: "/pics/1.jpg",
    description:
      "Beachfront shared house with mindful living spaces, weekly surf lessons, and eco-friendly practices.",
    location: "Signal Hill",
    city: "Cape Town",
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
    city: "Cape Town",
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
    city: "Cape Town",
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
    city: "Cape Town",
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
    city: "Cape Town",
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
    city: "Cape Town",
    price: "R5 500 / month",
    spotsLeft: 2,
    amenities: ["Chef Kitchen", "Fermentation Lab", "Spice Library"],
  },
];

function DiscoverPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [activeTab, setActiveTab] = useState("discover");
  const [potentialEvents, setPotentialEvents] = useState([]);
  const [memberLiveEvents, setMemberLiveEvents] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "potential") {
      setActiveTab("potential");
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedPotential = window.localStorage.getItem(STORAGE_KEYS.potential);
      const storedLive = window.localStorage.getItem(STORAGE_KEYS.live);

      if (storedPotential) {
        setPotentialEvents(sanitisePotentialEvents(JSON.parse(storedPotential)));
      }
      if (storedLive) {
        setMemberLiveEvents(sanitiseMemberEvents(JSON.parse(storedLive)));
      }
    } catch (error) {
      console.error("Failed to load saved events", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedCity = window.localStorage.getItem(LOCATION_STORAGE_KEY);
      if (storedCity) {
        setSelectedCity(storedCity);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load preferred city from storage", error);
      }
    }
  }, []);

  const updateSelectedCity = useCallback((city) => {
    setSelectedCity(city);
    if (typeof window !== "undefined") {
      if (city) {
        window.localStorage.setItem(LOCATION_STORAGE_KEY, city);
      } else {
        window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
  }, []);

  const handleDetectLocation = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearestCity = findNearestCity(latitude, longitude);
        setIsLocating(false);

        if (nearestCity?.name) {
          updateSelectedCity(nearestCity.name);
        } else {
          setLocationError("We couldn't match your location to a nearby city yet.");
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [updateSelectedCity]);

  const liveEvents = useMemo(
    () => [
      ...communities,
      ...memberLiveEvents.map((event) => ({
        ...event,
        type: event.category || event.type || "Member Event",
        city: event.city || guessCityFromLocation(event.location),
        location: event.location || event.city || "",
      })),
    ],
    [memberLiveEvents]
  );

  const cityOptions = useMemo(() => {
    const unique = new Set();
    liveEvents.forEach((event) => {
      if (event.city) {
        unique.add(event.city);
      }
    });
    if (selectedCity) {
      unique.add(selectedCity);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [liveEvents, selectedCity]);

  const communityTypes = useMemo(
    () => Array.from(new Set(liveEvents.map((item) => item.type).filter(Boolean))),
    [liveEvents]
  );

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  const filteredCommunities = liveEvents.filter((community) => {
    const matchesType =
      selectedTypes.length === 0 || selectedTypes.includes(community.type);
    if (!matchesType) {
      return false;
    }

    if (!selectedCity) {
      return true;
    }
    const targetCity = normalizeText(selectedCity);
    const communityCity = normalizeText(community.city);
    const communityLocation = normalizeText(community.location);

    if (communityCity === targetCity) {
      return true;
    }

    if (communityLocation && communityLocation.includes(targetCity)) {
      return true;
    }

    return false;
  });

  const persistPotentialEvents = (events) => {
    const sanitized = sanitisePotentialEvents(events);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.potential, JSON.stringify(sanitized));
    }
    setPotentialEvents(sanitized);
  };

  const persistMemberLiveEvents = (events) => {
    const sanitized = sanitiseMemberEvents(events);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.live, JSON.stringify(sanitized));
    }
    setMemberLiveEvents(sanitized);
  };

  const handleEndorse = (eventId) => {
    if (!user) {
      const redirectTo = encodeURIComponent("/discover?tab=potential");
      router.replace(`/auth/login?redirect=${redirectTo}`);
      return;
    }

    const currentEvent = potentialEvents.find((event) => event.id === eventId);
    if (!currentEvent) return;

    const endorsements = currentEvent.endorsements || [];
    if (endorsements.includes(user.uid)) return;

    const updatedEvent = {
      ...currentEvent,
      endorsements: [...endorsements, user.uid],
    };

    if (updatedEvent.endorsements.length >= MIN_ENDORSEMENTS) {
      const remaining = potentialEvents.filter((event) => event.id !== eventId);
      persistPotentialEvents(remaining);

      const promotedEvent = {
        ...updatedEvent,
        status: "live",
        promotedAt: new Date().toISOString(),
      };
      persistMemberLiveEvents([...memberLiveEvents, promotedEvent]);
      setActiveTab("discover");
      return;
    }

    const nextPotential = potentialEvents.map((event) =>
      event.id === eventId ? updatedEvent : event
    );
    persistPotentialEvents(nextPotential);
  };

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
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-white/80 shadow-md p-1">
            <button
              onClick={() => setActiveTab("discover")}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                activeTab === "discover"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab("potential")}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-all ${
                activeTab === "potential"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Potential Events
            </button>
          </div>
        </div>
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
          {activeTab === "discover" ? (
            <>
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
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 mt-4">
                <div className="flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                  <span className="text-xs uppercase tracking-[0.25em] text-gray-400">
                    Your city
                  </span>
                  <select
                    value={selectedCity}
                    onChange={(event) => updateSelectedCity(event.target.value)}
                    className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none"
                  >
                    <option value="">All locations</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 px-5 py-2 text-sm font-semibold shadow-sm hover:border-indigo-400 hover:text-indigo-700 transition disabled:opacity-60"
                >
                  {isLocating ? "Locating…" : "Use my location"}
                </motion.button>
              </div>
              {locationError ? (
                <p className="text-xs text-red-500 mt-1">{locationError}</p>
              ) : null}
              <Link href="/discover/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all text-lg"
                >
                  + List Your Community
                </motion.button>
              </Link>
            </>
          ) : (
            <Link href="/discover/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all text-lg"
              >
                + Propose an Event
              </motion.button>
            </Link>
          )}
        </div>
      </div>

      {activeTab === "discover" ? (
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredCommunities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sm:col-span-2 lg:col-span-3 bg-white/80 backdrop-blur border border-dashed border-indigo-200 rounded-3xl p-10 text-center text-gray-600"
            >
              <h3 className="text-xl font-semibold text-indigo-500">
                No events nearby yet
              </h3>
              <p className="mt-3">
                We don&apos;t have any events in {selectedCity || "your area"} right now. Try
                broadening your filters or check back soon.
              </p>
            </motion.div>
          ) : (
            filteredCommunities.map((item, i) => {
              const locationText = [item.location, item.city]
                .filter(Boolean)
                .filter((value, index, array) => array.indexOf(value) === index)
                .join(" · ");

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden transition-all hover:-translate-y-1 border border-gray-100"
                >
                  <div className="relative h-56 w-full">
                    <Image
                      src={item.image || "/pics/1.jpg"}
                      alt={item.title}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                      {item.type || "Community"}
                    </span>
                    {item.spotsLeft ? (
                      <span className="absolute bottom-4 right-4 bg-white/80 backdrop-blur text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        {item.spotsLeft} spots left
                      </span>
                    ) : (
                      <span className="absolute bottom-4 right-4 bg-white/80 backdrop-blur text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        Member-led
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{item.title}</h3>
                        {locationText ? (
                          <p className="text-sm text-indigo-500 font-semibold">{locationText}</p>
                        ) : (
                          <p className="text-sm text-indigo-500 font-semibold">
                            {item.category || item.type}
                          </p>
                        )}
                      </div>
                      {item.price ? (
                        <span className="text-lg font-semibold text-gray-900">{item.price}</span>
                      ) : (
                        <span className="text-sm font-semibold text-indigo-500">
                          Community Event
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {item.description}
                    </p>
                    {item.amenities && item.amenities.length > 0 ? (
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
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
                          Proposed by community
                        </span>
                        <span className="bg-pink-50 text-pink-500 text-xs font-semibold px-3 py-1 rounded-full">
                          Endorsed by peers
                        </span>
                      </div>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-5 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      {item.price ? "Join this Community" : "View Event Details"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          {potentialEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur rounded-3xl border border-dashed border-indigo-200 p-10 text-center text-gray-500"
            >
              <p className="text-lg font-medium text-indigo-500">No potential events yet.</p>
              <p className="mt-3">
                Share an idea and rally endorsements to bring it to life in the Discover tab.
              </p>
              <div className="mt-6">
                <Link href="/discover/new">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all text-lg"
                  >
                    + Propose an Event
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-8">
              {potentialEvents.map((event) => {
                const endorsements = event.endorsements || [];
                const hasEndorsed = user ? endorsements.includes(user.uid) : false;
                const needed = Math.max(MIN_ENDORSEMENTS - endorsements.length, 0);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur border border-gray-100 rounded-3xl shadow-lg overflow-hidden flex flex-col"
                  >
                    <div className="relative h-48 w-full">
                      <Image
                        src={event.image || "/pics/4.jpg"}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute top-4 left-4 bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        {event.category || "Community Idea"}
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
                        <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold mt-2">
                          {[event.city, event.location]
                            .filter(Boolean)
                            .filter((value, index, array) => array.indexOf(value) === index)
                            .join(" · ") || "Location TBC"}
                        </p>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm text-indigo-600 font-semibold bg-indigo-50/70 rounded-2xl px-4 py-2">
                        <span>{endorsements.length} / {MIN_ENDORSEMENTS} endorsements</span>
                        {needed > 0 ? (
                          <span>{needed} more needed</span>
                        ) : (
                          <span>Ready for launch!</span>
                        )}
                      </div>
                      <motion.button
                        whileHover={{ scale: hasEndorsed ? 1 : 1.05 }}
                        whileTap={{ scale: hasEndorsed ? 1 : 0.97 }}
                        onClick={() => handleEndorse(event.id)}
                        disabled={hasEndorsed}
                        className={`w-full py-3 rounded-full font-semibold transition-all ${
                          hasEndorsed
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md hover:shadow-xl"
                        }`}
                      >
                        {hasEndorsed ? "Thanks for endorsing" : "Endorse this idea"}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-50 text-gray-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"
          />
          <p className="text-sm font-medium">Loading discover feed…</p>
        </main>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
