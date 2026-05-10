"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Clock, Package, ChefHat, Truck, Home, CheckCircle,
  Search, Loader2, Mail, Hash, ArrowRight, X,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  confirmed:        { label: "Confirmed",     bg: "bg-blue-50",   text: "text-blue-600" },
  preparing:        { label: "Preparing",     bg: "bg-orange-50", text: "text-orange-600" },
  ready:            { label: "Ready",         bg: "bg-green-50",  text: "text-green-600" },
  out_for_delivery: { label: "On the way",    bg: "bg-purple-50", text: "text-purple-600" },
  delivered:        { label: "Delivered",     bg: "bg-gray-100",  text: "text-gray-500" },
  cancelled:        { label: "Cancelled",     bg: "bg-red-50",    text: "text-red-500" },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  confirmed: CheckCircle, preparing: ChefHat, ready: Package,
  out_for_delivery: Truck, delivered: Home, cancelled: Clock,
};

type Order = {
  id: string; orderNumber: string; type: string; status: string;
  total: number; createdAt: string; pickupCode?: string;
  items: { id: string; name: string; quantity: number; price: number }[];
};
type SearchMode = "email" | "orderNumber";

export default function OrdersPage() {
  const router  = useRouter();
  const [mode,        setMode]        = useState<SearchMode>("email");
  const [query,       setQuery]       = useState("");
  const [searchLabel, setSearchLabel] = useState("");
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.email) {
          setMode("email");
          setQuery(d.user.email);
          doSearch("email", d.user.email);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (m: SearchMode, value: string) => {
    const q = value.trim();
    if (!q) return;
    setLoading(true); setSearched(true); setSearchLabel(q);
    try {
      const param = m === "email"
        ? `email=${encodeURIComponent(q)}`
        : `orderNumber=${encodeURIComponent(q.replace(/^#/, ""))}`;
      const res  = await fetch(`/api/orders?${param}&limit=20`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch { setOrders([]); }
    finally  { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doSearch(mode, query); };
  const switchMode   = (m: SearchMode) => { setMode(m); setQuery(""); setOrders([]); setSearched(false); };

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-20 md:pb-0">
      <Navbar />

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Your Orders</h1>
          <p className="text-gray-500 text-sm">Track current orders or look up order history</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Mode toggle */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-4 shadow-sm">
          <button type="button" onClick={() => switchMode("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "email" ? "bg-[#FF6B00] text-white shadow-md" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Mail size={14} /> By Email
          </button>
          <button type="button" onClick={() => switchMode("orderNumber")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "orderNumber" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Hash size={14} /> By Order #
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "email" ? "your@email.com" : "e.g. HFS-1234"}
              type={mode === "email" ? "email" : "text"}
              className="w-full pl-10 pr-10 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white shadow-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" disabled={loading || !query.trim()}
            className="px-5 py-3.5 bg-[#FF6B00] text-white rounded-2xl font-bold text-sm hover:bg-[#E55A00] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span className="hidden sm:block">Search</span>
          </button>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
            <p className="text-gray-400 text-sm">Looking up your orders…</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-900 font-bold text-lg mb-1">No orders found</p>
            <p className="text-gray-400 text-sm mb-6">
              {mode === "email" ? `No orders for ${searchLabel}` : `No order matching "${searchLabel}"`}
            </p>
            <button onClick={() => router.push("/vendors")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-full text-sm font-bold hover:bg-[#E55A00] transition-colors shadow-sm">
              Browse Kitchens <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && orders.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 font-medium">
              <span className="text-gray-900 font-bold">{orders.length}</span> order{orders.length !== 1 ? "s" : ""} found
            </p>
            {orders.map((order) => {
              const meta    = STATUS_META[order.status] ?? { label: order.status, bg: "bg-gray-100", text: "text-gray-500" };
              const Icon    = STATUS_ICON[order.status] ?? Clock;
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-full">
                          #{order.orderNumber}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-bold animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${meta.bg} ${meta.text}`}>
                      <Icon size={11} /> {meta.label}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 text-xs text-gray-500">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="mr-3">{item.quantity}× {item.name}</span>
                    ))}
                    {order.items.length > 3 && <span className="text-gray-400">+{order.items.length - 3} more</span>}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium capitalize">
                        {order.type === "dine-in" ? "🍽 Dine-in" : order.type === "pickup" ? "🥡 Pickup" : "🚚 Delivery"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-900">{formatCurrency(order.total)}</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 transition-all ${
                        isActive ? "text-[#FF6B00]" : "text-gray-400"
                      } group-hover:gap-2`}>
                        {isActive ? "Track" : "View"} <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Initial empty state */}
        {!searched && !loading && (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-200" size={32} />
            </div>
            <p className="text-gray-900 font-bold mb-1">Find your order</p>
            <p className="text-gray-400 text-sm">
              {mode === "email"
                ? "Enter the email you used when ordering"
                : "Enter your order number from the confirmation SMS"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
