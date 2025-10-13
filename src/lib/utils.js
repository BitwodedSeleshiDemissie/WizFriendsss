export function generateFutureDate({ daysAhead, hour, minute }) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function buildDateFromForm(date, time) {
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

const CATEGORY_KEYWORDS = [
  { slug: "food", category: "Food & Drink", keywords: ["food", "chef", "cook", "dinner", "brunch", "coffee", "restaurant"] },
  { slug: "active", category: "Active & Wellness", keywords: ["run", "hike", "yoga", "workout", "fitness", "climb", "kayak", "surf"] },
  { slug: "culture", category: "Arts & Culture", keywords: ["film", "movie", "gallery", "art", "music", "museum", "poetry"] },
  { slug: "learning", category: "Tech & Learning", keywords: ["tech", "code", "startup", "design", "ux", "ai", "learning", "workshop"] },
  { slug: "impact", category: "Social Impact", keywords: ["volunteer", "impact", "ngo", "charity", "community service", "donate"] },
];

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

const CATEGORY_TITLE_SUFFIXES = {
  social: ["Meetup", "Mix", "Connection Circle", "Friendship Lab"],
  food: ["Tasting Table", "Supper Social", "Flavour Club", "Culinary Collective"],
  active: ["Adventure Crew", "Movement Club", "Trail Tribe", "Energy Session"],
  culture: ["Story Salon", "Culture Club", "Creative Night", "Art Exchange"],
  learning: ["Ideas Lab", "Innovation Circle", "Brainwave Session", "Learning Guild"],
  impact: ["Impact Sprint", "Changemaker Crew", "Community Action", "Purpose Project"],
};

const STOP_WORDS = new Set([
  "i",
  "im",
  "i'm",
  "want",
  "need",
  "looking",
  "for",
  "with",
  "and",
  "the",
  "a",
  "an",
  "to",
  "meet",
  "people",
  "others",
  "like",
  "who",
  "that",
  "into",
  "about",
  "some",
  "new",
  "community",
  "ideas",
  "idea",
  "together",
  "connect",
  "connection",
  "connections",
  "fun",
  "cool",
  "just",
  "explore",
  "around",
  "join",
  "group",
  "groups",
]);

const GENERIC_TITLE_PREFIXES = new Set([
  "community",
  "city",
  "global",
  "sunset",
  "curious",
  "hands-on",
  "do-good",
  "impact",
  "night",
  "club",
]);

function normaliseWord(word) {
  return word.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function capitalise(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function extractPromptKeywords(prompt) {
  const cleaned = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const keywords = [];
  for (const word of cleaned) {
    const normalised = normaliseWord(word);
    if (!normalised || normalised.length < 3) continue;
    if (STOP_WORDS.has(normalised)) continue;
    if (!keywords.includes(normalised)) {
      keywords.push(normalised);
    }
  }
  return keywords;
}

function trimGenericPrefix(title) {
  if (!title) return "";
  const words = title.split(/\s+/);
  if (words.length <= 1) return title;
  const firstWord = normaliseWord(words[0]);
  if (GENERIC_TITLE_PREFIXES.has(firstWord)) {
    return words.slice(1).join(" ").trim();
  }
  return title;
}

function buildIdeaTitle(prompt, fallbackTitle, categorySlug) {
  const keywords = extractPromptKeywords(prompt).slice(0, 2);
  if (keywords.length === 0) {
    return fallbackTitle;
  }

  const keywordTitle = keywords.map(capitalise).join(" ");
  const trimmedFallback = trimGenericPrefix(fallbackTitle);

  if (!trimmedFallback) {
    const suffixes = CATEGORY_TITLE_SUFFIXES[categorySlug] || ["Collective"];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${keywordTitle} ${suffix}`.trim();
  }

  const lowerCombined = keywordTitle.toLowerCase();
  if (trimmedFallback.toLowerCase().includes(lowerCombined)) {
    return trimmedFallback;
  }

  const suffixes = CATEGORY_TITLE_SUFFIXES[categorySlug] || ["Collective"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${keywordTitle} ${suffix}`.replace(/\s+/g, " ").trim();
}

export function generateIdeaFromPrompt(prompt, currentCity) {
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

  const dynamicTitle = buildIdeaTitle(prompt, blueprint.title, matchedCategory.slug);

  return {
    title: dynamicTitle,
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

export function createDateFromSuggestion(suggestion) {
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
