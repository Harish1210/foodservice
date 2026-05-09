"use client";
import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, ChefHat, Package, CheckCircle, Clock, AlertCircle, BarChart3, UtensilsCrossed, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const NEXT_STATUS: Record<string, string> = {
  confirmed: "preparing",
  preparing: "ready",
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  confirmed: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Out for Delivery",
  out_for_delivery: "Mark Delivered",
};

type Order = {
  id: string;
  orderNumber: string;
  guestName: string;
  type: string;
  status: string;
  total: number;
  tableNumber?: number;
  pickupCode?: string;
  createdAt: string;
  estimatedTime?: number;
  specialInstructions?: string;
  items: Array<{ id: string; name: string; quantity: number; price: number; notes?: string }>;
};

export default function VendorDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [updating, setUpdating] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [vendorName, setVendorName] = useState<string>("");

  // Check approval status first
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setIsApproved(d.user.isApproved ?? false);
        setVendorName(d.user.businessName ?? d.user.firstName ?? "Vendor");
      } else {
        setIsApproved(false);
      }
    }).catch(() => setIsApproved(false));
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=100");
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isApproved === true) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    } else if (isApproved === false) {
      setLoading(false);
    }
  }, [isApproved, fetchOrders]);

  // Show pending approval screen
  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="bg-white rounded-3xl border-2 border-amber-200 p-10 max-w-md w-full shadow-xl">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={30} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A0A00] mb-2">Awaiting Approval</h1>
            <p className="text-gray-500 text-sm mb-6">
              Hi <strong>{vendorName}</strong>! Your vendor account is pending review by our admin team.
              You will be able to access your dashboard and add menu items once approved.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2 mb-6">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">What happens next?</p>
              <p className="text-sm text-amber-800">1. Our admin reviews your registration details</p>
              <p className="text-sm text-amber-800">2. You receive approval (usually within 24 hours)</p>
              <p className="text-sm text-amber-800">3. You can then add your menu items and start accepting orders</p>
            </div>
            <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-[#FF6B00] font-semibold hover:underline">
              View my profile →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success(`Order updated to ${status}`);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdating(null);
    }
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const filteredOrders = filter === "active" ? activeOrders : filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const stats = {
    active: activeOrders.length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    todayRevenue: orders.filter((o) => {
      const today = new Date();
      const orderDate = new Date(o.createdAt);
      return orderDate.toDateString() === today.toDateString();
    }).reduce((sum, o) => sum + o.total, 0),
  };

  const getMinutesAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return mins < 1 ? "Just now" : `${mins}m ago`;
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF6B00]/50" />
            <div>
              <h1 className="text-white font-bold text-lg">{vendorName || "My Kitchen"}</h1>
              <p className="text-gray-400 text-xs">Vendor Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/vendor/menu" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium">
              <UtensilsCrossed size={15} /> My Menu
            </Link>
            <Link href="/vendor/kitchen" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Package size={15} /> Kitchen Display
            </Link>
            <Link href="/vendor/analytics" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <BarChart3 size={15} /> Analytics
            </Link>
            <Link href="/vendor/hours" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Clock size={15} /> Hours
            </Link>
            <button onClick={fetchOrders} className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#CC5500] transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link href="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ChefHat size={15} /> Profile
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/vendor/menu" className="group bg-gray-900 border border-gray-800 hover:border-[#FF6B00]/60 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-gray-800">
            <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="text-white" size={22} />
            </div>
            <div>
              <p className="text-white font-bold">My Menu</p>
              <p className="text-gray-400 text-xs">Add, edit & manage your dishes</p>
            </div>
          </Link>
          <Link href="/vendor/kitchen" className="group bg-gray-900 border border-gray-800 hover:border-green-500/60 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-gray-800">
            <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Package className="text-white" size={22} />
            </div>
            <div>
              <p className="text-white font-bold">Kitchen Display</p>
              <p className="text-gray-400 text-xs">View live incoming orders</p>
            </div>
          </Link>
          <Link href="/vendor/reviews" className="group bg-gray-900 border border-gray-800 hover:border-yellow-500/60 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-gray-800">
            <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Star className="text-white" size={22} />
            </div>
            <div>
              <p className="text-white font-bold">Reviews</p>
              <p className="text-gray-400 text-xs">See customer feedback</p>
            </div>
          </Link>
          <Link href="/vendor/hours" className="group bg-gray-900 border border-gray-800 hover:border-blue-500/60 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-gray-800">
            <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="text-white" size={22} />
            </div>
            <div>
              <p className="text-white font-bold">Opening Hours</p>
              <p className="text-gray-400 text-xs">Set your kitchen schedule</p>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Orders", value: stats.active, icon: AlertCircle, color: "text-yellow-400" },
            { label: "Preparing", value: stats.preparing, icon: ChefHat, color: "text-orange-400" },
            { label: "Ready", value: stats.ready, icon: Package, color: "text-green-400" },
            { label: "Today Revenue", value: formatCurrency(stats.todayRevenue), icon: BarChart3, color: "text-[#FF6B00]" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={stat.color} size={20} />
                  <span className="text-gray-400 text-sm">{stat.label}</span>
                </div>
                <p className="text-white font-bold text-2xl">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "active", label: "Active Orders" },
            { key: "preparing", label: "Preparing" },
            { key: "ready", label: "Ready" },
            { key: "delivered", label: "Delivered" },
            { key: "all", label: "All Orders" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.key ? "bg-[#FF6B00] text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {f.label}
              {f.key === "active" && stats.active > 0 && (
                <span className="ml-2 bg-white text-[#FF6B00] text-xs font-bold px-1.5 rounded-full">{stats.active}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders grid */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="animate-spin text-[#FF6B00] mx-auto mb-4" size={32} />
            <p className="text-gray-400">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={40} />
            <p className="text-gray-400 text-lg">No orders here!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className={`bg-gray-900 rounded-2xl border overflow-hidden transition-all ${
                order.status === "preparing" ? "border-orange-500/50 shadow-lg shadow-orange-500/10" :
                order.status === "ready" ? "border-green-500/50 shadow-lg shadow-green-500/10" :
                "border-gray-800"
              }`}>
                {/* Card header */}
                <div className="bg-gray-800 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{order.orderNumber}</p>
                    <p className="text-gray-400 text-xs">{getMinutesAgo(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-700 text-gray-300"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.type === "delivery" ? "bg-blue-900 text-blue-300" :
                      order.type === "pickup" ? "bg-purple-900 text-purple-300" :
                      "bg-green-900 text-green-300"
                    }`}>
                      {order.type === "dine-in" ? `Table ${order.tableNumber}` : order.type}
                    </span>
                  </div>
                </div>

                {/* Customer & items */}
                <div className="p-5">
                  <p className="text-white font-medium mb-3">{order.guestName}</p>

                  <div className="space-y-1 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.quantity}× {item.name}</span>
                        {item.notes && <span className="text-gray-500 text-xs italic truncate ml-2">{item.notes}</span>}
                      </div>
                    ))}
                  </div>

                  {order.specialInstructions && (
                    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl px-3 py-2 text-xs text-yellow-300 mb-4">
                      ⚠️ {order.specialInstructions}
                    </div>
                  )}

                  {order.pickupCode && (
                    <div className="bg-orange-900/30 border border-orange-700/50 rounded-xl px-3 py-2 text-xs text-orange-300 mb-4 text-center">
                      Pickup Code: <strong className="text-lg tracking-widest">{order.pickupCode}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Clock size={12} /> Est. {order.estimatedTime ?? 20} mins
                    </div>
                    <span className="text-[#FF6B00] font-bold">{formatCurrency(order.total)}</span>
                  </div>

                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                      disabled={updating === order.id}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 bg-[#FF6B00] text-white hover:bg-[#CC5500]"
                    >
                      {updating === order.id ? "Updating..." : NEXT_LABEL[order.status]}
                    </button>
                  )}

                  {!NEXT_STATUS[order.status] && order.status !== "cancelled" && (
                    <div className="flex items-center justify-center gap-2 py-3 text-green-400 text-sm">
                      <CheckCircle size={16} /> Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
