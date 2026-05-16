import tourismLocations from "../../../data/production_srilanka_db.json";

const CATEGORY_FALLBACKS = {
  monument: "historical-monument",
  memorial: "historical-monument",
  archaeological_site: "historical-monument",
  temple: "religious-temple",
  museum: "museum",
  beach: "beach",
  park: "urban-park",
  attraction: "historical-monument",
};

const inferCategoryTag = (location) => {
  const rawCategory = `${location.category || ""}`.toLowerCase();
  const searchableText = [
    rawCategory,
    location.name,
    ...(Array.isArray(location.tags) ? location.tags : []),
  ]
    .join(" ")
    .toLowerCase();

  if (searchableText.includes("temple") || searchableText.includes("devalaya")) {
    return "religious-temple";
  }
  if (searchableText.includes("museum")) return "museum";
  if (searchableText.includes("beach") || searchableText.includes("coastal")) {
    return "beach";
  }
  if (searchableText.includes("park") || searchableText.includes("garden")) {
    return "urban-park";
  }

  return CATEGORY_FALLBACKS[rawCategory] || "historical-monument";
};

export const normalizeLocalTourismLocation = (location) => {
  const [lng, lat] = location?.coordinates?.coordinates || [];
  const categoryTag = inferCategoryTag(location);

  return {
    id: location.location_id,
    name: location.name,
    category: location.category,
    categoryTag,
    district: "Sri Lanka",
    tags: [categoryTag, ...(Array.isArray(location.tags) ? location.tags : [])],
    deep_history: location.deep_history || {},
    tts_hints: location.tts_hints || {},
    coordinates: {
      lat: Number(lat),
      lng: Number(lng),
    },
    raw: location,
  };
};

export const localTourismPlaces = tourismLocations
  .map(normalizeLocalTourismLocation)
  .filter(
    (location) =>
      Number.isFinite(location.coordinates.lat) &&
      Number.isFinite(location.coordinates.lng)
  );
