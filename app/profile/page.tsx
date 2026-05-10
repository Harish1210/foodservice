"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Star, Package, ChevronRight, Edit3, Save, X, LogOut, Loader2, Building2, Navigation, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

type UserData = {
  id: string; firstName: string | null; lastName: string | null; email: string;
  phone: string | null; role: string; street: string | null; suburb: string | null;
  state: string | null; postcode: string | null; loyaltyPoints: number; createdAt: string;
  businessName: string | null; businessAddress: string | null;
  lat: number | null; lng: number | null; isOpen: boolean;
};
type Order = {
  id: string; orderNumber: string; type: string; status: string; total: number;
  createdAt: string; items: { id: string; name: string; quantity: number }[];
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700", preparing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700", out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-gray-100 text-gray-600", cancelled: "bg-red-100 text-red-600",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", street: "", suburb: "", state: "NSW", postcode: "", businessName: "", businessAddress: "", lat: "", lng: "", isOpen: true });
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.push("/login"); return; }
        setUser(d.user);
        setForm({ firstName: d.user.firstName ?? "", lastName: d.user.lastName ?? "", phone: d.user.phone ?? "", street: d.user.street ?? "", suburb: d.user.suburb ?? "", state: d.user.state ?? "NSW", postcode: d.user.postcode ?? "", businessName: d.user.businessName ?? "", businessAddress: d.user.businessAddress ?? "", lat: d.user.lat != null ? String(d.user.lat) : "", lng: d.user.lng != null ? String(d.user.lng) : "", isOpen: d.user.isOpen ?? true });
        // Auto-open edit mode if vendor hasn't filled kitchen details
        if (d.user.role === "vendor" && (!d.user.businessName || !d.user.businessAddress)) {
          setEditing(true);
        }
        // Fetch orders for this user
        return fetch(`/api/orders?email=${encodeURIComponent(d.user.email)}&limit=10`);
      })
      .then((r) => r?.json())
      .then((d) => { if (d?.orders) setOrders(d.orders); })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((u) => u ? { ...u, ...data.user } : null);
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            if (user?.role === "vendor") {
              const fullAddress = data.display_name ?? `${addr.road ?? ""} ${addr.suburb ?? addr.city ?? ""} ${addr.state ?? ""} ${addr.postcode ?? ""}`.trim();
              setForm((f) => ({ ...f, businessAddress: fullAddress, lat: String(latitude), lng: String(longitude) }));
              toast.success("Location detected! Review and save your address.");
            } else {
              setForm((f) => ({
                ...f,
                street: [addr.house_number, addr.road].filter(Boolean).join(" "),
                suburb: addr.suburb ?? addr.city_district ?? addr.city ?? "",
                state: addr.state_code ?? addr.state ?? "NSW",
                postcode: addr.postcode ?? "",
                lat: String(latitude),
                lng: String(longitude),
              }));
              toast.success("Location detected! Review and save your address.");
            }
          } else {
            toast.success(`Coordinates set: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          toast.success(`Coordinates set: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        toast.error("Could not detect location. Please enter your address manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F0]"><Navbar />
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#FF6B00]" size={36} /></div>
    </div>
  );

  if (!user) return null;

  const totalSpend = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#FF6B00] rounded-full flex items-center justify-center shadow-lg shadow-orange-200">
              <span className="text-white text-2xl font-bold">
                {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A0A00]">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "My Profile"}
              </h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === "vendor" ? "bg-[#1A0A00] text-orange-300" : "bg-orange-100 text-[#CC5500]"}`}>
                {user.role === "vendor" ? "🍳 Vendor" : "🛍 Customer"}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-xl border border-[#E8D5C0] hover:border-red-200 transition-all">
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {/* Loyalty card — customers only */}
        {user.role === "customer" && (
          <div className="bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-2xl p-6 mb-6 text-white shadow-xl shadow-orange-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-orange-200 text-sm font-medium mb-1">Loyalty Points</p>
                <p className="text-4xl font-bold">{user.loyaltyPoints.toLocaleString()}</p>
                <p className="text-orange-200 text-sm mt-1">≈ {formatCurrency(user.loyaltyPoints * 0.01)} discount available</p>
              </div>
              <Star className="text-orange-300" size={36} />
            </div>
            <div className="mt-4 pt-4 border-t border-orange-400/40 grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-orange-200">Total orders</p><p className="font-bold text-lg">{orders.length}</p></div>
              <div><p className="text-orange-200">Total spent</p><p className="font-bold text-lg">{formatCurrency(totalSpend)}</p></div>
              <div>
                <p className="text-orange-200">Member since</p>
                <p className="font-bold text-lg">{new Date(user.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Vendor quick links */}
        {user.role === "vendor" && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Dashboard", href: "/vendor", icon: "📊" },
              { label: "Kitchen Display", href: "/vendor/kitchen", icon: "🍳" },
              { label: "Menu Items", href: "/vendor/menu", icon: "🍽️" },
            ].map((l) => (
              <button key={l.href} onClick={() => router.push(l.href)}
                className="bg-[#1A0A00] text-white rounded-2xl p-4 text-center hover:bg-[#2D1200] transition-colors">
                <p className="text-2xl mb-1">{l.icon}</p>
                <p className="text-xs font-semibold">{l.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Profile details */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[#1A0A00]">Profile Details</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-[#FF6B00] font-medium hover:underline">
                <Edit3 size={14} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-sm bg-[#FF6B00] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#CC5500] disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                </button>
                <button onClick={() => { setForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", phone: user.phone ?? "", street: user.street ?? "", suburb: user.suburb ?? "", state: user.state ?? "NSW", postcode: user.postcode ?? "", businessName: user.businessName ?? "", businessAddress: user.businessAddress ?? "", lat: user.lat != null ? String(user.lat) : "", lng: user.lng != null ? String(user.lng) : "", isOpen: user.isOpen }); setEditing(false); }}
                  className="text-sm text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Mail, label: "Email", value: user.email, key: null },
              { icon: Phone, label: "Phone", value: form.phone, key: "phone", placeholder: "+61 400 000 000" },
              { icon: User, label: "First Name", value: form.firstName, key: "firstName", placeholder: "First name" },
              { icon: User, label: "Last Name", value: form.lastName, key: "lastName", placeholder: "Last name" },
            ].map(({ icon: Icon, label, value, key, placeholder }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-[#FFF0E0] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-[#FF6B00]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  {editing && key ? (
                    <input value={value} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-[#E8D5C0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  ) : (
                    <p className="text-sm font-medium text-[#1A0A00]">{value || <span className="text-gray-300 font-normal">Not set</span>}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Address fields */}
            {editing && user.role === "customer" && (
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-lg hover:bg-[#FF6B00] hover:text-white transition-colors disabled:opacity-60"
                >
                  {detecting ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  {detecting ? "Detecting..." : "📍 Detect My Location"}
                </button>
              </div>
            )}
            {[
              { icon: MapPin, label: "Street Address", value: form.street, key: "street", placeholder: "123 George St", span: true },
              { icon: MapPin, label: "Suburb", value: form.suburb, key: "suburb", placeholder: "Sydney", span: false },
              { icon: MapPin, label: "Postcode", value: form.postcode, key: "postcode", placeholder: "2000", span: false },
            ].map(({ icon: Icon, label, value, key, placeholder, span }) => (
              <div key={label} className={`flex items-start gap-3 ${span ? "sm:col-span-2" : ""}`}>
                <div className="w-9 h-9 bg-[#FFF0E0] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-[#FF6B00]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  {editing ? (
                    <input value={value} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-[#E8D5C0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  ) : (
                    <p className="text-sm font-medium text-[#1A0A00]">{value || <span className="text-gray-300 font-normal">Not set</span>}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vendor business fields */}
          {user.role === "vendor" && (
            <div className="mt-6 pt-5 border-t border-[#E8D5C0]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kitchen Details</p>
                {editing && (
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detecting}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-lg hover:bg-[#FF6B00] hover:text-white transition-colors disabled:opacity-60"
                  >
                    {detecting ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                    {detecting ? "Detecting..." : "📍 Detect My Location"}
                  </button>
                )}
              </div>

              {/* Required fields warning banner */}
              {(!user.businessName || !user.businessAddress) && (
                <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Required fields missing</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Kitchen Name and Kitchen Address are mandatory before customers can order from you.
                      {!editing && <button onClick={() => setEditing(true)} className="ml-1 underline font-semibold">Edit now →</button>}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Building2, label: "Business / Kitchen Name", value: form.businessName, key: "businessName", placeholder: "e.g. Priya's Home Kitchen", span: true, required: true },
                  { icon: MapPin, label: "Kitchen Address", value: form.businessAddress, key: "businessAddress", placeholder: "123 Main St, Sydney NSW 2000", span: true, required: true },
                  { icon: MapPin, label: "Latitude", value: form.lat, key: "lat", placeholder: "-33.8688", required: false },
                  { icon: MapPin, label: "Longitude", value: form.lng, key: "lng", placeholder: "151.2093", required: false },
                ].map(({ icon: Icon, label, value, key, placeholder, span, required }) => {
                  const isEmpty = required && !value;
                  return (
                  <div key={label} className={`flex items-start gap-3 ${span ? "sm:col-span-2" : ""}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isEmpty ? "bg-red-100" : "bg-[#FFF0E0]"}`}>
                      <Icon size={15} className={isEmpty ? "text-red-500" : "text-[#FF6B00]"} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs mb-0.5 font-medium ${isEmpty ? "text-red-500" : "text-gray-400"}`}>
                        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
                      </p>
                      {editing ? (
                        <input
                          value={value}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className={`w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 border ${
                            isEmpty
                              ? "border-red-300 bg-red-50 focus:ring-red-400 placeholder-red-300"
                              : "border-[#E8D5C0] focus:ring-[#FF6B00]"
                          }`}
                        />
                      ) : (
                        <p className={`text-sm font-medium ${isEmpty ? "text-red-400 italic" : "text-[#1A0A00]"}`}>
                          {value || "Not set — required"}
                        </p>
                      )}
                    </div>
                  </div>
                  );
                })}

                {/* isOpen toggle */}
                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-[#FFF8F0] rounded-xl border border-[#E8D5C0]">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${form.isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                    <div>
                      <p className="text-sm font-semibold text-[#1A0A00]">Kitchen Status</p>
                      <p className="text-xs text-gray-400">{form.isOpen ? "Open — accepting orders" : "Closed — not accepting orders"}</p>
                    </div>
                  </div>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isOpen: !f.isOpen }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isOpen ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isOpen ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${form.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {form.isOpen ? "Open" : "Closed"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent orders — customers only */}
        {user.role === "customer" && (
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A0A00]">Recent Orders</h2>
              <button onClick={() => router.push("/orders")} className="text-sm text-[#FF6B00] font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight size={14} />
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto text-gray-200 mb-2" size={36} />
                <p className="text-gray-400 text-sm">No orders yet</p>
                <button onClick={() => router.push("/")} className="mt-3 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500]">
                  Order now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} onClick={() => router.push(`/orders/${order.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E8D5C0] cursor-pointer hover:border-[#FF6B00]/40 hover:bg-[#FFF8F0] transition-all">
                    <div>
                      <p className="text-sm font-semibold text-[#1A0A00]">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.items.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#FF6B00]">{formatCurrency(order.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
