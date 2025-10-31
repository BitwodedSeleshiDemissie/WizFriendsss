const RAW_PLACES = [
  {
    id: "torino-centro",
    name: "Torino Centro",
    subtitle: "Centro Storico - Torino",
    city: "Torino",
    region: "Piemonte",
    latitude: 45.0703,
    longitude: 7.6869,
    aliases: ["turino centro", "torino centro", "centro storico torino"],
    kind: "city",
  },
  {
    id: "torino-parco-ruffini",
    name: "Parco Ruffini",
    subtitle: "Pozzo Strada - Torino",
    city: "Torino",
    region: "Piemonte",
    latitude: 45.0589,
    longitude: 7.6306,
    aliases: ["parco ruffini torino", "stadio parco ruffini", "ruffini park"],
  },
  {
    id: "torino-parco-valentino",
    name: "Parco del Valentino",
    subtitle: "Borgo Po - Torino",
    city: "Torino",
    region: "Piemonte",
    latitude: 45.0594,
    longitude: 7.6868,
    aliases: ["parco valentino", "valentino park", "borgo del valentino"],
  },
  {
    id: "torino-mole-antonelliana",
    name: "Mole Antonelliana",
    subtitle: "Centro Storico - Torino",
    city: "Torino",
    region: "Piemonte",
    latitude: 45.069,
    longitude: 7.6931,
    aliases: ["mole antonelliana", "national cinema museum"],
  },
  {
    id: "milano-centro",
    name: "Milano Centro",
    subtitle: "Duomo - Milano",
    city: "Milano",
    region: "Lombardia",
    latitude: 45.4642,
    longitude: 9.19,
    aliases: ["milan city centre", "centro storico milano", "milano duomo"],
    kind: "city",
  },
  {
    id: "milano-parco-sempione",
    name: "Parco Sempione",
    subtitle: "Castello - Milano",
    city: "Milano",
    region: "Lombardia",
    latitude: 45.4729,
    longitude: 9.1737,
    aliases: ["parco sempione", "sempione park", "castello park"],
  },
  {
    id: "milano-darsena",
    name: "Darsena Navigli",
    subtitle: "Navigli - Milano",
    city: "Milano",
    region: "Lombardia",
    latitude: 45.452,
    longitude: 9.1776,
    aliases: ["darsena milano", "navigli darsena", "navigli milan"],
  },
  {
    id: "roma-centro",
    name: "Roma Centro",
    subtitle: "Centro Storico - Roma",
    city: "Roma",
    region: "Lazio",
    latitude: 41.9028,
    longitude: 12.4964,
    aliases: ["rome centre", "roma centro storico", "rome city centre"],
    kind: "city",
  },
  {
    id: "roma-villa-borghese",
    name: "Villa Borghese",
    subtitle: "Pinciano - Roma",
    city: "Roma",
    region: "Lazio",
    latitude: 41.9139,
    longitude: 12.4922,
    aliases: ["villa borghese park", "parco villa borghese"],
  },
  {
    id: "roma-trastevere",
    name: "Trastevere",
    subtitle: "Rione XIII - Roma",
    city: "Roma",
    region: "Lazio",
    latitude: 41.8898,
    longitude: 12.4709,
    aliases: ["trastevere", "roma trastevere", "trastevere district"],
  },
  {
    id: "firenze-centro",
    name: "Firenze Centro",
    subtitle: "Centro Storico - Firenze",
    city: "Firenze",
    region: "Toscana",
    latitude: 43.7696,
    longitude: 11.2558,
    aliases: ["florence centre", "centro storico firenze", "florence downtown"],
    kind: "city",
  },
  {
    id: "firenze-parco-delle-cascine",
    name: "Parco delle Cascine",
    subtitle: "Cascine - Firenze",
    city: "Firenze",
    region: "Toscana",
    latitude: 43.7803,
    longitude: 11.2217,
    aliases: ["le cascine", "parco cascine", "cascine park"],
  },
  {
    id: "bologna-centro",
    name: "Bologna Centro",
    subtitle: "Quadrilatero - Bologna",
    city: "Bologna",
    region: "Emilia-Romagna",
    latitude: 44.4949,
    longitude: 11.3426,
    aliases: ["bologna centre", "centro storico bologna"],
    kind: "city",
  },
  {
    id: "bologna-giardini-margherita",
    name: "Giardini Margherita",
    subtitle: "Murri - Bologna",
    city: "Bologna",
    region: "Emilia-Romagna",
    latitude: 44.4887,
    longitude: 11.3573,
    aliases: ["giardini margherita", "margherita gardens"],
  },
  {
    id: "napoli-centro",
    name: "Napoli Centro Storico",
    subtitle: "Centro Antico - Napoli",
    city: "Napoli",
    region: "Campania",
    latitude: 40.8522,
    longitude: 14.2681,
    aliases: ["naples centre", "centro storico napoli"],
    kind: "city",
  },
  {
    id: "napoli-lungomare",
    name: "Lungomare Caracciolo",
    subtitle: "Riviera di Chiaia - Napoli",
    city: "Napoli",
    region: "Campania",
    latitude: 40.8329,
    longitude: 14.2488,
    aliases: ["lungomare napoli", "via caracciolo", "naples waterfront"],
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
