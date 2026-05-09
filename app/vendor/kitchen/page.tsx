"use client";
import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { ChefHat, RefreshCw, Clock, AlertCircle } from "lucide-react";
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
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      setOrders((data.orders ?? []).filter((o: Order) => ["confirmed", "preparing"].includes(o.status)));
    } catch { /* ignore */ }
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
      toast.success(status === "preparing" ? "Started preparing!" : "Order ready! 🎉");
    } catch {
      toast.error("Update failed");
    }
  };

  const getMinutes = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <Navbar />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="text-[#FF6B00]" size={28} />
          <div>
            <h1 className="text-white font-bold text-xl">Kitchen Display</h1>
            <p className="text-gray-400 text-xs">Live order queue — auto-refreshes every 8s</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
          <button onClick={fetchOrders} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link href="/vendor" className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800">
            ← Dashboard
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <ChefHat className="text-gray-600 mb-4" size={60} />
          <p className="text-gray-400 text-xl font-medium">Kitchen is clear!</p>
          <p className="text-gray-600 text-sm mt-1">No active orders right now</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const mins = getMinutes(order.createdAt);
            const urgent = mins > 20;
            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 overflow-hidden ${
                  urgent ? "border-red-500 shadow-lg shadow-red-500/20" :
                  order.status === "preparing" ? "border-orange-500 shadow-lg shadow-orange-500/20" :
                  "border-gray-700"
                } bg-gray-900`}
              >
                {/* Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  urgent ? "bg-red-900/50" :
                  order.status === "preparing" ? "bg-orange-900/40" :
                  "bg-gray-800"
                }`}>
                  <div>
                    <p className="text-white font-bold">{order.orderNumber.split("-").pop()}</p>
                    <p className="text-xs text-gray-400 capitalize">{order.type === "dine-in" ? `Table ${order.tableNumber}` : order.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgent && <AlertCircle className="text-red-400" size={18} />}
                    <div className={`flex items-center gap-1 text-sm font-bold ${urgent ? "text-red-400" : "text-orange-400"}`}>
                      <Clock size={14} />
                      {mins}m
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {item.quantity}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm leading-tight">{item.name}</p>
                          {item.notes && <p className="text-orange-300 text-xs italic">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.specialInstructions && (
                    <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl p-2 text-xs text-yellow-300 mb-4">
                      ⚠️ {order.specialInstructions}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {order.status === "confirmed" && (
                      <button
                        onClick={() => updateStatus(order.id, "preparing")}
                        className="flex-1 bg-orange-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
                      >
                        🍳 Start
                      </button>
                    )}
                    {order.status === "preparing" && (
                      <button
                        onClick={() => updateStatus(order.id, "ready")}
                        className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        ✅ Ready!
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
