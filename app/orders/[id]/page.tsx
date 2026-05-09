"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, Clock, ChefHat, Package, Truck, Home, Loader2 } from "lucide-react";

const STATUS_STEPS = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle, desc: "We received your order!" },
  { key: "preparing", label: "Being Prepared", icon: ChefHat, desc: "Our chefs are cooking your food" },
  { key: "ready", label: "Ready", icon: Package, desc: "Your order is ready!" },
  { key: "out_for_delivery", label: "On The Way", icon: Truck, desc: "Your order is on its way" },
  { key: "delivered", label: "Delivered", icon: Home, desc: "Enjoy your meal!" },
];

const PICKUP_STEPS = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle, desc: "We received your order!" },
  { key: "preparing", label: "Being Prepared", icon: ChefHat, desc: "Our chefs are cooking your food" },
  { key: "ready", label: "Ready for Pickup", icon: Package, desc: "Come collect your order!" },
  { key: "delivered", label: "Collected", icon: Home, desc: "Thank you!" },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  type OrderData = { id: string; orderNumber: string; type: string; status: string; pickupCode?: string; total: number; subtotal: number; deliveryFee: number; tax: number; estimatedTime: number; items: Array<{ id: string; name: string; quantity: number; price: number }> };
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      setOrder(data.order);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#FF6B00]" size={40} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-500">Order not found.</p>
        </div>
      </div>
    );
  }

  const steps = order.type === "delivery" ? STATUS_STEPS : PICKUP_STEPS;
  const currentStepIdx = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A0A00] mb-2">Track Your Order</h1>
        <p className="text-gray-500 text-sm mb-6">Order #{order.orderNumber}</p>

        {/* Pickup code */}
        {order.pickupCode && order.type === "pickup" && (
          <div className="bg-orange-50 border-2 border-[#FF6B00] rounded-2xl p-5 text-center mb-6">
            <p className="text-sm font-medium text-[#7C4A1E] mb-1">Show this code at the counter</p>
            <p className="text-4xl font-bold text-[#FF6B00] tracking-widest">{order.pickupCode}</p>
          </div>
        )}

        {/* Status tracker */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 mb-6">
          <div className="relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                      done ? "bg-[#FF6B00] text-white shadow-md shadow-orange-200" : "bg-gray-100 text-gray-400"
                    } ${active ? "ring-4 ring-orange-200" : ""}`}>
                      <Icon size={18} />
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${done && idx < currentStepIdx ? "bg-[#FF6B00]" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`font-semibold text-sm ${done ? "text-[#1A0A00]" : "text-gray-400"}`}>{step.label}</p>
                    {active && <p className="text-xs text-[#FF6B00] mt-0.5">{step.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 mb-6">
          <h3 className="font-bold text-[#1A0A00] mb-4">Order Details</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8D5C0] mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>GST</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between font-bold text-[#1A0A00] text-base"><span>Total</span><span className="text-[#FF6B00]">{formatCurrency(order.total)}</span></div>
          </div>
        </div>

        {/* Estimated time */}
        <div className="bg-[#FFF8F0] rounded-2xl border border-[#E8D5C0] p-4 flex items-center gap-3 text-sm">
          <Clock className="text-[#FF6B00] shrink-0" size={20} />
          <div>
            <p className="font-medium text-[#1A0A00]">Estimated {order.type === "delivery" ? "delivery" : "pickup"} time</p>
            <p className="text-gray-500">~{order.estimatedTime} minutes from order time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
