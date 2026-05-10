"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, X, MapPin, Navigation, Loader2, ChefHat,
  Filter, Star, UtensilsCrossed, Clock, ChevronRight,
  Plus, Pencil, Check, Bike, ShoppingBag,
} from "lucide-react";
import Navbar from "./Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

type Vendor = {
  id: string; firstName: string | null; lastName: string | null;
  businessName: string | null; businessAddress: string | null;
  lat: number | null; lng: number | null; isOpen: boolean;
  supportsDelivery: boolean; supportsPickup: boolean;
  distance: number | null; menuItemCount: number;
  avgRating: number | null; reviewCount: number;
};
type DishSuggestion = {
  id: string; name: string; price: number; description: string | null;
  image: string | null; isVeg: boolean; isSpicy: boolean;
  vendor: { id: string; name: string; isOpen: boolean; distance: number | null };
};

const GRADIENTS = [
  "from-orange-500 to-red-600",
  "from-amber-500 to-orange-600",
  "from-red-700 to-orange-500",
  "from-yellow-600 to-amber-700",
  "from-orange-700 to-red-700",
];
const BG_LIGHT = [
  "bg-orange-50", "bg-amber-50", "bg-red-50", "bg-yellow-50", "bg-orange-50",
];

function vendorName(v: Pick<Vendor, "businessName" | "firstName" | "lastName">) {
  return (v.businessName ?? `${v.firstName ?? ""} ${v.lastName ?? ""}`.trim()) || "Kitchen";
}
function distLabel(d: number | null) {
  if (d === null) return null;
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
}

export default function HomeClient({ session, userSuburb }: { session: unknown; userSuburb?: string | null }) {
  const router            = useRouter();
  const addItem           = useCartStore((s) => s.addItem);
  const setSelectedVendor = useCartStore((s) => s.setSelectedVendor);
  const selectedVendorId  = useCartStore((s) => s.selectedVendorId);

  const [search, setSearch]               = useState("");
  const [suggestions, setSuggestions]     = useState<DishSuggestion[]>([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [suggLoading, setSuggLoading]     = useState(false);
  const [vendors, setVendors]             = useState<Vendor[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [locating, setLocating]           = useState(true);
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [radius, setRadius]               = useState(5);
  const [showOnlyOpen, setShowOnlyOpen]   = useState(false);
  const [locEditMode, setLocEditMode]     = useState(false);
  const [locInput, setLocInput]           = useState("");
  const [geocoding, setGeocoding]         = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const locInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocating(false); fetchVendors(); return; }
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
        if (userSuburb) {
          try {
            const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userSuburb + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
            const data = await res.json();
            if (data?.[0]) {
              const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon);
              setUserLocation({ lat, lng }); setLocationLabel(userSuburb);
              fetchVendors(lat, lng, radius); setLocating(false); return;
            }
          } catch { /* fall through */ }
        }
        setLocating(false); fetchVendors();
      },
      { timeout: 8000 }
    );
  }, [fetchVendors, radius, userSuburb]);

  const geocodeSuburb = async () => {
    const q = locInput.trim();
    if (!q) return;
    setGeocoding(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data?.[0]) {
        const lat   = parseFloat(data[0].lat);
        const lng   = parseFloat(data[0].lon);
        const label = (data[0].display_name as string).split(",")[0].trim();
        setUserLocation({ lat, lng }); setLocationLabel(label);
        setLocEditMode(false); setLocInput("");
        fetchVendors(lat, lng, radius);
      } else { toast.error(`Couldn't find "${q}" — try a suburb name`); }
    } catch { toast.error("Geocoding failed, try again"); }
    finally  { setGeocoding(false); }
  };

  useEffect(() => {
    fetchVendors();
    if (navigator.geolocation) {
      getLocation();
    } else if (userSuburb) {
      (async () => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(userSuburb + " Australia")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
          const data = await res.json();
          if (data?.[0]) {
            const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon);
            setUserLocation({ lat, lng }); setLocationLabel(userSuburb);
            fetchVendors(lat, lng, 5);
          }
        } finally { setLocating(false); }
      })();
    } else { setLocating(false); }
  /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    setSuggLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q });
        if (userLocation) { p.set("lat", String(userLocation.lat)); p.set("lng", String(userLocation.lng)); }
        const res  = await fetch(`/api/search?${p}`);
        const data = await res.json();
        setSuggestions(data.dishes ?? []);
        setShowDropdown(true);
      } catch { /* silent */ }
      finally  { setSuggLoading(false); }
    }, 300);
  }, [search, userLocation]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddToCart = (dish: DishSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    const store = useCartStore.getState();
    if (store.items.length > 0 && store.selectedVendorId && store.selectedVendorId !== dish.vendor.id) {
      if (!confirm(`Your cart has items from ${store.selectedVendorName}.\nSwitch to ${dish.vendor.name} and clear cart?`)) return;
      store.clearCart();
    }
    setSelectedVendor(dish.vendor.id, dish.vendor.name);
    addItem({ menuItemId: dish.id, name: dish.name, price: dish.price, quantity: 1, isVeg: dish.isVeg });
    toast.success(`${dish.name} added to cart 🛒`);
    setSearch(""); setShowDropdown(false);
  };

  const handleSelectDish = (dish: DishSuggestion) => {
    setSelectedVendor(dish.vendor.id, dish.vendor.name);
    setSearch(""); setShowDropdown(false);
    router.push(`/menu?vendor=${dish.vendor.id}`);
  };

  const openVendor = (v: Vendor) => {
    setSelectedVendor(v.id, vendorName(v));
    router.push(`/menu?vendor=${v.id}`);
  };

  const filteredVendors = vendors.filter((v) => !showOnlyOpen || v.isOpen);
  const openCount       = vendors.filter((v) => v.isOpen).length;

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <Navbar />

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(150deg,#1A0800 0%,#3D1200 45%,#7C2D12 85%,#1A0A00 100%)" }}
      >
        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 left-1/3 w-80 h-80 bg-[#FF6B00]/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-orange-800/20 rounded-full blur-2xl" />
        </div>

        {/* Chef CTA — desktop floating */}
        <div className="hidden md:block absolute top-4 right-4 z-20">
          <Link href="/login?role=vendor"
            className="group flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-2xl hover:bg-white/20 transition-all">
            <ChefHat size={14} className="text-orange-400" />
            <span>Are you a chef? <span className="text-orange-400">Join →</span></span>
          </Link>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-10 text-center">
          {/* Logo + title */}
          <img src="/logo.jpg" alt="Dishly" className="w-14 h-14 rounded-full object-cover ring-4 ring-[#FF6B00]/30 shadow-2xl mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">Dishly</h1>
          <p className="text-white/50 text-[11px] font-medium tracking-[0.2em] uppercase mb-1">Every dish, every kitchen</p>

          {/* Mobile chef CTA */}
          <Link href="/login?role=vendor"
            className="md:hidden inline-flex items-center gap-1.5 text-orange-400 text-xs font-semibold mb-5 hover:text-orange-300 transition-colors">
            <ChefHat size={12} /> Are you a chef? Join →
          </Link>

          {/* ── SEARCH ── */}
          <div className="w-full relative mt-4">
            <div className="relative flex items-center">
              {suggLoading
                ? <Loader2 className="absolute left-4 text-[#FF6B00] animate-spin z-10" size={18} />
                : <Search className="absolute left-4 text-gray-400 z-10" size={18} />}
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setShowDropdown(false); setSearch(""); } }}
                placeholder="Search dishes, kitchens…"
                className="w-full pl-11 pr-10 py-4 bg-white rounded-2xl text-[#1A0A00] text-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30 shadow-xl font-medium"
              />
              {search && (
                <button onClick={() => { setSearch(""); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus(); }}
                  className="absolute right-4 text-gray-400 hover:text-gray-600 z-10">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
                {suggestions.length === 0 && !suggLoading ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    <div className="text-3xl mb-2">🔍</div>
                    No dishes found for &ldquo;{search}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {suggestions.map((dish) => (
                      <div key={dish.id} onClick={() => handleSelectDish(dish)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 cursor-pointer border-b border-gray-50 last:border-0 group transition-colors">
                        {dish.image
                          ? <img src={dish.image} alt={dish.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                          : <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0">🍽️</div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1A0A00] text-sm truncate group-hover:text-[#FF6B00] transition-colors">{dish.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {dish.isVeg && <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">🌱 VEG</span>}
                            {dish.isSpicy && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">🌶️ SPICY</span>}
                            <span className="text-[10px] text-gray-400 truncate">{dish.vendor.name}</span>
                            <span className={`text-[10px] font-semibold ${dish.vendor.isOpen ? "text-green-600" : "text-gray-400"}`}>
                              {dish.vendor.isOpen ? "● Open" : "● Closed"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className="font-black text-[#FF6B00] text-sm">${dish.price.toFixed(2)}</span>
                          <button onClick={(e) => handleAddToCart(dish, e)} disabled={!dish.vendor.isOpen}
                            className="w-7 h-7 bg-[#FF6B00] text-white rounded-lg flex items-center justify-center hover:bg-[#CC5500] active:scale-95 transition-all disabled:opacity-40">
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── LOCATION ROW ── */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {/* Location pill */}
            {locEditMode ? (
              <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-md">
                <MapPin size={12} className="text-[#FF6B00] shrink-0" />
                <input ref={locInputRef} autoFocus value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") geocodeSuburb(); if (e.key === "Escape") { setLocEditMode(false); setLocInput(""); } }}
                  placeholder="Enter suburb…"
                  className="text-xs text-[#1A0A00] font-medium bg-transparent outline-none w-28 placeholder-gray-400" />
                <button onClick={geocodeSuburb} disabled={geocoding || !locInput.trim()} className="text-[#FF6B00] disabled:opacity-40">
                  {geocoding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button onClick={() => { setLocEditMode(false); setLocInput(""); }} className="text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button onClick={() => setLocEditMode(true)}
                className="flex items-center gap-1.5 bg-white/12 border border-white/20 text-white/80 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-xs group">
                {locating ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} className="text-orange-400" />}
                <span className="max-w-[120px] truncate">{locating ? "Detecting…" : locationLabel || "All areas"}</span>
                {!locating && <Pencil size={9} className="opacity-50 group-hover:opacity-100 transition-opacity ml-0.5" />}
              </button>
            )}

            {/* Radius picker */}
            <select value={radius}
              onChange={(e) => { const r = parseInt(e.target.value); setRadius(r); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, r); else fetchVendors(undefined, undefined, r); }}
              className="bg-white/12 border border-white/20 text-white/80 px-3 py-1.5 rounded-full text-xs focus:outline-none cursor-pointer appearance-none"
            >
              {[2, 5, 10, 20, 50].map((r) => <option key={r} value={r} className="text-[#1A0A00] bg-white">{r} km</option>)}
            </select>

            {/* Use location */}
            <button onClick={getLocation} disabled={locating}
              className="flex items-center gap-1 bg-[#FF6B00]/25 border border-[#FF6B00]/40 text-orange-300 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-[#FF6B00]/40 active:scale-95 transition-all disabled:opacity-50">
              <Navigation size={11} /> {locating ? "Locating…" : "Near me"}
            </button>

            {/* Open badge */}
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/60 px-3 py-1.5 rounded-full text-xs">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {openCount} open
            </span>
          </div>
        </div>
      </div>

      {/* ── QUICK FILTERS ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <button onClick={() => setShowOnlyOpen(false)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${!showOnlyOpen ? "bg-[#1A0A00] border-[#1A0A00] text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <UtensilsCrossed size={12} /> All Kitchens
          </button>
          <button onClick={() => setShowOnlyOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${showOnlyOpen ? "bg-green-600 border-green-600 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <span className="w-1.5 h-1.5 bg-current rounded-full" /> Open Now
          </button>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <span className="shrink-0 text-xs text-gray-400 font-medium">{filteredVendors.length} kitchen{filteredVendors.length !== 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <select value={radius}
            onChange={(e) => { const r = parseInt(e.target.value); setRadius(r); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, r); else fetchVendors(undefined, undefined, r); }}
            className="shrink-0 text-xs border border-gray-200 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-gray-600 bg-white font-medium">
            {[2, 5, 10, 20, 50].map((r) => <option key={r} value={r}>Within {r} km</option>)}
          </select>
        </div>
      </div>

      {/* ── KITCHEN LIST ── */}
      <div className="max-w-2xl mx-auto px-4 py-5">

        {vendorLoading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center animate-pulse">
              <ChefHat size={28} className="text-[#FF6B00]" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Finding kitchens near you…</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
            <div className="text-5xl mb-3">🍳</div>
            <p className="text-[#1A0A00] font-bold text-lg mb-1">No kitchens found</p>
            <p className="text-gray-400 text-sm mb-5">Try expanding the radius or search for a specific dish</p>
            <button onClick={() => { setRadius(50); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, 50); else fetchVendors(undefined, undefined, 50); }}
              className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#CC5500] active:scale-95 transition-all shadow-md shadow-orange-200">
              <Filter size={14} /> Expand to 50 km
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVendors.map((v, idx) => {
              const name       = vendorName(v);
              const isSelected = selectedVendorId === v.id;
              const gradient   = GRADIENTS[idx % GRADIENTS.length];
              const bgLight    = BG_LIGHT[idx % BG_LIGHT.length];

              return (
                <div key={v.id} onClick={() => openVendor(v)}
                  className={`bg-white rounded-3xl overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${
                    isSelected
                      ? "ring-2 ring-[#FF6B00] shadow-xl shadow-orange-100"
                      : "shadow-md shadow-gray-200/80 hover:shadow-xl hover:shadow-orange-100/60"
                  }`}
                >
                  {/* ── Card header band ── */}
                  <div className={`h-3 bg-gradient-to-r ${gradient} ${!v.isOpen ? "opacity-40" : ""}`} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg ${!v.isOpen ? "opacity-60" : ""}`}>
                        {name[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-black text-base leading-tight ${v.isOpen ? "text-[#1A0A00]" : "text-gray-400"}`}>
                            {name}
                          </h3>
                          <ChevronRight size={16} className={`shrink-0 mt-0.5 transition-colors ${isSelected ? "text-[#FF6B00]" : "text-gray-300"}`} />
                        </div>

                        {/* Status + rating row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${v.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${v.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                            {v.isOpen ? "Open now" : "Closed"}
                          </span>
                          {v.avgRating !== null && v.reviewCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Star size={10} className="fill-amber-500 text-amber-500" />
                              {v.avgRating.toFixed(1)}
                              <span className="font-normal text-gray-400">({v.reviewCount})</span>
                            </span>
                          )}
                          {v.menuItemCount > 0 && (
                            <span className="text-[11px] text-gray-400">{v.menuItemCount} dishes</span>
                          )}
                        </div>

                        {/* Address */}
                        {v.businessAddress && (
                          <p className="text-xs text-gray-400 line-clamp-1 flex items-center gap-1 mb-2">
                            <MapPin size={10} className="shrink-0 text-gray-300" />
                            {v.businessAddress}
                          </p>
                        )}

                        {/* Pills row */}
                        <div className="flex flex-wrap gap-1.5">
                          {v.distance !== null && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${bgLight} text-[#FF6B00] border border-orange-100`}>
                              <Navigation size={9} /> {distLabel(v.distance)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                            <Clock size={9} /> 20–40 min
                          </span>
                          {v.supportsDelivery && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                              <Bike size={9} /> Delivery
                            </span>
                          )}
                          {v.supportsPickup && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                              <ShoppingBag size={9} /> Pickup
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected banner */}
                  {isSelected && (
                    <div className="bg-[#FF6B00] px-4 py-2 flex items-center justify-between">
                      <span className="text-white text-xs font-bold flex items-center gap-1.5">
                        <Star size={11} fill="white" /> Viewing this kitchen
                      </span>
                      <span className="text-orange-200 text-xs font-medium">View menu →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
