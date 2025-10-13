"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import ActivitiesNearMeTab from "../components/tabs/ActivitiesNearMeTab";
import ExploreTab from "../components/tabs/ExploreTab";
import BrainstormTab from "../components/tabs/BrainstormTab";
import GroupsTab from "../components/tabs/GroupsTab";
import ProfileTab from "../components/tabs/ProfileTab";
import BottomTabNav from "../components/BottomTabNav";
import FloatingActionButton from "../components/FloatingActionButton";

const ENDORSEMENT_THRESHOLD = 3;
const CURRENT_USER_ID = "Thandi";

const TAB_CONFIG = [
  { id: "nearby", label: "Near Me", icon: "📍" },
  { id: "explore", label: "Explore", icon: "🧭" },
  { id: "brainstorm", label: "Brainstorm", icon: "💡" },
  { id: "groups", label: "Groups", icon: "🤝" },
  { id: "profile", label: "Profile", icon: "🧑" },
];

const USER_BASE = {
  id: CURRENT_USER_ID,
  name: "Thandi Mokoena",
  tagline: "Finding community through shared experiences.",
  homeCity: "Johannesburg",
  currentCity: "Cape Town",
  profileCompletion: 82,
  interests: ["Outdoor adventures", "Foodie", "Tech meetups", "Wellness"],
  favourites: ["act-2"],
};

const INITIAL_ACTIVITIES = [
  {
    id: "act-1",
    title: "Sunrise Coastal Run",
    description: "Meet at Mouille Point lighthouse for a 6 km social run. Pace groups for all levels followed by smoothie bowls.",
    category: "Active & Wellness",
    dateTime: generateFutureDate({ daysAhead: 2, hour: 6, minute: 30 }),
    location: "Mouille Point Lighthouse",
    city: "Cape Town",
    host: "Lebo K.",
    distance: 3,
    attendees: 18,
    tags: ["running", "wellness", "outdoors"],
    isNearby: true,
    featured: false,
    isVirtual: false,
  },
  {
    id: "act-2",
    title: "Neighbourhood Potluck Picnic",
    description: "Bring a dish from home and meet other expats at Green Point Park. Family-friendly with lawn games.",
    category: "Social & Connection",
    dateTime: generateFutureDate({ daysAhead: 4, hour: 12, minute: 0 }),
    location: "Green Point Urban Park",
    city: "Cape Town",
    host: "Community Host",
    distance: 5,
    attendees: 42,
    tags: ["food", "family", "outdoors"],
    isNearby: true,
    featured: true,
    isVirtual: false,
  },
  {
    id: "act-3",
    title: "Remote First Coffee Crawl",
    description: "Explore three remote worker-friendly cafes in the CBD with co-working tasters and latte art throwdowns.",
    category: "Professional & Networking",
    dateTime: generateFutureDate({ daysAhead: 5, hour: 9, minute: 0 }),
    location: "Cape Town CBD",
    city: "Cape Town",
    host: "Sip Society",
    distance: 6,
    attendees: 27,
    tags: ["cowork", "coffee", "networking"],
    isNearby: true,
    featured: true,
    isVirtual: false,
  },
  {
    id: "act-4",
    title: "Virtual UX Crit Club",
    description: "Designers from around the world rotate sharing projects for feedback in a 60-minute lightning format.",
    category: "Tech & Learning",
    dateTime: generateFutureDate({ daysAhead: 3, hour: 18, minute: 0 }),
    location: "Online",
    city: "Remote",
    host: "Jenny Park",
    distance: 0,
    attendees: 65,
    tags: ["design", "virtual", "learning"],
    isNearby: false,
    featured: false,
    isVirtual: true,
  },
  {
    id: "act-5",
    title: "Sunset Film Club: Outdoor Screening",
    description: "Watch a cult-classic under the stars with silent-disco headsets. Popcorn and hot drinks included.",
    category: "Arts & Culture",
    dateTime: generateFutureDate({ daysAhead: 6, hour: 19, minute: 0 }),
    location: "Battery Park Amphitheatre",
    city: "Cape Town",
    host: "Movie Mates",
    distance: 4,
    attendees: 54,
    tags: ["film", "outdoors", "social"],
    isNearby: true,
    featured: false,
    isVirtual: false,
  },
  {
    id: "act-6",
    title: "African Fusion Supper Club",
    description: "Monthly dinner party featuring a chef's tasting menu and storytelling from local creatives.",
    category: "Food & Drink",
    dateTime: generateFutureDate({ daysAhead: 8, hour: 20, minute: 0 }),
    location: "Woodstock Exchange Loft",
    city: "Cape Town",
    host: "Chef Lindiwe",
    distance: 8,
    attendees: 32,
    tags: ["food", "culture", "networking"],
    isNearby: true,
    featured: false,
    isVirtual: false,
  },
  {
    id: "act-7",
    title: "Tabletop Thursday",
    description: "Board games, RPGs, and strategy classics. Bring a snack and meet fellow gamers.",
    category: "Social & Connection",
    dateTime: generateFutureDate({ daysAhead: 1, hour: 18, minute: 30 }),
    location: "Obs Community Hub",
    city: "Cape Town",
    host: "Game Guild",
    distance: 7,
    attendees: 21,
    tags: ["games", "indoors", "social"],
    isNearby: true,
    featured: false,
    isVirtual: false,
  },
  {
    id: "act-8",
    title: "Impact Lab Volunteering",
    description: "Join monthly impact sprints supporting local NGOs with marketing, funding, and operations.",
    category: "Social Impact",
    dateTime: generateFutureDate({ daysAhead: 10, hour: 10, minute: 30 }),
    location: "Workshop17 Waterfront",
    city: "Cape Town",
    host: "Impact Lab Collective",
    distance: 5,
    attendees: 16,
    tags: ["volunteer", "skills", "community"],
    isNearby: true,
    featured: false,
    isVirtual: false,
  },
];

const INITIAL_GROUPS = [
  {
    id: "group-1",
    name: "Weekend Trail Runners",
    description: "Saturday sunrise trail missions focused on inclusive pacing and post-run coffee rituals.",
    baseLocation: "Signal Hill",
    members: 68,
    nextActivity: "Sat · 06:00 · Lion's Head loop",
    cadence: "Weekly",
    tags: ["running", "outdoors", "wellness"],
    isPrivate: false,
    image: "/pics/7.jpg",
    photographer: null,
    photographerUrl: null,
  },
  {
    id: "group-2",
    name: "Film & Feast Society",
    description: "A community of cinephiles hosting themed screenings paired with curated menus.",
    baseLocation: "Gardens",
    members: 42,
    nextActivity: "Fri · 19:30 · Documentary night",
    cadence: "Bi-weekly",
    tags: ["film", "food", "storytelling"],
    isPrivate: false,
    image: "/pics/5.jpg",
    photographer: null,
    photographerUrl: null,
  },
  {
    id: "group-3",
    name: "Global Remote Workers Circle",
    description: "Daily accountability check-ins, pop-up co-working, and networking with nomads.",
    baseLocation: "Hybrid",
    members: 105,
    nextActivity: "Thu · 09:00 · Waterfront cowork",
    cadence: "Multi-week",
    tags: ["cowork", "professional", "remote"],
    isPrivate: true,
    image: "/pics/2.jpg",
    photographer: null,
    photographerUrl: null,
  },
  {
    id: "group-4",
    name: "Mindful Makers",
    description: "Creative workshops blending art therapy, ceramics, and journaling for mindful living.",
    baseLocation: "Observatory",
    members: 53,
    nextActivity: "Sun · 15:00 · Clay & conversation",
    cadence: "Monthly",
    tags: ["creativity", "wellness", "mindfulness"],
    isPrivate: false,
    image: "/pics/6.jpg",
    photographer: null,
    photographerUrl: null,
  },
];

const INITIAL_IDEAS = [
  {
    id: "idea-1",
    title: "Sunset Language Exchange on Signal Hill",
    description: "Pair up with locals for rotating 15-minute language exchanges followed by shared snacks.",
    category: "Arts & Culture",
    tags: ["language", "sunset", "culture"],
    supporters: ["Naledi", "Zahi"],
    suggestedTime: "Friday 18:00",
    preferredLocation: "Signal Hill lookout",
    status: "open",
  },
  {
    id: "idea-2",
    title: "Community Impact Hack Night",
    description: "Collaborate on civic tech problems pitched by NGOs and present prototypes by the end of the night.",
    category: "Tech & Learning",
    tags: ["civic-tech", "volunteer", "innovation"],
    supporters: ["Ivy", "Ruben", "Noor"],
    suggestedTime: "Wednesday 17:30",
    preferredLocation: "Workshop17 Waterfront",
    status: "ready",
  },
  {
    id: "idea-3",
    title: "Cape Town Kayak Buddies",
    description: "Match with paddle partners for bi-weekly sea kayaking adventures with rotating routes.",
    category: "Active & Wellness",
    tags: ["kayak", "ocean", "fitness"],
    supporters: [],
    suggestedTime: "Saturday 07:00",
    preferredLocation: "Three Anchor Bay Slipway",
    status: "open",
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "note-1",
    title: "Reminder: Sunrise Coastal Run",
    message: "Starts in 12 hours. Weather looks clear—bring water and a headlamp.",
    time: "Today, 18:00",
  },
  {
    id: "note-2",
    title: "You joined: Neighbourhood Potluck Picnic",
    message: "Hosts shared an ingredient list to avoid duplicates.",
    time: "Yesterday, 14:15",
  },
  {
    id: "note-3",
    title: "Group invite: Mindful Makers",
    message: "Lindiwe invited you to join their monthly creative sessions.",
    time: "2 days ago",
  },
];

const CREATE_FORM_DEFAULT = {
  title: "",
  description: "",
  category: "",
  date: "",
  time: "",
  location: "",
  city: USER_BASE.currentCity,
  distance: "5",
  isFeatured: false,
  isVirtual: false,
};

const IDEA_BLUEPRINTS = {
  social: [
    { title: "Community Connections Mixer", tags: ["social", "welcome"] },
    { title: "Story Swap & Snacks", tags: ["stories", "food"] },
  ],
  food: [
    { title: "City Flavours Progressive Dinner", tags: ["food", "culture"] },
    { title: "Street Food Taste Tour", tags: ["street-food", "explore"] },
  ],
  active: [
    { title: "Sunrise Movement Club", tags: ["fitness", "outdoors"] },
    { title: "Adventure Buddy Match-up", tags: ["outdoors", "community"] },
  ],
  culture: [
    { title: "Art House Pop-up Night", tags: ["arts", "film"] },
    { title: "Creative Collab Lab", tags: ["creative", "collab"] },
  ],
  learning: [
    { title: "Curious Minds Salon", tags: ["learning", "discussion"] },
    { title: "Hands-on Maker Studio", tags: ["maker", "skills"] },
  ],
  impact: [
    { title: "Do-Good Sprint Session", tags: ["impact", "volunteer"] },
    { title: "Community Project Power Hour", tags: ["community", "action"] },
  ],
};

const CATEGORY_KEYWORDS = [
  { slug: "food", category: "Food & Drink", keywords: ["food", "chef", "cook", "dinner", "brunch", "coffee", "restaurant"] },
  { slug: "active", category: "Active & Wellness", keywords: ["run", "hike", "yoga", "workout", "fitness", "climb", "kayak", "surf"] },
  { slug: "culture", category: "Arts & Culture", keywords: ["film", "movie", "gallery", "art", "music", "museum", "poetry"] },
  { slug: "learning", category: "Tech & Learning", keywords: ["tech", "code", "startup", "design", "ux", "ai", "learning", "workshop"] },
  { slug: "impact", category: "Social Impact", keywords: ["volunteer", "impact", "ngo", "charity", "community service", "donate"] },
];

const TIME_SLOTS = [
  "Thursday 18:30",
  "Friday 19:00",
  "Saturday 10:00",
  "Saturday 16:00",
  "Sunday 11:00",
  "Wednesday 17:30",
];

const LOCATION_LIBRARY = {
  social: ["Rooftop lounge in {city}", "Community co-working terrace", "Seaside promenade picnic spot"],
  food: ["Hidden supper club loft in {city}", "Chef's studio kitchen", "Local food market pavilion"],
  active: ["Green Point Urban Park", "Sea Point Promenade", "Lion's Head base camp"],
  culture: ["Independent cinema courtyard", "Local art gallery studio", "Cultural hub in {city}"],
  learning: ["Innovation lab at Workshop17", "Makerspace in Woodstock", "Downtown co-creation loft"],
  impact: ["Neighbourhood community centre", "Partnership hub at Waterfront", "NGO accelerator space"],
};

const DEFAULT_GROUP_IMAGE = "/pics/1.jpg";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("nearby");
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [ideas, setIdeas] = useState(INITIAL_IDEAS);
  const [filters, setFilters] = useState({ category: "All", distance: "Any", date: "Any" });
  const [joinedActivities, setJoinedActivities] = useState(["act-1", "act-2"]);
  const [savedActivities, setSavedActivities] = useState([...USER_BASE.favourites]);
  const [joinedGroups, setJoinedGroups] = useState(["group-1"]);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...CREATE_FORM_DEFAULT });

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && TAB_CONFIG.some((tab) => tab.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    if (!tabParam && activeTab !== "nearby") {
      setActiveTab("nearby");
    }
  }, [searchParams, activeTab]);

  const categories = useMemo(() => {
    const unique = new Set(activities.map((activity) => activity.category));
    return Array.from(unique);
  }, [activities]);

  const featuredActivities = useMemo(
    () => activities.filter((activity) => activity.featured),
    [activities]
  );

  const trendingActivities = useMemo(() => {
    return [...activities]
      .filter((activity) => !activity.isVirtual)
      .sort((a, b) => b.attendees - a.attendees)
      .slice(0, 4);
  }, [activities]);

  const userProfile = useMemo(() => {
    const favourites = Array.from(
      new Set([...USER_BASE.favourites, ...savedActivities])
    );

    return {
      ...USER_BASE,
      favourites,
      ideasEndorsed: ideas.filter((idea) => idea.supporters.includes(CURRENT_USER_ID)).length,
    };
  }, [savedActivities, ideas]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: "All", distance: "Any", date: "Any" });
  };

  const appendNotification = (title, message) => {
    setNotifications((prev) => {
      const next = [
        {
          id: `note-${Date.now()}`,
          title,
          message,
          time: "Just now",
        },
        ...prev,
      ];
      return next.slice(0, 8);
    });
  };

  const requestGroupImage = async (query) => {
    if (!query) return null;
    try {
      const response = await fetch(`/api/group-image?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Fallback group image fetch failed", error);
      return null;
    }
  };

  const handleTabChange = (tabId, options = { scroll: true }) => {
    if (!TAB_CONFIG.some((tab) => tab.id === tabId)) return;
    setActiveTab(tabId);
    const destination = tabId === "nearby" ? "/" : `/?tab=${tabId}`;
    router.replace(destination, { scroll: options.scroll });
  };

  const handleJoinActivity = (activityId) => {
    if (joinedActivities.includes(activityId)) return;
    const target = activities.find((activity) => activity.id === activityId);
    if (!target) return;

    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId
          ? { ...activity, attendees: activity.attendees + 1 }
          : activity
      )
    );
    setJoinedActivities((prev) => [...prev, activityId]);
    appendNotification("Activity joined", `You're confirmed for ${target.title}. See you there!`);
  };

  const handleSaveActivity = (activityId) => {
    setSavedActivities((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleSubmitPrompt = (prompt) => {
    const suggestion = generateIdeaFromPrompt(prompt, USER_BASE.currentCity);
    const idea = {
      id: `idea-${Date.now()}`,
      ...suggestion,
      supporters: [CURRENT_USER_ID],
      status: "open",
    };

    setIdeas((prev) => [idea, ...prev]);
    appendNotification("Idea published", `"${idea.title}" is live in Brainstorm.`);
  };

  const promoteIdeaToActivity = (idea) => {
    const newActivity = {
      id: `act-${Date.now()}`,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      dateTime: createDateFromSuggestion(idea.suggestedTime),
      location: idea.preferredLocation.includes("{city}")
        ? idea.preferredLocation.replace("{city}", USER_BASE.currentCity)
        : idea.preferredLocation,
      city: USER_BASE.currentCity,
      host: "Community Host",
      distance: 4,
      attendees: idea.supporters.length,
      tags: idea.tags,
      isNearby: true,
      featured: false,
      isVirtual: false,
    };

    setActivities((prev) => [newActivity, ...prev]);
    appendNotification("Idea approved", `${idea.title} is now live in Activities.`);
  };

  const handleEndorseIdea = (ideaId) => {
    let promotedIdea = null;

    setIdeas((prevIdeas) =>
      prevIdeas.map((idea) => {
        if (idea.id !== ideaId) return idea;
        if (idea.supporters.includes(CURRENT_USER_ID) || idea.status === "launched") {
          return idea;
        }
        const supporters = [...idea.supporters, CURRENT_USER_ID];
        let status = idea.status;
        if (supporters.length >= ENDORSEMENT_THRESHOLD && idea.status !== "launched") {
          status = "launched";
          promotedIdea = { ...idea, supporters, status };
        } else if (supporters.length >= ENDORSEMENT_THRESHOLD && idea.status !== "ready") {
          status = "ready";
        }
        return { ...idea, supporters, status };
      })
    );

    if (promotedIdea) {
      promoteIdeaToActivity(promotedIdea);
    }
  };

  const handleJoinGroup = (groupId) => {
    if (joinedGroups.includes(groupId)) return;
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;

    setGroups((prev) =>
      prev.map((item) =>
        item.id === groupId ? { ...item, members: item.members + 1 } : item
      )
    );
    setJoinedGroups((prev) => [...prev, groupId]);
    appendNotification("Group joined", `Welcome to ${group.name}!`);
  };

  const handleCreateGroup = async ({ name, description, isPrivate, tags, image }) => {
    const normalisedTags = tags.length > 0 ? tags : ["community"];
    const providedImage = image?.trim();
    let resolvedImage = providedImage || null;
    let photographer = null;
    let photographerUrl = null;

    if (!resolvedImage) {
      const query =
        normalisedTags[0] ||
        name
          .split(" ")
          .slice(0, 2)
          .join(" ");
      const fallback = await requestGroupImage(query);
      if (fallback?.imageUrl) {
        resolvedImage = fallback.imageUrl;
        photographer = fallback.photographer || null;
        photographerUrl = fallback.profileUrl || null;
      }
    }

    if (!resolvedImage) {
      resolvedImage = DEFAULT_GROUP_IMAGE;
    }

    const newGroup = {
      id: `group-${Date.now()}`,
      name,
      description,
      isPrivate,
      tags: normalisedTags,
      members: 1,
      baseLocation: USER_BASE.currentCity,
      nextActivity: "TBD · coordinate with members",
      cadence: "Flexible",
      image: resolvedImage,
      photographer,
      photographerUrl,
    };

    setGroups((prev) => [newGroup, ...prev]);
    setJoinedGroups((prev) => [...prev, newGroup.id]);
    appendNotification("Group created", `${name} is ready. Invite members to join.`);
    return newGroup;
  };

  const handleCreateActivitySubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = createForm.title.trim();
    const trimmedDescription = createForm.description.trim();
    const trimmedLocation = createForm.location.trim();
    const trimmedCategory = createForm.category.trim();
    if (!trimmedTitle || !trimmedDescription || !trimmedLocation || !trimmedCategory) {
      return;
    }

    const dateTime = buildDateFromForm(createForm.date, createForm.time);

    const newActivity = {
      id: `act-${Date.now()}`,
      title: trimmedTitle,
      description: trimmedDescription,
      category: trimmedCategory,
      dateTime,
      location: trimmedLocation,
      city: createForm.city || USER_BASE.currentCity,
      host: USER_BASE.name,
      distance: Number(createForm.distance) || 5,
      attendees: 1,
      tags: [trimmedCategory.toLowerCase(), "community"],
      isNearby: (createForm.city || USER_BASE.currentCity) === USER_BASE.currentCity,
      featured: createForm.isFeatured,
      isVirtual: createForm.isVirtual,
    };

    setActivities((prev) => [newActivity, ...prev]);
    setJoinedActivities((prev) => [...prev, newActivity.id]);
    appendNotification("Activity published", `${trimmedTitle} is now visible to the community.`);

    setCreateForm({ ...CREATE_FORM_DEFAULT, city: createForm.city });
    setShowCreateModal(false);
    handleTabChange("nearby", { scroll: false });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "nearby":
        return (
          <ActivitiesNearMeTab
            activities={activities}
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            onResetFilters={resetFilters}
            joinedActivities={joinedActivities}
            savedActivities={savedActivities}
            onJoin={handleJoinActivity}
            onSave={handleSaveActivity}
          />
        );
      case "explore":
        return (
          <ExploreTab
            activities={activities}
            featured={featuredActivities}
            trending={trendingActivities}
            onJoin={handleJoinActivity}
            onSave={handleSaveActivity}
            joinedActivities={joinedActivities}
            savedActivities={savedActivities}
          />
        );
      case "brainstorm":
        return (
          <BrainstormTab
            ideas={ideas}
            onSubmitPrompt={handleSubmitPrompt}
            onEndorseIdea={handleEndorseIdea}
            endorsementThreshold={ENDORSEMENT_THRESHOLD}
            currentUserId={CURRENT_USER_ID}
          />
        );
      case "groups":
        return (
          <GroupsTab
            groups={groups}
            joinedGroups={joinedGroups}
            onJoinGroup={handleJoinGroup}
            onCreateGroup={handleCreateGroup}
          />
        );
      case "profile":
        return (
          <ProfileTab
            user={userProfile}
            activities={activities}
            groups={groups}
            joinedActivities={joinedActivities}
            joinedGroups={joinedGroups}
            savedActivities={savedActivities}
            notifications={notifications}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-white via-indigo-50 to-pink-100 text-gray-900 pb-40">
      <div className="max-w-7xl mx-auto px-5 pt-28 space-y-12">
        <header className="rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">HomeConnect · Product v1.0</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Find your people, wherever you are.
            </h1>
            <p className="text-gray-600 max-w-2xl">
              A social discovery platform for newcomers and locals to build real, recurring connections. Navigate the five core tabs to join activities, surface new ideas, spin up groups, and manage your community life.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                Activities Near Me
              </span>
              <span className="bg-pink-50 text-pink-500 px-3 py-1 rounded-full">
                Explore & Featured
              </span>
              <span className="bg-purple-50 text-purple-500 px-3 py-1 rounded-full">
                Brainstorm with AI
              </span>
              <span className="bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full">
                Groups & Community
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                Profile Hub
              </span>
            </div>
          </div>
          <div className="lg:w-72 bg-gradient-to-br from-indigo-600/10 to-pink-600/10 border border-white/70 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Success criteria</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• New members join or endorse within 3 days</li>
              <li>• At least one event joined per first session</li>
              <li>• Weekly returners hosting or attending</li>
              <li>• Groups forming from recurring attendance</li>
            </ul>
            <p className="text-xs text-gray-500">
              Keep the flows friendly, clear, and scalable across web and future mobile builds.
            </p>
          </div>
        </header>

        <section>{renderActiveTab()}</section>
      </div>

      <FloatingActionButton
        onClick={() => {
          handleTabChange("nearby", { scroll: false });
          setShowCreateModal(true);
        }}
      />

      <BottomTabNav
        tabs={TAB_CONFIG}
        activeTab={activeTab}
        onChange={(tabId) => handleTabChange(tabId, { scroll: false })}
      />

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-xl w-full rounded-3xl bg-white shadow-2xl border border-white/60 p-6 md:p-8 space-y-6"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label="Close create activity form"
              >
                ✕
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create a new activity</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Share the essentials—community members will see this in Activities Near Me and Explore.
                </p>
              </div>
              <form onSubmit={handleCreateActivitySubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Activity title"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    value={createForm.category}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Category (e.g. Wellness, Food)"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder="Describe who it's for and what to expect..."
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="time"
                    value={createForm.time}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, time: event.target.value }))}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Location"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <input
                    type="number"
                    min="0"
                    value={createForm.distance}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, distance: event.target.value }))}
                    placeholder="Distance (km)"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={createForm.isVirtual}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, isVirtual: event.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Virtual event
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={createForm.isFeatured}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Feature this listing
                  </label>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all"
                >
                  Publish activity
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function generateFutureDate({ daysAhead, hour, minute }) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function buildDateFromForm(date, time) {
  if (date && time) {
    const combined = new Date(`${date}T${time}`);
    if (!Number.isNaN(combined.getTime())) {
      return combined.toISOString();
    }
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 5);
  fallback.setHours(18, 0, 0, 0);
  return fallback.toISOString();
}

function generateIdeaFromPrompt(prompt, currentCity) {
  const lower = prompt.toLowerCase();
  const matchedCategory =
    CATEGORY_KEYWORDS.find((entry) =>
      entry.keywords.some((keyword) => lower.includes(keyword))
    ) || { slug: "social", category: "Social & Connection" };

  const blueprints = IDEA_BLUEPRINTS[matchedCategory.slug] || IDEA_BLUEPRINTS.social;
  const blueprint = blueprints[Math.floor(Math.random() * blueprints.length)];

  const locationOptions = LOCATION_LIBRARY[matchedCategory.slug] || LOCATION_LIBRARY.social;
  const preferredLocation = locationOptions[Math.floor(Math.random() * locationOptions.length)].replace("{city}", currentCity);

  const suggestedTime = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];

  const formattedPrompt =
    prompt.charAt(0).toUpperCase() + prompt.slice(1).replace(/\.$/, "");

  return {
    title: blueprint.title,
    description: `${formattedPrompt}. Meet new people and test a fresh idea generated by the community.`,
    category: matchedCategory.category,
    tags: blueprint.tags,
    preferredLocation,
    suggestedTime,
  };
}

const DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function createDateFromSuggestion(suggestion) {
  const match = suggestion.match(
    /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{1,2}):(\d{2})/i
  );
  const now = new Date();
  if (!match) {
    const fallback = new Date(now);
    fallback.setDate(now.getDate() + 3);
    fallback.setHours(18, 0, 0, 0);
    return fallback.toISOString();
  }

  const [, dayNameRaw, hourRaw, minuteRaw] = match;
  const dayName =
    dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase();
  const targetDay = DAY_INDEX[dayName];
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const eventDate = new Date(now);
  const diff = (targetDay + 7 - now.getDay()) % 7 || 7;
  eventDate.setDate(now.getDate() + diff);
  eventDate.setHours(hour, minute, 0, 0);
  return eventDate.toISOString();
}
