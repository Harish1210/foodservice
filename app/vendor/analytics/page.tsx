"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, DollarSign, BarChart3, Star, Truck, Package, UtensilsCrossed, RefreshCw } from "lucide-react";
import Link from "next/link";

type Analytics = {
  stats: {
    today: { orders: number; revenue: number };
    week: { orders: number; revenue: number };
    month: { orders: number; revenue: number };
    total: { orders: number; revenue: number };
  };
  popularItems: Array<{ id: string; name: string; count: number; revenue: number }>;
  typeBreakdown: { delivery: number; pickup: number; "dine-in": number };
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  totalMenuItems: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const maxRevenue = data ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white font-bold text-2xl flex items-center gap-2">
              <BarChart3 className="text-[#FF6B00]" /> Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-1">Home Food Service — Sydney</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link href="/vendor" className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-1">
              ← Dashboard
            </Link>
          </div>
        </div>

        {loading || !data ? (
          <div className="text-center py-20">
            <RefreshCw className="animate-spin text-[#FF6B00] mx-auto mb-4" size={32} />
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today Revenue", value: formatCurrency(data.stats.today.revenue), sub: `${data.stats.today.orders} orders`, icon: DollarSign, color: "text-[#FF6B00]" },
                { label: "This Week", value: formatCurrency(data.stats.week.revenue), sub: `${data.stats.week.orders} orders`, icon: TrendingUp, color: "text-blue-400" },
                { label: "This Month", value: formatCurrency(data.stats.month.revenue), sub: `${data.stats.month.orders} orders`, icon: ShoppingBag, color: "text-green-400" },
                { label: "All Time", value: formatCurrency(data.stats.total.revenue), sub: `${data.stats.total.orders} orders`, icon: Star, color: "text-yellow-400" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={stat.color} size={18} />
                      <span className="text-gray-400 text-xs">{stat.label}</span>
                    </div>
                    <p className="text-white font-bold text-xl">{stat.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{stat.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Daily Revenue Chart */}
              <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h3 className="text-white font-bold mb-6">Revenue — Last 7 Days</h3>
                <div className="flex items-end gap-3 h-40">
                  {data.dailyRevenue.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-gray-400 text-xs">{formatCurrency(day.revenue).replace("A$", "$")}</span>
                      <div
                        className="w-full bg-[#FF6B00] rounded-t-lg transition-all hover:bg-orange-400"
                        style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }}
                        title={`${day.orders} orders`}
                      />
                      <span className="text-gray-500 text-xs">{day.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order types */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <h3 className="text-white font-bold mb-6">Order Types</h3>
                <div className="space-y-4">
                  {[
                    { key: "delivery", label: "Delivery", icon: Truck, color: "bg-blue-500" },
                    { key: "pickup", label: "Pickup", icon: Package, color: "bg-purple-500" },
                    { key: "dine-in", label: "Dine In", icon: UtensilsCrossed, color: "bg-green-500" },
                  ].map(({ key, label, icon: Icon, color }) => {
                    const count = data.typeBreakdown[key as keyof typeof data.typeBreakdown];
                    const total = Object.values(data.typeBreakdown).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-gray-400" />
                            <span className="text-gray-300 text-sm">{label}</span>
                          </div>
                          <span className="text-white text-sm font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Popular items */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h3 className="text-white font-bold mb-4">🌟 Most Popular Items</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.popularItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? "bg-yellow-500 text-yellow-900" :
                      idx === 1 ? "bg-gray-400 text-gray-900" :
                      idx === 2 ? "bg-orange-700 text-orange-100" :
                      "bg-gray-700 text-gray-300"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs">{item.count} orders · {formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
