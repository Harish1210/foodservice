"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Clock, Package, ChefHat, Truck, Home, CheckCircle, Search, Loader2 } from "lucide-react";

const STATUS_ICON: Record<string, React.ElementType> = {
  confirmed: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  out_for_delivery: Truck,
  delivered: Home,
  cancelled: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
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

export default function OrdersPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    setSearchEmail(email.trim());
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email.trim())}&limit=20`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A0A00] mb-2">My Orders</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your email to view your order history</p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-9 pr-4 py-3 border border-[#E8D5C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-semibold text-sm hover:bg-[#CC5500] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Search
          </button>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
          </div>
        )}

        {!loading && searched && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8D5C0]">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No orders found for {searchEmail}</p>
            <p className="text-gray-400 text-sm mt-1">Try a different email or place your first order!</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#CC5500]"
            >
              Browse Menu
            </button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? "s" : ""} found</p>
            {orders.map((order) => {
              const Icon = STATUS_ICON[order.status] ?? Clock;
              const colorClass = STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600";
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl border border-[#E8D5C0] p-5 cursor-pointer hover:shadow-md hover:border-[#FF6B00]/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-[#1A0A00]">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
                        <Icon size={12} />
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="mr-2">{item.quantity}x {item.name}</span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-gray-400">+{order.items.length - 3} more</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 bg-[#FFF0E0] text-[#7C4A1E] rounded-full capitalize font-medium">{order.type}</span>
                      {order.pickupCode && order.type === "pickup" && (
                        <span className="text-xs px-2 py-1 bg-orange-50 text-[#FF6B00] rounded-full font-bold tracking-wider">
                          Code: {order.pickupCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#FF6B00]">{formatCurrency(order.total)}</span>
                      {isActive && (
                        <span className="text-xs text-[#FF6B00] font-medium">Track →</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searched && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8D5C0]">
            <Package className="mx-auto text-gray-200 mb-3" size={48} />
            <p className="text-gray-400">Enter your email above to see your orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
