"use client";
import { useEffect, useState, useCallback } from "react";
import { ChefHat, RefreshCw, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import Navbar from "@/components/Navbar";

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
  specialInstructions?: string;
  items: Array<{ id: string; name: string; quantity: number; notes?: string }>;
};

export default function KitchenDisplay() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const res  = await fetch("/api/orders?limit=50");
      const data = await res.json();
      setOrders((data.orders ?? []).filter((o: Order) => ["confirmed", "preparing"].includes(o.status)));
      setLastRefresh(new Date());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
      toast.success(status === "preparing" ? "Started preparing! 🍳" : "Order ready! ✅");
    } catch {
      toast.error("Update failed");
    }
  };

  const getMinutes = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar full-width — outside any padding container */}
      <Navbar />

      {/* Page header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <ChefHat className="text-[#FF6B00] shrink-0" size={22} />
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base sm:text-lg leading-tight">Kitchen Display</h1>
              <p className="text-gray-500 text-[11px] hidden sm:block">Auto-refreshes every 8s</p>
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live pulse */}
            <div className="flex items-center gap-1.5 text-gray-400 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
              <span className="hidden sm:inline">Live</span>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Back to dashboard */}
            <Link
              href="/vendor"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-xs sm:text-sm hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Order count + last refresh — mobile subtitle */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mt-1 sm:hidden">
          <span className="text-[11px] text-gray-500">Auto-refreshes every 8s</span>
          <span className="text-[11px] text-gray-600">
            {orders.length} active order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <RefreshCw className="text-[#FF6B00] animate-spin mb-4" size={36} />
            <p className="text-gray-400">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <ChefHat className="text-gray-600 mb-4" size={60} />
            <p className="text-gray-400 text-xl font-medium">Kitchen is clear!</p>
            <p className="text-gray-600 text-sm mt-1">No active orders right now</p>
            <p className="text-gray-700 text-xs mt-3">Last checked: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        ) : (
          <>
            {/* Summary bar (desktop only) */}
            <div className="hidden sm:flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">
                <span className="text-white font-bold">{orders.length}</span> active order{orders.length !== 1 ? "s" : ""}
                {" · "}
                <span className="text-orange-400 font-medium">{orders.filter(o => o.status === "preparing").length} preparing</span>
                {" · "}
                <span className="text-blue-400 font-medium">{orders.filter(o => o.status === "confirmed").length} waiting</span>
              </p>
              <p className="text-gray-600 text-xs">Updated {lastRefresh.toLocaleTimeString()}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {orders.map((order) => {
                const mins   = getMinutes(order.createdAt);
                const urgent = mins > 20;
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border-2 overflow-hidden ${
                      urgent            ? "border-red-500 shadow-lg shadow-red-500/20"    :
                      order.status === "preparing" ? "border-orange-500 shadow-lg shadow-orange-500/20" :
                      "border-gray-700"
                    } bg-gray-900`}
                  >
                    {/* Card header */}
                    <div className={`px-4 py-3 flex items-center justify-between gap-2 ${
                      urgent            ? "bg-red-900/50"    :
                      order.status === "preparing" ? "bg-orange-900/40" :
                      "bg-gray-800"
                    }`}>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-base leading-tight truncate">
                          #{order.orderNumber.split("-").pop()}
                        </p>
                        <p className="text-xs text-gray-400 capitalize truncate">
                          {order.type === "dine-in" ? `🍽 Table ${order.tableNumber}` :
                           order.type === "pickup"  ? "📦 Pickup" : "🚚 Delivery"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {urgent && <AlertCircle className="text-red-400 shrink-0" size={16} />}
                        <div className={`flex items-center gap-1 font-bold text-sm ${urgent ? "text-red-400" : "text-orange-400"}`}>
                          <Clock size={13} />
                          {mins}m
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="px-4 pt-3 pb-0">
                      <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                        order.status === "preparing" ? "bg-orange-500/20 text-orange-300" : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {order.status === "preparing" ? "🍳 Preparing" : "⏳ Confirmed"}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="p-4">
                      <div className="space-y-2.5 mb-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {item.quantity}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm leading-snug">{item.name}</p>
                              {item.notes && (
                                <p className="text-orange-300 text-xs italic mt-0.5 break-words">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.specialInstructions && (
                        <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl px-3 py-2 text-xs text-yellow-300 mb-4 break-words">
                          ⚠️ {order.specialInstructions}
                        </div>
                      )}

                      {order.pickupCode && (
                        <div className="bg-gray-800 rounded-xl px-3 py-2 text-center mb-4">
                          <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Pickup Code</p>
                          <p className="text-[#FF6B00] font-bold text-xl tracking-widest">{order.pickupCode}</p>
                        </div>
                      )}

                      {/* Customer name */}
                      <p className="text-gray-500 text-xs mb-3 truncate">👤 {order.guestName}</p>

                      {/* Action button */}
                      {order.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                        >
                          🍳 Start Preparing
                        </button>
                      )}
                      {order.status === "preparing" && (
                        <button
                          onClick={() => updateStatus(order.id, "ready")}
                          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                        >
                          ✅ Mark as Ready
                        </button>
                      )}
                    </div>
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
