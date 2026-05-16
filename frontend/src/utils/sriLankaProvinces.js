const PROVINCE_BOUNDS = [
  {
    name: "Northern Province",
    bounds: { minLat: 8.2, maxLat: 10.1, minLng: 79.6, maxLng: 81.95 },
  },
  {
    name: "North Western Province",
    bounds: { minLat: 7.1, maxLat: 8.45, minLng: 79.6, maxLng: 80.55 },
  },
  {
    name: "North Central Province",
    bounds: { minLat: 7.5, maxLat: 8.9, minLng: 80.2, maxLng: 81.4 },
  },
  {
    name: "Western Province",
    bounds: { minLat: 6.2, maxLat: 7.5, minLng: 79.75, maxLng: 80.3 },
  },
  {
    name: "Central Province",
    bounds: { minLat: 6.55, maxLat: 7.75, minLng: 80.35, maxLng: 81.05 },
  },
  {
    name: "Uva Province",
    bounds: { minLat: 6.45, maxLat: 7.3, minLng: 80.85, maxLng: 81.35 },
  },
  {
    name: "Eastern Province",
    bounds: { minLat: 6.1, maxLat: 8.2, minLng: 80.95, maxLng: 81.95 },
  },
  {
    name: "Sabaragamuwa Province",
    bounds: { minLat: 6.0, maxLat: 7.15, minLng: 80.25, maxLng: 81.0 },
  },
  {
    name: "Southern Province",
    bounds: { minLat: 5.85, maxLat: 6.7, minLng: 79.95, maxLng: 81.1 },
  },
];

export const SRI_LANKA_PROVINCES = [
  "Central Province",
  "Eastern Province",
  "North Central Province",
  "Northern Province",
  "North Western Province",
  "Sabaragamuwa Province",
  "Southern Province",
  "Uva Province",
  "Western Province",
];

export function getProvinceFromCoordinates(coordinates) {
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Unknown Province";

  const match = PROVINCE_BOUNDS.find(
    ({ bounds }) =>
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
  );

  return match?.name ?? "Unknown Province";
}

// District bounding boxes (centre-weighted, covers 25 districts)
const DISTRICT_BOUNDS = [
  // Northern Province
  { name: "Jaffna",      bounds: { minLat: 9.4, maxLat: 10.1, minLng: 79.6, maxLng: 80.45 } },
  { name: "Kilinochchi", bounds: { minLat: 9.1, maxLat: 9.6,  minLng: 80.1, maxLng: 80.6  } },
  { name: "Mannar",      bounds: { minLat: 8.7, maxLat: 9.4,  minLng: 79.6, maxLng: 80.25 } },
  { name: "Vavuniya",    bounds: { minLat: 8.5, maxLat: 9.1,  minLng: 80.2, maxLng: 80.75 } },
  { name: "Mullaitivu",  bounds: { minLat: 8.7, maxLat: 9.5,  minLng: 80.5, maxLng: 81.2  } },
  // North Western Province
  { name: "Puttalam",    bounds: { minLat: 7.6, maxLat: 8.45, minLng: 79.6, maxLng: 80.15 } },
  { name: "Kurunegala",  bounds: { minLat: 7.1, maxLat: 8.0,  minLng: 79.9, maxLng: 80.55 } },
  // North Central Province
  { name: "Anuradhapura",bounds: { minLat: 7.9, maxLat: 8.9,  minLng: 80.2, maxLng: 81.0  } },
  { name: "Polonnaruwa", bounds: { minLat: 7.5, maxLat: 8.2,  minLng: 80.7, maxLng: 81.4  } },
  // Western Province
  { name: "Colombo",     bounds: { minLat: 6.6, maxLat: 7.1,  minLng: 79.75, maxLng: 80.05 } },
  { name: "Gampaha",     bounds: { minLat: 7.0, maxLat: 7.5,  minLng: 79.85, maxLng: 80.25 } },
  { name: "Kalutara",    bounds: { minLat: 6.2, maxLat: 6.75, minLng: 79.9,  maxLng: 80.3  } },
  // Central Province
  { name: "Kandy",       bounds: { minLat: 7.1, maxLat: 7.55, minLng: 80.4,  maxLng: 80.85 } },
  { name: "Matale",      bounds: { minLat: 7.4, maxLat: 7.9,  minLng: 80.5,  maxLng: 81.05 } },
  { name: "Nuwara Eliya",bounds: { minLat: 6.55,maxLat: 7.15, minLng: 80.55, maxLng: 81.05 } },
  // Uva Province
  { name: "Badulla",     bounds: { minLat: 6.6, maxLat: 7.2,  minLng: 80.85, maxLng: 81.35 } },
  { name: "Moneragala",  bounds: { minLat: 6.45,maxLat: 7.0,  minLng: 81.0,  maxLng: 81.7  } },
  // Eastern Province
  { name: "Trincomalee", bounds: { minLat: 8.0, maxLat: 8.9,  minLng: 80.9,  maxLng: 81.5  } },
  { name: "Batticaloa",  bounds: { minLat: 7.4, maxLat: 8.2,  minLng: 81.3,  maxLng: 81.95 } },
  { name: "Ampara",      bounds: { minLat: 6.7, maxLat: 7.6,  minLng: 81.3,  maxLng: 81.95 } },
  // Sabaragamuwa Province
  { name: "Ratnapura",   bounds: { minLat: 6.2, maxLat: 6.85, minLng: 80.25, maxLng: 80.85 } },
  { name: "Kegalle",     bounds: { minLat: 6.9, maxLat: 7.25, minLng: 80.2,  maxLng: 80.65 } },
  // Southern Province
  { name: "Galle",       bounds: { minLat: 5.85,maxLat: 6.3,  minLng: 79.95, maxLng: 80.55 } },
  { name: "Matara",      bounds: { minLat: 5.85,maxLat: 6.2,  minLng: 80.35, maxLng: 80.85 } },
  { name: "Hambantota",  bounds: { minLat: 6.0, maxLat: 6.55, minLng: 80.8,  maxLng: 81.5  } },
];

export function getDistrictFromCoordinates(coordinates) {
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Unknown District";

  const match = DISTRICT_BOUNDS.find(
    ({ bounds }) =>
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
  );

  return match?.name ?? "Unknown District";
}

export function resolveDistrict(place) {
  if (typeof place?.district === "string" && place.district.trim() && place.district !== "Sri Lanka") {
    return place.district.trim();
  }
  return getDistrictFromCoordinates(place?.coordinates);
}

export function resolveProvince(place) {
  if (typeof place?.province === "string" && place.province.trim()) {
    return place.province.trim();
  }
  return getProvinceFromCoordinates(place?.coordinates);
}
