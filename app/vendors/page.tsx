"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MapPin, Navigation, Loader2, ChefHat, Clock, UtensilsCrossed, ChevronRight, Search, RefreshCw } from "lucide-react";
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
};

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
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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
    // Load all vendors initially, then auto-request location
    fetchVendors();
    getLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectVendor = (vendor: Vendor) => {
    const name = vendor.businessName ?? (vendor.firstName || vendor.lastName ? `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim() : "Kitchen");
    setSelectedVendor(vendor.id, name);
    toast.success(`Viewing menu from ${name}`);
    router.push(`/?vendor=${vendor.id}`);
  };

  const filtered = vendors.filter((v) => {
    const name = (v.businessName ?? `${v.firstName} ${v.lastName}`).toLowerCase();
    const addr = (v.businessAddress ?? "").toLowerCase();
    return name.includes(search.toLowerCase()) || addr.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A0A00] mb-1">Find Nearby Kitchens</h1>
          <p className="text-gray-500 text-sm">Home cooks near you — authentic Indian food delivered to your door</p>
        </div>

        {/* Location bar */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-4 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${userLocation ? "bg-green-100" : "bg-orange-100"}`}>
              <MapPin size={16} className={userLocation ? "text-green-600" : "text-[#FF6B00]"} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Your location</p>
              <p className="text-sm font-medium text-[#1A0A00] truncate">
                {locating ? "Detecting..." : userLocation ? locationLabel : "Location not set"}
              </p>
            </div>
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
              className="text-sm border border-[#E8D5C0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
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
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#CC5500] disabled:opacity-60 transition-colors"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              {locating ? "..." : "Locate"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kitchens..."
            className="w-full pl-9 pr-4 py-3 bg-white border border-[#E8D5C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
            <p className="text-gray-400 text-sm">Finding kitchens near you...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8D5C0]">
            <UtensilsCrossed className="mx-auto text-gray-200 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No kitchens found within {radius} km</p>
            <p className="text-gray-400 text-sm mt-1">Try increasing the radius</p>
            <button
              onClick={() => { setRadius(20); if (userLocation) fetchVendors(userLocation.lat, userLocation.lng, 20); else fetchVendors(undefined, undefined, 20); }}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500]"
            >
              <RefreshCw size={14} /> Expand to 20 km
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length} kitchen{filtered.length !== 1 ? "s" : ""} found
              {userLocation ? ` within ${radius} km` : ""}
            </p>
            <div className="space-y-4">
              {filtered.map((vendor) => {
                const name = vendor.businessName ?? (vendor.firstName || vendor.lastName ? `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim() : "Kitchen");
                const isSelected = selectedVendorId === vendor.id;
                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleSelectVendor(vendor)}
                    className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "border-[#FF6B00] bg-orange-50/30" : "border-[#E8D5C0] hover:border-[#FF6B00]/40"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md shadow-orange-200">
                        {name[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-[#1A0A00] text-base">{name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-2 h-2 rounded-full ${vendor.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                              <span className={`text-xs font-medium ${vendor.isOpen ? "text-green-600" : "text-gray-400"}`}>
                                {vendor.isOpen ? "Open now" : "Closed"}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-gray-400 mt-0.5 shrink-0" />
                        </div>

                        {vendor.businessAddress && (
                          <div className="flex items-start gap-1 mt-2">
                            <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-500 line-clamp-1">{vendor.businessAddress}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                          {vendor.distance !== null ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#FF6B00] font-semibold bg-orange-50 px-2.5 py-1 rounded-full">
                              <Navigation size={11} />
                              {vendor.distance < 1
                                ? `${Math.round(vendor.distance * 1000)} m`
                                : `${vendor.distance.toFixed(1)} km`}
                            </div>
                          ) : vendor.lat === null ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                              <MapPin size={11} />
                              Location TBD
                            </div>
                          ) : null}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <ChefHat size={12} />
                            {vendor.menuItemCount} items
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={12} />
                            ~20–40 min
                          </div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-orange-200 flex items-center gap-2">
                        <span className="text-xs text-[#FF6B00] font-semibold">✓ Currently viewing this kitchen</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
