"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Clock, Package, ChefHat, Truck, Home, CheckCircle,
  Search, Loader2, Mail, Hash, ArrowRight,
} from "lucide-react";

const STATUS_ICON: Record<string, React.ElementType> = {
  confirmed:       CheckCircle,
  preparing:       ChefHat,
  ready:           Package,
  out_for_delivery: Truck,
  delivered:       Home,
  cancelled:       Clock,
};

const STATUS_COLOR: Record<string, string> = {
  confirmed:       "bg-blue-100 text-blue-700",
  preparing:       "bg-orange-100 text-orange-700",
  ready:           "bg-green-100 text-green-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered:       "bg-gray-100 text-gray-600",
  cancelled:       "bg-red-100 text-red-600",
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  createdAt: string;
  pickupCode?: string;
  guestName?: string;
  guestEmail?: string;
  items: { id: string; name: string; quantity: number; price: number }[];
};

type SearchMode = "email" | "orderNumber";

export default function OrdersPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("email");
  const [query, setQuery] = useState("");
  const [searchLabel, setSearchLabel] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // If user is logged in, auto-load their orders by email
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user?.email) {
        setMode("email");
        setQuery(d.user.email);
        doSearch("email", d.user.email);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (searchMode: SearchMode, value: string) => {
    const q = value.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setSearchLabel(q);
    try {
      const param = searchMode === "email"
        ? `email=${encodeURIComponent(q)}`
        : `orderNumber=${encodeURIComponent(q.replace(/^#/, ""))}`;
      const res = await fetch(`/api/orders?${param}&limit=20`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(mode, query);
  };

  const switchMode = (m: SearchMode) => {
    setMode(m);
    setQuery("");
    setOrders([]);
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* Hero bar */}
      <div style={{ background: "linear-gradient(135deg, #1A0A00 0%, #3D1200 60%, #7C2D12 100%)" }}
        className="px-4 py-10 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8C38] text-xs font-semibold px-4 py-1.5 rounded-full mb-3 tracking-widest uppercase">
          📦 Order Tracking
        </div>
        <h1 className="text-3xl font-black text-white mb-1">Track Your Orders</h1>
        <p className="text-[#FFB87A] text-sm">Search by email address or order number</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Mode toggle */}
        <div className="flex bg-white rounded-2xl p-1 border border-[#E8D5C0] mb-5 shadow-sm">
          <button
            type="button"
            onClick={() => switchMode("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "email" ? "bg-[#FF6B00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
            }`}
          >
            <Mail size={14} /> Search by Email
          </button>
          <button
            type="button"
            onClick={() => switchMode("orderNumber")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "orderNumber" ? "bg-[#1A0A00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
            }`}
          >
            <Hash size={14} /> Search by Order #
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "email" ? "your@email.com" : "e.g. HFS-1234 or just 1234"}
              type={mode === "email" ? "email" : "text"}
              className="w-full pl-10 pr-4 py-3.5 border border-[#E8D5C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3.5 bg-[#FF6B00] text-white rounded-xl font-bold text-sm hover:bg-[#CC5500] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-orange-200"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
            <p className="text-gray-400 text-sm">Looking up your orders…</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="text-orange-300" size={32} />
            </div>
            <p className="text-[#1A0A00] font-bold text-lg mb-1">No orders found</p>
            <p className="text-gray-400 text-sm mb-5">
              {mode === "email"
                ? `No orders found for ${searchLabel}`
                : `No order matching "${searchLabel}"`}
            </p>
            <button
              onClick={() => router.push("/vendors")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500]"
            >
              Browse Kitchens <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 font-medium">
              <span className="text-[#1A0A00] font-bold">{orders.length}</span> order{orders.length !== 1 ? "s" : ""} found
            </p>
            {orders.map((order) => {
              const Icon = STATUS_ICON[order.status] ?? Clock;
              const colorClass = STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600";
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl border-2 border-[#E8D5C0] p-5 cursor-pointer hover:border-[#FF6B00]/50 hover:shadow-lg hover:shadow-orange-50 transition-all group"
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-[#1A0A00] text-orange-300 text-xs font-bold px-3 py-1 rounded-full">
                          <Hash size={10} /> {order.orderNumber}
                        </span>
                        {isActive && (
                          <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(order.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
                      <Icon size={12} />
                      {order.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="text-sm text-gray-600 mb-3 bg-[#FFF8F0] rounded-xl px-3 py-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="mr-3 text-xs">{item.quantity}× {item.name}</span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs text-gray-400">+{order.items.length - 3} more</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 bg-[#FFF0E0] text-[#7C4A1E] rounded-full capitalize font-medium border border-orange-100">
                        {order.type === "dine-in" ? "🍽 Dine-in" : order.type === "pickup" ? "🥡 Pickup" : "🚚 Delivery"}
                      </span>
                      {order.pickupCode && order.type === "pickup" && (
                        <span className="text-xs px-2.5 py-1 bg-orange-50 text-[#FF6B00] rounded-full font-bold tracking-wider border border-orange-100">
                          Code: {order.pickupCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#FF6B00]">{formatCurrency(order.total)}</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isActive ? "text-[#FF6B00] group-hover:gap-2" : "text-gray-400"}`}>
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
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#E8D5C0]">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="text-orange-200" size={32} />
            </div>
            <p className="text-[#1A0A00] font-semibold mb-1">Find your order</p>
            <p className="text-gray-400 text-sm">
              {mode === "email"
                ? "Enter the email you used when ordering"
                : "Enter your order number from your confirmation SMS"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
