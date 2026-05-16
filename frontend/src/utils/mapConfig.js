const CATEGORY_TAG_STYLES = {
  "religious-temple": {
    label: "Religious Temple",
    shortCode: "RT",
    markerColor: "#22D3EE",
    badgeClass:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
  },
  "historical-monument": {
    label: "Historical Monument",
    shortCode: "HM",
    markerColor: "#14B8A6",
    badgeClass:
      "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-200",
  },
  museum: {
    label: "Museum",
    shortCode: "MU",
    markerColor: "#F59E0B",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  },
  beach: {
    label: "Beach",
    shortCode: "BE",
    markerColor: "#10B981",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  },
  "urban-park": {
    label: "Urban Park",
    shortCode: "UP",
    markerColor: "#A855F7",
    badgeClass:
      "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-200",
  },
};

const DEFAULT_STYLE = {
  label: "Attraction",
  shortCode: "NX",
  markerColor: "#06B6D4",
  badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
};

export const getPrimaryTag = (place) => {
  const tag = place?.categoryTag || place?.category || (Array.isArray(place?.tags) ? place.tags[0] : null);
  return tag && CATEGORY_TAG_STYLES[tag] ? tag : null;
};

export const getTagStyle = (tag) => CATEGORY_TAG_STYLES[tag] || DEFAULT_STYLE;

export const getMarkerIcon = (maps, tag) => {
  const style = getTagStyle(tag);
  if (!maps?.SymbolPath) return null;

  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: style.markerColor,
    fillOpacity: 1,
    scale: 8,
    strokeColor: "#0F172A",
    strokeWeight: 2,
  };
};

export const CATEGORY_STYLE_MAP = CATEGORY_TAG_STYLES;
