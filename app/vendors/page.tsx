"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  MapPin, Navigation, Loader2, ChefHat, Clock,
  UtensilsCrossed, ChevronRight, Search, RefreshCw, Star, Filter, X,
} from "lucide-react";
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

export default function VendorsPage() {
  const router = useRouter();
  const { setSelectedVendor, selectedVendorId } = useCartStore();

  const [vendors,       setVendors]       = useState<Vendor[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [userLocation,  setUserLocation]  = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [search,        setSearch]        = useState("");
  const [radius,        setRadius]        = useState(5);
  const [showOnlyOpen,  setShowOnlyOpen]  = useState(false);

  const fetchVendors = async (lat?: number, lng?: number, r = radius) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ radius: String(r) });
      if (lat !== undefined && lng !== undefined) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
      const res  = await fetch(`/api/vendors?${params}`);
      const data = await res.json();
      setVendors(data.vendors ?? []);
    } catch { toast.error("Failed to load vendors"); }
    finally { setLoading(false); }
  };

  const getLocation = () => {
    if (!navigator.geolocation) { fetchVendors(); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data?.address;
          setLocationLabel(addr?.suburb ?? addr?.city_district ?? addr?.city ?? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        } catch {
          setLocationLabel(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        }
        setLocating(false);
        fetchVendors(latitude, longitude, radius);
      },
      () => { setLocating(false); fetchVendors(); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => { fetchVendors(); getLocation(); /* eslint-disable-next-line */ }, []);

  const handleSelectVendor = (vendor: Vendor) => {
    const name = (vendor.businessName ?? [vendor.firstName, vendor.lastName].filter(Boolean).join(" ")) || "Kitchen";
    setSelectedVendor(vendor.id, name);
    toast.success(`Viewing menu from ${name}`);
    router.push(`/menu?vendor=${vendor.id}`);
  };

  const filtered = vendors.filter((v) => {
    const name = (v.businessName ?? `${v.firstName} ${v.lastName}`).toLowerCase();
    const addr = (v.businessAddress ?? "").toLowerCase();
    return (name.includes(search.toLowerCase()) || addr.includes(search.toLowerCase())) &&
           (!showOnlyOpen || v.isOpen);
  });

  const openCount = vendors.filter((v) => v.isOpen).length;

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-20 md:pb-0">
      <Navbar />

      {/* ── Hero ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
            Find a Kitchen
          </h1>
          <p className="text-gray-500 text-sm mb-5">
            {openCount > 0
              ? <><span className="text-green-600 font-bold">{openCount} open now</span> · {vendors.length} kitchens near you</>
              : `${vendors.length} kitchens`
            }
            {userLocation && locationLabel && (
              <> · <span className="text-gray-700 font-medium">{locationLabel}</span></>
            )}
          </p>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search kitchens by name or area…"
                className="w-full pl-10 pr-10 py-3 bg-gray-100 border-0 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-gray-900 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowOnlyOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                showOnlyOpen
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Filter size={14} />
              {showOnlyOpen ? "Open ✓" : "Filter"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">

        {/* Location bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 shadow-sm flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${userLocation ? "bg-green-50" : "bg-gray-50"}`}>
            {locating
              ? <Loader2 size={15} className="text-[#FF6B00] animate-spin" />
              : <MapPin size={15} className={userLocation ? "text-green-600" : "text-gray-400"} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Showing kitchens near</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {locating ? "Detecting location…" : userLocation ? (locationLabel || "Your location") : "Everywhere"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={radius}
              onChange={(e) => {
                const r = parseInt(e.target.value); setRadius(r);
                if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, r);
                else fetchVendors(undefined, undefined, r);
              }}
              className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-gray-700 font-medium"
            >
              {[2,5,10,20,50].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
            <button onClick={getLocation} disabled={locating}
              className="flex items-center gap-1 px-3 py-2 bg-[#FF6B00] text-white rounded-xl text-xs font-bold hover:bg-[#E55A00] disabled:opacity-60 transition-all">
              {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              {locating ? "…" : "Locate"}
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#FF6B00]" size={28} />
            <p className="text-gray-400 text-sm">Finding kitchens near you…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="text-gray-300" size={28} />
            </div>
            <p className="text-gray-900 font-bold text-base mb-1">No kitchens found</p>
            <p className="text-gray-400 text-sm mb-6">
              {search ? `No results for "${search}"` : `No kitchens within ${radius} km`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {search && (
                <button onClick={() => setSearch("")}
                  className="px-5 py-2.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-200">
                  Clear Search
                </button>
              )}
              <button
                onClick={() => { setRadius(50); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, 50); else fetchVendors(undefined, undefined, 50); }}
                className="flex items-center gap-2 justify-center px-5 py-2.5 bg-[#FF6B00] text-white rounded-full text-sm font-bold hover:bg-[#E55A00]">
                <RefreshCw size={13} /> Expand to 50 km
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium mb-4">
              <span className="text-gray-700 font-bold">{filtered.length}</span> kitchen{filtered.length !== 1 ? "s" : ""}
              {userLocation ? ` within ${radius} km` : ""}
              {showOnlyOpen ? " · open now" : ""}
            </p>
            <div className="space-y-3">
              {filtered.map((vendor) => {
                const name       = (vendor.businessName ?? [vendor.firstName, vendor.lastName].filter(Boolean).join(" ")) || "Kitchen";
                const isSelected = selectedVendorId === vendor.id;
                const initial    = name[0].toUpperCase();

                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleSelectVendor(vendor)}
                    className={`bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md group ${
                      isSelected ? "border-[#FF6B00] shadow-md" : "border-gray-100 shadow-sm hover:border-gray-200"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 ${
                          vendor.isOpen
                            ? "bg-gradient-to-br from-[#FF6B00] to-[#E55A00]"
                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                        }`}>
                          {initial}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-black text-gray-900 text-base truncate">{name}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  vendor.isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${vendor.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                                  {vendor.isOpen ? "Open" : "Closed"}
                                </span>
                                {vendor.avgRating !== null && vendor.reviewCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    <Star size={10} className="fill-amber-500 text-amber-500" />
                                    {vendor.avgRating.toFixed(1)}
                                    <span className="font-normal text-gray-400">({vendor.reviewCount})</span>
                                  </span>
                                )}
                                {vendor.menuItemCount > 0 && (
                                  <span className="text-xs text-gray-400">{vendor.menuItemCount} dishes</span>
                                )}
                              </div>
                            </div>
                            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              isSelected ? "bg-[#FF6B00]" : "bg-gray-100 group-hover:bg-orange-50"
                            }`}>
                              <ChevronRight size={14} className={isSelected ? "text-white" : "text-gray-400 group-hover:text-[#FF6B00]"} />
                            </div>
                          </div>

                          {vendor.businessAddress && (
                            <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
                              <MapPin size={11} className="mt-0.5 shrink-0 text-gray-300" />
                              <span className="line-clamp-1">{vendor.businessAddress}</span>
                            </p>
                          )}

                          {/* Info pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            {vendor.distance !== null ? (
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                {vendor.distance < 1 ? `${Math.round(vendor.distance * 1000)} m` : `${vendor.distance.toFixed(1)} km`}
                              </span>
                            ) : null}
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                              <Clock size={9} /> ~20–40 min
                            </span>
                            {vendor.isOpen && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-50">
                                🚚 Delivery
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="bg-[#FF6B00] px-4 py-2 flex items-center justify-between">
                        <span className="text-white text-xs font-bold">Currently viewing this kitchen&apos;s menu</span>
                        <span className="text-orange-100 text-xs">Tap to re-select</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer CTA */}
        <div className="py-12 text-center">
          <p className="text-gray-400 text-sm mb-1">Want to cook for others?</p>
          <a href="/login?role=vendor" className="inline-flex items-center gap-1.5 text-[#FF6B00] font-bold hover:underline text-sm">
            <ChefHat size={13} /> Become a vendor →
          </a>
        </div>
      </div>
    </div>
  );
}
