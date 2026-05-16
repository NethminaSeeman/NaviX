/** Project WGS84 lat/lng to % positions inside the stylized island map panel. */
export function lngLatToMapPercent(lat, lng) {
  const latMin = 5.65;
  const latMax = 9.95;
  const lngMin = 79.4;
  const lngMax = 81.95;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * 84 + 8;
  const y = ((latMax - lat) / (latMax - latMin)) * 78 + 11;
  return {
    left: `${Math.min(92, Math.max(8, x))}%`,
    top: `${Math.min(90, Math.max(10, y))}%`,
  };
}
