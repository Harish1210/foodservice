"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, X, MapPin, Navigation, Loader2, ChefHat,
  Filter, Star, UtensilsCrossed, Clock, ChevronRight, Plus, Pencil, Check,
} from "lucide-react";
import Navbar from "./Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────
type Vendor = {
  id: string; firstName: string | null; lastName: string | null;
  businessName: string | null; businessAddress: string | null;
  lat: number | null; lng: number | null; isOpen: boolean;
  supportsDelivery: boolean; supportsPickup: boolean;
  distance: number | null; menuItemCount: number;
  avgRating: number | null; reviewCount: number;
};
type DishResult = {
  id: string; name: string; price: number; description: string | null;
  image: string | null; isVeg: boolean; isSpicy: boolean;
  vendor: { id: string; name: string; isOpen: boolean; distance: number | null; address: string | null };
};

const GRADIENTS = [
  "from-[#FF6B00] to-[#CC5500]", "from-[#7C2D12] to-[#DC4E0E]",
  "from-[#9A3412] to-[#F97316]", "from-[#C2410C] to-[#FBBF24]",
  "from-[#B45309] to-[#F59E0B]",
];

function vendorName(v: Pick<Vendor, "businessName" | "firstName" | "lastName">) {
  return (v.businessName ?? `${v.firstName ?? ""} ${v.lastName ?? ""}`.trim()) || "Kitchen";
}
function distLabel(d: number | null) {
  if (d === null) return null;
  return d < 1 ? `${Math.round(d * 1000)}m away` : `${d.toFixed(1)}km away`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HomeClient({ session, userSuburb }: { session: unknown; userSuburb?: string | null }) {
  const router = useRouter();
  const addItem           = useCartStore((s) => s.addItem);
  const setSelectedVendor = useCartStore((s) => s.setSelectedVendor);
  const selectedVendorId  = useCartStore((s) => s.selectedVendorId);
  const cartItems         = useCartStore((s) => s.items);

  const [search, setSearch]               = useState("");
  const [vendors, setVendors]             = useState<Vendor[]>([]);
  const [dishes, setDishes]               = useState<DishResult[]>([]);
  const [vendorHits, setVendorHits]       = useState<Vendor[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [locating, setLocating]           = useState(true);   // start true → shows "Locating…" immediately
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [radius, setRadius]               = useState(5);
  const [showOnlyOpen, setShowOnlyOpen]   = useState(false);

  const [locEditMode, setLocEditMode] = useState(false);
  const [locInput, setLocInput]       = useState("");
  const [geocoding, setGeocoding]     = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const locInputRef  = useRef<HTMLInputElement>(null);

  // ── Fetch vendors ────────────────────────────────────────────────────────
  const fetchVendors = useCallback(async (lat?: number, lng?: number, r = radius) => {
    setVendorLoading(true);
    try {
      const p = new URLSearchParams({ radius: String(r) });
      if (lat !== undefined && lng !== undefined) { p.set("lat", String(lat)); p.set("lng", String(lng)); }
      const res  = await fetch(`/api/vendors?${p}`);
      const data = await res.json();
      setVendors(data.vendors ?? []);
    } catch { toast.error("Failed to load kitchens"); }
    finally  { setVendorLoading(false); }
  }, [radius]);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { fetchVendors(); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setUserLocation({ lat, lng });
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } });
          const data = await res.json();
          const a    = data?.address;
          setLocationLabel(a?.suburb ?? a?.city_district ?? a?.city ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        } catch { setLocationLabel(`${lat.toFixed(3)}, ${lng.toFixed(3)}`); }
        setLocating(false);
        fetchVendors(lat, lng, radius);
      },
      async () => {
        // GPS failed — try profile suburb
        if (userSuburb) {
          try {
            const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userSuburb + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
            const data = await res.json();
            if (data?.[0]) {
              const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon);
              setUserLocation({ lat, lng }); setLocationLabel(userSuburb);
              fetchVendors(lat, lng, radius);
              setLocating(false); return;
            }
          } catch { /* fall through */ }
        }
        setLocating(false); fetchVendors();
      },
      { timeout: 8000 }
    );
  }, [fetchVendors, radius]);

  // ── Manual suburb geocode ────────────────────────────────────────────────
  const geocodeSuburb = async () => {
    const q = locInput.trim();
    if (!q) return;
    setGeocoding(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        // Use display name shortened to suburb/city level
        const parts = (data[0].display_name as string).split(",");
        const label = parts[0].trim();
        setUserLocation({ lat, lng });
        setLocationLabel(label);
        setLocEditMode(false);
        setLocInput("");
        fetchVendors(lat, lng, radius);
      } else {
        toast.error(`Couldn't find "${q}" — try a suburb name`);
      }
    } catch { toast.error("Geocoding failed, try again"); }
    finally  { setGeocoding(false); }
  };

  useEffect(() => {
    fetchVendors();
    if (navigator.geolocation) {
      // Try GPS first
      getLocation();
    } else if (userSuburb) {
      // No GPS support — fall back to profile suburb
      (async () => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userSuburb + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
          const data = await res.json();
          if (data?.[0]) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            setUserLocation({ lat, lng });
            setLocationLabel(userSuburb);
            fetchVendors(lat, lng, 5);
          }
        } finally { setLocating(false); }
      })();
    } else {
      setLocating(false);
    }
  /* eslint-disable-next-line */ }, []);

  // ── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 2) { setDishes([]); setVendorHits([]); return; }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q });
        if (userLocation) { p.set("lat", String(userLocation.lat)); p.set("lng", String(userLocation.lng)); p.set("radius", String(radius)); }
        const res  = await fetch(`/api/search?${p}`);
        const data = await res.json();
        setDishes(data.dishes ?? []);
        setVendorHits(data.vendors ?? []);
      } catch { toast.error("Search failed"); }
      finally  { setSearchLoading(false); }
    }, 380);
  }, [search, userLocation, radius]);

  // ── Add dish to cart ─────────────────────────────────────────────────────
  const handleAddToCart = (dish: DishResult) => {
    const store = useCartStore.getState();
    if (store.items.length > 0 && store.selectedVendorId && store.selectedVendorId !== dish.vendor.id) {
      if (!confirm(`Your cart has items from ${store.selectedVendorName}.\nSwitch to ${dish.vendor.name} and clear cart?`)) return;
      store.clearCart();
    }
    setSelectedVendor(dish.vendor.id, dish.vendor.name);
    addItem({ menuItemId: dish.id, name: dish.name, price: dish.price, quantity: 1, isVeg: dish.isVeg });
    toast.success(`${dish.name} added to cart 🛒`);
  };

  // ── Navigate to vendor menu ───────────────────────────────────────────────
  const openVendor = (v: Vendor) => {
    setSelectedVendor(v.id, vendorName(v));
    router.push(`/menu?vendor=${v.id}`);
  };

  const isSearchMode     = search.trim().length >= 2;
  const filteredVendors  = vendors.filter((v) => {
    const matchOpen = !showOnlyOpen || v.isOpen;
    return matchOpen;
  });
  const openCount = vendors.filter((v) => v.isOpen).length;
  const noResults = isSearchMode && !searchLoading && dishes.length === 0 && vendorHits.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* ── HERO + SEARCH ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0D0500 0%,#3D1200 40%,#7C2D12 75%,#1A0A00 100%)" }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-900/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-10 pb-8 flex flex-col items-center text-center">
          {/* Brand mark */}
          <img src="/logo.jpg" alt="Dishly" className="w-14 h-14 rounded-full object-cover ring-4 ring-[#FF6B00]/30 shadow-2xl mb-3" />
          <h1 className="text-4xl md:text-5xl font-black text-white mb-1 tracking-tight">Dishly</h1>
          <p className="text-white/50 text-[11px] font-medium tracking-[0.22em] uppercase mb-6">Every dish, every kitchen, delivered</p>

          {/* Search bar */}
          <div className="w-full max-w-xl mb-4">
            <div className="relative flex items-center">
              {searchLoading
                ? <Loader2 className="absolute left-4 text-[#FF6B00] animate-spin z-10" size={18} />
                : <Search className="absolute left-4 text-gray-400 z-10" size={18} />}
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for a dish or a kitchen…"
                className="w-full pl-11 pr-10 py-4 bg-white rounded-2xl text-[#1A0A00] text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25 shadow-2xl font-medium"
              />
              {search && (
                <button onClick={() => { setSearch(""); inputRef.current?.focus(); }} className="absolute right-4 text-gray-400 hover:text-gray-600 z-10 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Location strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">

            {/* Editable location pill */}
            {locEditMode ? (
              <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-lg">
                <MapPin size={11} className="text-[#FF6B00] shrink-0" />
                <input
                  ref={locInputRef}
                  autoFocus
                  value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") geocodeSuburb(); if (e.key === "Escape") { setLocEditMode(false); setLocInput(""); } }}
                  placeholder="Type suburb…"
                  className="text-xs text-[#1A0A00] font-medium bg-transparent outline-none w-32 placeholder-gray-400"
                />
                <button onClick={geocodeSuburb} disabled={geocoding || !locInput.trim()} className="text-[#FF6B00] hover:text-[#CC5500] disabled:opacity-40 transition-colors">
                  {geocoding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button onClick={() => { setLocEditMode(false); setLocInput(""); }} className="text-gray-400 hover:text-gray-600 transition-colors ml-0.5">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setLocEditMode(true); setTimeout(() => locInputRef.current?.focus(), 50); }}
                className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/70 px-3 py-1.5 rounded-full hover:bg-white/20 hover:border-white/30 transition-all group"
                title="Click to change location"
              >
                {locating ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                <span>{locating ? "Locating…" : locationLabel || "All areas"}</span>
                {!locating && <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />}
              </button>
            )}

            <select
              value={radius}
              onChange={(e) => { const r = parseInt(e.target.value); setRadius(r); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, r); else fetchVendors(undefined, undefined, r); }}
              className="bg-white/10 border border-white/15 text-white/70 px-3 py-1.5 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00] appearance-none cursor-pointer"
            >
              {[2, 5, 10, 20, 50].map((r) => <option key={r} value={r} className="text-[#1A0A00] bg-white">{r} km</option>)}
            </select>
            <button
              onClick={getLocation} disabled={locating}
              className="flex items-center gap-1.5 bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8C38] px-3 py-1.5 rounded-full hover:bg-[#FF6B00]/30 transition-colors disabled:opacity-50 text-xs font-medium"
            >
              <Navigation size={11} /> {locating ? "Locating…" : "Use my location"}
            </button>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/60 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow shadow-green-400" />
              {openCount} open now
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── SEARCH RESULTS MODE ── */}
        {isSearchMode ? (
          searchLoading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
              <p className="text-gray-400 text-sm">Searching…</p>
            </div>
          ) : noResults ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-[#1A0A00] font-bold text-lg mb-1">Nothing found for &ldquo;{search}&rdquo;</p>
              <p className="text-gray-400 text-sm mb-5">Try &ldquo;butter chicken&rdquo;, &ldquo;pizza&rdquo; or a kitchen name</p>
              <button onClick={() => setSearch("")} className="px-6 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-bold hover:bg-[#CC5500] transition-colors">
                Browse all kitchens
              </button>
            </div>
          ) : (
            <div className="space-y-8">

              {/* Dish results */}
              {dishes.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    🍽️ Dishes matching &ldquo;{search}&rdquo; — {dishes.length} found
                  </p>
                  <div className="space-y-3">
                    {dishes.map((dish) => (
                      <div key={dish.id} className="bg-white rounded-2xl border border-[#E8D5C0] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        {/* Thumbnail */}
                        {dish.image ? (
                          <img src={dish.image} alt={dish.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center text-2xl shrink-0">🍽️</div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#1A0A00] text-sm truncate">{dish.name}</h3>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {dish.isVeg   && <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">🌱 VEG</span>}
                            {dish.isSpicy && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">🌶️ SPICY</span>}
                          </div>

                          {/* Vendor line */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <button
                              onClick={() => { setSelectedVendor(dish.vendor.id, dish.vendor.name); router.push(`/menu?vendor=${dish.vendor.id}`); }}
                              className="text-xs text-[#FF6B00] font-semibold hover:underline"
                            >
                              {dish.vendor.name}
                            </button>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${dish.vendor.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {dish.vendor.isOpen ? "● Open" : "● Closed"}
                            </span>
                            {dish.vendor.distance !== null && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Navigation size={9} /> {distLabel(dish.vendor.distance)}
                              </span>
                            )}
                          </div>

                          {dish.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{dish.description}</p>}
                        </div>

                        {/* Price + add */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className="font-black text-[#FF6B00] text-base">${dish.price.toFixed(2)}</span>
                          <button
                            onClick={() => handleAddToCart(dish)}
                            disabled={!dish.vendor.isOpen}
                            title={dish.vendor.isOpen ? `Add ${dish.name}` : "Kitchen is closed"}
                            className="w-9 h-9 bg-[#FF6B00] text-white rounded-xl flex items-center justify-center hover:bg-[#CC5500] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-orange-200"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Kitchen results */}
              {vendorHits.length > 0 && (
                <section>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    🏪 Kitchens matching &ldquo;{search}&rdquo;
                  </p>
                  <div className="space-y-3">
                    {vendorHits.map((v, idx) => {
                      const name = vendorName(v);
                      return (
                        <div
                          key={v.id}
                          onClick={() => openVendor(v)}
                          className="bg-white rounded-2xl border border-[#E8D5C0] p-4 flex items-center gap-4 cursor-pointer hover:border-[#FF6B00]/50 hover:shadow-md transition-all group"
                        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0 group-hover:scale-105 transition-transform`}>
                            {name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#1A0A00] text-sm truncate">{name}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${v.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {v.isOpen ? "● Open now" : "● Closed"}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1"><UtensilsCrossed size={10} />{v.menuItemCount} dishes</span>
                              {v.distance !== null && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Navigation size={9} />{distLabel(v.distance)}</span>}
                              {v.avgRating !== null && v.reviewCount > 0 && (
                                <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><Star size={9} className="fill-amber-500 text-amber-500" />{v.avgRating.toFixed(1)}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#FF6B00] transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )

        ) : (
          /* ── BROWSE MODE — full vendor list ── */
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 font-medium">
                <span className="text-[#1A0A00] font-bold">{filteredVendors.length}</span> kitchen{filteredVendors.length !== 1 ? "s" : ""}
                {userLocation ? ` within ${radius} km` : ""}
              </p>
              <button
                onClick={() => setShowOnlyOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${showOnlyOpen ? "bg-green-600 border-green-600 text-white" : "bg-white border-[#E8D5C0] text-gray-500 hover:border-[#FF6B00]/40"}`}
              >
                <Filter size={12} /> {showOnlyOpen ? "Open only ✓" : "Show all"}
              </button>
            </div>

            {vendorLoading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
                <p className="text-gray-400 text-sm font-medium">Finding kitchens near you…</p>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
                <div className="text-5xl mb-4">🍳</div>
                <p className="text-[#1A0A00] font-bold text-lg mb-1">No kitchens found</p>
                <p className="text-gray-400 text-sm">Try expanding the radius or search for a specific dish</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVendors.map((v, idx) => {
                  const name       = vendorName(v);
                  const isSelected = selectedVendorId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => openVendor(v)}
                      className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg group ${isSelected ? "border-[#FF6B00] shadow-lg shadow-orange-100" : "border-[#E8D5C0] hover:border-[#FF6B00]/50 hover:shadow-orange-50"}`}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className={`w-14 h-14 bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                            {name[0].toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-black text-[#1A0A00] text-base truncate">{name}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${v.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${v.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                                    {v.isOpen ? "Open now" : "Closed"}
                                  </span>
                                  {v.menuItemCount > 0 && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1"><UtensilsCrossed size={11} />{v.menuItemCount} dishes</span>
                                  )}
                                  {v.avgRating !== null && v.reviewCount > 0 && (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                      <Star size={11} className="fill-amber-500 text-amber-500" />
                                      {v.avgRating.toFixed(1)}
                                      <span className="font-normal text-gray-400">({v.reviewCount})</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={18} className={`shrink-0 transition-colors ${isSelected ? "text-[#FF6B00]" : "text-gray-300 group-hover:text-[#FF6B00]"}`} />
                            </div>

                            {v.businessAddress && (
                              <div className="flex items-start gap-1.5 mt-2">
                                <MapPin size={11} className="text-gray-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-gray-500 line-clamp-1">{v.businessAddress}</p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-3">
                              {v.distance !== null && (
                                <span className="text-xs font-semibold bg-orange-50 text-[#FF6B00] px-2.5 py-1 rounded-full border border-orange-100 flex items-center gap-1">
                                  <Navigation size={10} /> {distLabel(v.distance)}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                                <Clock size={10} /> ~20–40 min
                              </span>
                              {v.supportsDelivery && (
                                <span className="text-xs text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">🚚 Delivery</span>
                              )}
                              {v.supportsPickup && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">🏃 Pickup</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="bg-[#FF6B00] px-5 py-2 flex items-center justify-between">
                          <span className="text-white text-xs font-bold flex items-center gap-1.5">
                            <Star size={12} fill="white" /> Currently viewing this kitchen
                          </span>
                          <span className="text-orange-200 text-xs">View menu →</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Become a vendor CTA */}
            <div className="py-10 text-center border-t border-[#E8D5C0] mt-8">
              <p className="text-gray-400 text-sm mb-2">Cook for others? Join as a chef.</p>
              <Link href="/login?role=vendor" className="inline-flex items-center gap-2 text-[#FF6B00] font-bold hover:underline text-sm">
                <ChefHat size={14} /> Become a vendor →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
