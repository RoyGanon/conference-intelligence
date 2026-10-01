import type { GeographicRegion } from "@/types";
// Explicit demo groupings, not inferred distances. No maps API.
export const geographicRegions: Record<GeographicRegion, { label: string; cities: readonly string[] }> = {
  "uk-southeast": { label: "Southeast England", cities: ["London", "Reading"] },
  benelux: { label: "Benelux", cities: ["Amsterdam", "Rotterdam", "Brussels"] },
  "us-northeast": { label: "US Northeast", cities: ["New York", "Newark"] },
  "us-west": { label: "San Francisco Bay Area", cities: ["San Francisco", "San Jose"] },
  "israel-central": { label: "Central Israel", cities: ["Tel Aviv", "Herzliya"] },
};

