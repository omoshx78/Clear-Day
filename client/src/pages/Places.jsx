import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import BackBar from "../components/BackBar.jsx";

export default function Places() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("church");
  const [coords, setCoords] = useState(null);
  const [placeLabel, setPlaceLabel] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPlaceCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (coords) runSearch(coords.lat, coords.lon, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function runSearch(lat, lon, cat) {
    setSearching(true);
    setError("");
    try {
      const data = await api.getNearbyPlaces(cat, lat, lon);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't supported in this browser. Try searching by area name instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        setPlaceLabel("your current location");
        setLocating(false);
        runSearch(latitude, longitude, category);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — check your browser's permission settings, or search by area name below.");
      },
      { timeout: 10000 }
    );
  }

  async function searchByArea(e) {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setSearching(true);
    setError("");
    try {
      const geo = await api.geocodePlace(manualQuery);
      setCoords({ lat: geo.lat, lon: geo.lon });
      setPlaceLabel(geo.displayName);
      await runSearch(geo.lat, geo.lon, category);
    } catch (err) {
      setError(err.message);
      setSearching(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <BackBar fallback="/resources" />
      <div>
        <h1 className="text-2xl font-bold text-ink">Find places near you</h1>
        <p className="text-sm text-muted mt-1">
          Churches, mosques, gyms, cafés, and community centers — real places from
          OpenStreetMap, not curated by us, so coverage can vary by area.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              category === c.id
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-subtle text-muted hover:border-brand-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!coords ? (
        <div className="space-y-3">
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {locating ? "Locating..." : "📍 Use my location"}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-xs text-faint">or</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>
          <form onSubmit={searchByArea} className="flex gap-2">
            <input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Search an area, e.g. Kilimani, Nairobi"
              className="flex-1 rounded-lg border border-subtle px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 rounded-lg transition disabled:opacity-50"
            >
              Search
            </button>
          </form>
        </div>
      ) : (
        <p className="text-xs text-faint">
          Searching near <strong>{placeLabel}</strong>.{" "}
          <button onClick={() => { setCoords(null); setResults(null); setPlaceLabel(""); }} className="text-brand-600 hover:underline">
            Change location
          </button>
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {searching && <p className="text-sm text-faint text-center py-6">Searching...</p>}

      {results && !searching && (
        <div className="space-y-3">
          {results.length === 0 && (
            <p className="text-sm text-faint text-center py-8">
              Nothing found nearby for this category. OpenStreetMap's coverage varies by
              area — try a wider search or a different category.
            </p>
          )}
          {results.map((p) => (
            <a
              key={p.id}
              href={p.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink">{p.name}</p>
                <span className="text-xs text-faint whitespace-nowrap">{p.distanceKm} km</span>
              </div>
              {p.address && <p className="text-sm text-muted mt-1">{p.address}</p>}
              <p className="text-xs text-brand-600 mt-2">Open in Maps ↗</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
