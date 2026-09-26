// Nearest-places finder — churches, mosques, gyms, cafes, community centers.
//
// Deliberately uses OpenStreetMap (Overpass API for the search itself,
// Nominatim for turning a typed address into coordinates) instead of Google
// Places: both are free forever with no API key and no billing account,
// which matches every other cost decision in this app (mock M-Pesa mode,
// free Supabase, PIN instead of paid SMS). The real tradeoff: OSM's data
// coverage is decent in Nairobi and other major towns but can have real
// gaps in smaller areas — a place just might not be mapped. If that
// becomes a problem later, Google Places is the paid upgrade path.

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

// Both Overpass and Nominatim's usage policies ask for a real identifying
// User-Agent rather than a generic one — replace the contact email below
// with a real one you monitor before going live (currently set to the
// support address used elsewhere in this project).
const USER_AGENT = "ClearDay-App/1.0 (contact: info@jazzmedia.co.ke)";

export const PLACE_CATEGORIES = [
  { id: "church", label: "Churches" },
  { id: "mosque", label: "Mosques" },
  { id: "gym", label: "Gyms & fitness" },
  { id: "cafe", label: "Cafés" },
  { id: "community_centre", label: "Community centers" },
];

const OVERPASS_FILTERS = {
  church: '["amenity"="place_of_worship"]["religion"="christian"]',
  mosque: '["amenity"="place_of_worship"]["religion"="muslim"]',
  gym: '["leisure"="fitness_centre"]',
  cafe: '["amenity"="cafe"]',
  community_centre: '["amenity"="community_centre"]',
};

const DEFAULT_NAME = {
  church: "Church",
  mosque: "Mosque",
  gym: "Gym",
  cafe: "Café",
  community_centre: "Community center",
};

// Haversine distance in km between two lat/lon points
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchNearbyPlaces(category, lat, lon, radiusMeters = 5000) {
  const filter = OVERPASS_FILTERS[category];
  if (!filter) throw new Error("Unknown category");

  const query = `[out:json][timeout:25];(node${filter}(around:${radiusMeters},${lat},${lon});way${filter}(around:${radiusMeters},${lat},${lon}););out center 30;`;

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass API request failed (${res.status})`);
  const data = await res.json();

  return (data.elements || [])
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) return null;
      const tags = el.tags || {};
      const addressParts = [tags["addr:street"], tags["addr:city"]].filter(Boolean);
      return {
        id: `${el.type}/${el.id}`,
        name: tags.name || DEFAULT_NAME[category] || "Place",
        lat: elLat,
        lon: elLon,
        distanceKm: Math.round(distanceKm(lat, lon, elLat, elLon) * 10) / 10,
        address: addressParts.length ? addressParts.join(", ") : null,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${elLat},${elLon}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20);
}

export async function geocode(queryText) {
  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(queryText)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim request failed (${res.status})`);
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
}
