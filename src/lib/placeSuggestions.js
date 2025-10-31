const RAW_PLACES = [
  {
    id: "cape-town-cbd",
    name: "Cape Town CBD",
    subtitle: "City Centre - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9249,
    longitude: 18.4241,
    aliases: ["cape town city centre", "city bowl", "cape town central"],
    kind: "city",
  },
  {
    id: "mouille-point-lighthouse",
    name: "Mouille Point Lighthouse",
    subtitle: "Green Point - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9008,
    longitude: 18.4079,
    aliases: ["green point lighthouse", "mouille point", "lighthouse promenade"],
  },
  {
    id: "green-point-park",
    name: "Green Point Urban Park",
    subtitle: "Green Point - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9039,
    longitude: 18.4092,
    aliases: ["green point park", "greenpoint park"],
  },
  {
    id: "sea-point-promenade",
    name: "Sea Point Promenade",
    subtitle: "Sea Point - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9074,
    longitude: 18.401,
    aliases: ["sea point prom", "promenade"],
  },
  {
    id: "battery-park",
    name: "Battery Park Amphitheatre",
    subtitle: "V&A Waterfront - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9164,
    longitude: 18.4212,
    aliases: ["battery park", "va waterfront battery park", "waterfront amphitheatre"],
  },
  {
    id: "workshop17-waterfront",
    name: "Workshop17 Waterfront",
    subtitle: "V&A Waterfront - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9052,
    longitude: 18.4203,
    aliases: ["workshop 17 waterfront", "workshop17 v&a", "workshop seventeen"],
  },
  {
    id: "woodstock-exchange",
    name: "Woodstock Exchange",
    subtitle: "Woodstock - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9289,
    longitude: 18.4462,
    aliases: ["woodstock x", "wex", "wex building"],
  },
  {
    id: "old-biscuit-mill",
    name: "The Old Biscuit Mill",
    subtitle: "Woodstock - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9242,
    longitude: 18.4488,
    aliases: ["old biscuit mill", "neighbourgoods market"],
  },
  {
    id: "observatory-community",
    name: "Observatory Community Centre",
    subtitle: "Observatory - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9378,
    longitude: 18.4604,
    aliases: ["obs community hub", "observatory community hall", "obs community centre"],
  },
  {
    id: "companys-garden",
    name: "The Company's Garden",
    subtitle: "Gardens - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9271,
    longitude: 18.4206,
    aliases: ["company gardens", "company's garden"],
  },
  {
    id: "signal-hill",
    name: "Signal Hill Lookout",
    subtitle: "Signal Hill - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.918,
    longitude: 18.4031,
    aliases: ["signal hill", "signal hill viewpoint"],
  },
  {
    id: "lions-head",
    name: "Lion's Head Trailhead",
    subtitle: "Table Mountain National Park - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9366,
    longitude: 18.3918,
    aliases: ["lions head", "lion's head parking"],
  },
  {
    id: "kirstenbosch-garden",
    name: "Kirstenbosch Botanical Garden",
    subtitle: "Newlands - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9881,
    longitude: 18.432,
    aliases: ["kirstenbosch", "kirstenbosch national botanical garden"],
  },
  {
    id: "constantia-greenbelt",
    name: "Constantia Greenbelt",
    subtitle: "Constantia - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -34.0005,
    longitude: 18.4413,
    aliases: ["constantia green belt", "constantia trails"],
  },
  {
    id: "clifton-fourth",
    name: "Clifton 4th Beach",
    subtitle: "Clifton - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9415,
    longitude: 18.3779,
    aliases: ["clifton fourth beach", "clifton beach"],
  },
  {
    id: "hout-bay-harbour",
    name: "Hout Bay Harbour",
    subtitle: "Hout Bay - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -34.0433,
    longitude: 18.3501,
    aliases: ["hout bay harbor", "mariner's wharf", "hout bay market"],
  },
  {
    id: "stellenbosch-central",
    name: "Stellenbosch Central",
    subtitle: "Stellenbosch - Western Cape",
    city: "Stellenbosch",
    region: "Western Cape",
    latitude: -33.9346,
    longitude: 18.8602,
    aliases: ["stellenbosch town centre", "stellenbosch cbd"],
    kind: "city",
  },
  {
    id: "johannesburg-cbd",
    name: "Johannesburg CBD",
    subtitle: "City Centre - Johannesburg",
    city: "Johannesburg",
    region: "Gauteng",
    latitude: -26.2041,
    longitude: 28.0473,
    aliases: ["joburg cbd", "jhb cbd", "johannesburg city centre"],
    kind: "city",
  },
  {
    id: "braamfontein",
    name: "Braamfontein Precinct",
    subtitle: "Braamfontein - Johannesburg",
    city: "Johannesburg",
    region: "Gauteng",
    latitude: -26.1936,
    longitude: 28.0335,
    aliases: ["braamfontein", "braam"],
  },
  {
    id: "durban-golden-mile",
    name: "Durban Golden Mile",
    subtitle: "North Beach - Durban",
    city: "Durban",
    region: "KwaZulu-Natal",
    latitude: -29.85,
    longitude: 31.045,
    aliases: ["durban beachfront", "durban promenade"],
    kind: "city",
  },
  {
    id: "pretoria-union-buildings",
    name: "Union Buildings",
    subtitle: "Arcadia - Pretoria",
    city: "Pretoria",
    region: "Gauteng",
    latitude: -25.7402,
    longitude: 28.212,
    aliases: ["union building", "pretoria union buildings"],
  },
  {
    id: "bo-kaap",
    name: "Bo-Kaap Quarter",
    subtitle: "Bo-Kaap - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9186,
    longitude: 18.4159,
    aliases: ["bokaap", "bo kaap"],
  },
  {
    id: "newlands-forest",
    name: "Newlands Forest Station",
    subtitle: "Newlands - Cape Town",
    city: "Cape Town",
    region: "Western Cape",
    latitude: -33.9888,
    longitude: 18.4437,
    aliases: ["newlands forest", "newlands fire station"],
  },
];

function normalize(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildKeywords(place) {
  const source = [
    place.name,
    place.subtitle,
    place.city,
    place.region,
    ...(place.aliases ?? []),
  ];
  const keywords = [];
  source.forEach((value) => {
    const normalized = normalize(value);
    if (!normalized) return;
    if (!keywords.includes(normalized)) {
      keywords.push(normalized);
    }
    normalized.split(" ").forEach((token) => {
      if (token && !keywords.includes(token)) {
        keywords.push(token);
      }
    });
  });
  return keywords;
}

const PLACE_DATA = RAW_PLACES.map((place) => ({
  ...place,
  keywords: buildKeywords(place),
}));

const CITY_CENTER_LOOKUP = PLACE_DATA.reduce((acc, place) => {
  if (place.kind === "city") {
    const key = normalize(place.city);
    if (key && !acc[key]) {
      acc[key] = place;
    }
  }
  return acc;
}, {});

function toSuggestion(place) {
  return {
    id: place.id,
    name: place.name,
    subtitle: place.subtitle || `${place.city}, ${place.region}`,
    city: place.city,
    region: place.region,
    latitude: place.latitude,
    longitude: place.longitude,
    kind: place.kind ?? "place",
  };
}

function computeScore(place, normalizedQuery, normalizedCity) {
  let score = 0;
  if (normalizedQuery) {
    if (place.keywords.includes(normalizedQuery)) {
      score += 6;
    } else if (place.keywords.some((keyword) => keyword.startsWith(normalizedQuery))) {
      score += 4;
    } else if (place.keywords.some((keyword) => keyword.includes(normalizedQuery))) {
      score += 2;
    }
  }
  if (normalizedCity) {
    const placeCity = normalize(place.city);
    if (placeCity && placeCity === normalizedCity) {
      score += 2;
    } else if (place.keywords.includes(normalizedCity)) {
      score += 1;
    }
  }
  if (place.kind === "city") {
    score += 0.5;
  }
  return score;
}

function computeResolveScore(place, normalizedLocation, normalizedCity) {
  let score = 0;
  if (normalizedLocation) {
    if (place.keywords.includes(normalizedLocation)) {
      score += 8;
    } else if (place.keywords.some((keyword) => keyword.startsWith(normalizedLocation))) {
      score += 5;
    } else if (place.keywords.some((keyword) => normalizedLocation.startsWith(keyword))) {
      score += 4;
    } else if (place.keywords.some((keyword) => keyword.includes(normalizedLocation))) {
      score += 3;
    } else {
      const tokens = normalizedLocation.split(" ").filter(Boolean);
      const overlaps = tokens.filter((token) => place.keywords.includes(token));
      if (overlaps.length > 0) {
        score += 2 + overlaps.length * 0.25;
      }
    }
  }
  if (normalizedCity) {
    const placeCity = normalize(place.city);
    if (placeCity && placeCity === normalizedCity) {
      score += 2;
    } else if (place.keywords.includes(normalizedCity)) {
      score += 1;
    }
  }
  if (place.kind === "city") {
    score += 0.5;
  }
  return score;
}

export function searchPlaceSuggestions(query, city, limit = 5) {
  const normalizedQuery = normalize(query);
  const normalizedCity = normalize(city);
  if (!normalizedQuery && !normalizedCity) {
    return [];
  }
  const ranked = PLACE_DATA.map((place) => ({
    place,
    score: computeScore(place, normalizedQuery, normalizedCity),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => toSuggestion(item.place));

  if (ranked.length === 0 && normalizedCity) {
    const cityPlace = CITY_CENTER_LOOKUP[normalizedCity];
    if (cityPlace) {
      return [toSuggestion(cityPlace)];
    }
  }
  return ranked;
}

export function resolvePlaceFromText({ location, city }) {
  const normalizedLocation = normalize(location);
  const normalizedCity = normalize(city);

  let best = null;
  let bestScore = 0;

  PLACE_DATA.forEach((place) => {
    const score = computeResolveScore(place, normalizedLocation, normalizedCity);
    if (score > bestScore) {
      best = place;
      bestScore = score;
    }
  });

  if (best) {
    return toSuggestion(best);
  }

  if (!normalizedLocation && normalizedCity) {
    const cityPlace = CITY_CENTER_LOOKUP[normalizedCity];
    if (cityPlace) {
      return toSuggestion(cityPlace);
    }
  }

  return null;
}

export function getCityFallback(city) {
  const normalizedCity = normalize(city);
  if (!normalizedCity) return null;
  const place = CITY_CENTER_LOOKUP[normalizedCity];
  return place ? toSuggestion(place) : null;
}
