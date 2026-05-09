"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MapPin, Navigation, Loader2, ChefHat, Clock, UtensilsCrossed, ChevronRight, Search, RefreshCw, Star, Filter, StarHalf } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import toast from "react-hot-toast";

type Vendor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  businessAddress: string | null;
  lat: number;
  lng: number;
  isOpen: boolean;
  distance: number | null;
  menuItemCount: number;
  avgRating: number | null;
  reviewCount: number;
};

// Warm gradient avatars for vendor cards
const AVATAR_GRADIENTS = [
  "from-[#FF6B00] to-[#CC5500]",
  "from-[#7C2D12] to-[#DC4E0E]",
  "from-[#9A3412] to-[#F97316]",
  "from-[#C2410C] to-[#FBBF24]",
  "from-[#B45309] to-[#F59E0B]",
];

export default function VendorsPage() {
  const router = useRouter();
  const { setSelectedVendor, selectedVendorId } = useCartStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(5);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);

  const fetchVendors = async (lat?: number, lng?: number, r = radius) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ radius: String(r) });
      if (lat !== undefined && lng !== undefined) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      const res = await fetch(`/api/vendors?${params}`);
      const data = await res.json();
      setVendors(data.vendors ?? []);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      fetchVendors();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        // Try to get suburb name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data?.address;
          const label = addr?.suburb ?? addr?.city_district ?? addr?.city ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationLabel(label);
        } catch {
          setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
        fetchVendors(latitude, longitude, radius);
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location. Showing all vendors.");
        fetchVendors();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    fetchVendors();
    getLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectVendor = (vendor: Vendor) => {
    const name = vendor.businessName ?? (vendor.firstName || vendor.lastName ? `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim() : "Kitchen");
    setSelectedVendor(vendor.id, name);
    toast.success(`Viewing menu from ${name}`);
    router.push(`/menu?vendor=${vendor.id}`);
  };

  const filtered = vendors.filter((v) => {
    const name = (v.businessName ?? `${v.firstName} ${v.lastName}`).toLowerCase();
    const addr = (v.businessAddress ?? "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || addr.includes(search.toLowerCase());
    const matchesOpen = showOnlyOpen ? v.isOpen : true;
    return matchesSearch && matchesOpen;
  });

  const openCount = vendors.filter((v) => v.isOpen).length;

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D0500 0%, #3D1200 45%, #7C2D12 80%, #1A0A00 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/3 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-orange-900/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8C38] text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">
            🍳 Home Kitchens Near You
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
            Find Your Perfect Kitchen
          </h1>
          <p className="text-[#FFB87A] text-base mb-6">
            Authentic Indian home cooking from local chefs — order fresh, eat happy.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full text-white/80 text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full shadow shadow-green-400" />
              {openCount} kitchens open now
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full text-white/80 text-sm font-medium">
              <ChefHat size={13} /> {vendors.length} total kitchens
            </div>
            {userLocation && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-full text-white/80 text-sm font-medium">
                <MapPin size={13} /> Near {locationLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Location + radius bar */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${userLocation ? "bg-green-100" : "bg-orange-100"}`}>
              {locating
                ? <Loader2 size={16} className="text-[#FF6B00] animate-spin" />
                : <MapPin size={16} className={userLocation ? "text-green-600" : "text-[#FF6B00]"} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Searching near</p>
              <p className="text-sm font-semibold text-[#1A0A00] truncate">
                {locating ? "Detecting your location…" : userLocation ? locationLabel || "Your location" : "Everywhere (no location set)"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={radius}
                onChange={(e) => {
                  const r = parseInt(e.target.value);
                  setRadius(r);
                  if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, r);
                  else fetchVendors(undefined, undefined, r);
                }}
                className="text-sm border border-[#E8D5C0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-[#1A0A00] font-medium"
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
              <button
                onClick={getLocation}
                disabled={locating}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500] disabled:opacity-60 transition-colors shadow-sm shadow-orange-200"
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                {locating ? "Locating…" : "Locate Me"}
              </button>
            </div>
          </div>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kitchens by name or area…"
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8D5C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowOnlyOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${showOnlyOpen ? "bg-green-600 border-green-600 text-white shadow-sm" : "bg-white border-[#E8D5C0] text-gray-500 hover:border-[#FF6B00]/40"}`}
          >
            <Filter size={14} />
            {showOnlyOpen ? "Open only ✓" : "All"}
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">Finding kitchens near you…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="text-orange-300" size={32} />
            </div>
            <p className="text-[#1A0A00] font-bold text-lg mb-1">No kitchens found</p>
            <p className="text-gray-400 text-sm mb-6">
              {search ? `No results for "${search}"` : `No kitchens within ${radius} km`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {search && (
                <button onClick={() => setSearch("")} className="px-5 py-2.5 bg-white border-2 border-[#E8D5C0] rounded-xl text-sm font-semibold text-gray-600 hover:border-[#FF6B00]/40">
                  Clear Search
                </button>
              )}
              <button
                onClick={() => { setRadius(50); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, 50); else fetchVendors(undefined, undefined, 50); }}
                className="flex items-center gap-2 justify-center px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500] shadow-sm"
              >
                <RefreshCw size={14} /> Expand to 50 km
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4 font-medium">
              Showing <span className="text-[#1A0A00] font-bold">{filtered.length}</span> kitchen{filtered.length !== 1 ? "s" : ""}
              {userLocation ? ` within ${radius} km` : ""}
              {showOnlyOpen ? " · open now" : ""}
            </p>
            <div className="space-y-4">
              {filtered.map((vendor, idx) => {
                const name = vendor.businessName ?? (vendor.firstName || vendor.lastName ? `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim() : "Kitchen");
                const isSelected = selectedVendorId === vendor.id;
                const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleSelectVendor(vendor)}
                    className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg group ${
                      isSelected
                        ? "border-[#FF6B00] shadow-lg shadow-orange-100"
                        : "border-[#E8D5C0] hover:border-[#FF6B00]/50 hover:shadow-orange-50"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                          {name[0].toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-black text-[#1A0A00] text-base truncate">{name}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${vendor.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${vendor.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                                  {vendor.isOpen ? "Open now" : "Closed"}
                                </span>
                                {vendor.menuItemCount > 0 && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <UtensilsCrossed size={11} /> {vendor.menuItemCount} dishes
                                  </span>
                                )}
                                {vendor.avgRating !== null && vendor.reviewCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    <Star size={11} className="fill-amber-500 text-amber-500" />
                                    {vendor.avgRating.toFixed(1)}
                                    <span className="font-normal text-gray-400">({vendor.reviewCount})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-[#FF6B00]" : "bg-gray-100 group-hover:bg-orange-100"}`}>
                              <ChevronRight size={16} className={isSelected ? "text-white" : "text-gray-400 group-hover:text-[#FF6B00]"} />
                            </div>
                          </div>

                          {vendor.businessAddress && (
                            <div className="flex items-start gap-1.5 mt-2.5">
                              <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-gray-500 line-clamp-1">{vendor.businessAddress}</p>
                            </div>
                          )}

                          {/* Info pills */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {vendor.distance !== null ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold bg-orange-50 text-[#FF6B00] px-3 py-1 rounded-full border border-orange-100">
                                <Navigation size={10} />
                                {vendor.distance < 1
                                  ? `${Math.round(vendor.distance * 1000)} m away`
                                  : `${vendor.distance.toFixed(1)} km away`}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                <MapPin size={10} /> Location TBD
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                              <Clock size={10} /> ~20–40 min
                            </span>
                            {vendor.isOpen && (
                              <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                🚚 Delivery available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected banner */}
                    {isSelected && (
                      <div className="bg-[#FF6B00] px-5 py-2.5 flex items-center justify-between">
                        <span className="text-white text-xs font-bold flex items-center gap-2">
                          <Star size={13} fill="white" /> Currently viewing this kitchen&apos;s menu
                        </span>
                        <span className="text-orange-200 text-xs">Tap to re-select →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm mb-2">Want to cook for others?</p>
        <a href="/login?role=vendor" className="inline-flex items-center gap-2 text-[#FF6B00] font-bold hover:underline text-sm">
          <ChefHat size={14} /> Become a vendor →
        </a>
      </div>
    </div>
  );
}
