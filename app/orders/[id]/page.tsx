"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle, Clock, ChefHat, Package, Truck, Home,
  Loader2, Star, Send, MessageSquare, PartyPopper, MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const DELIVERY_STEPS = [
  { key: "confirmed",        label: "Order Confirmed",   icon: CheckCircle, desc: "We got your order!" },
  { key: "preparing",        label: "Being Prepared",    icon: ChefHat,     desc: "Our chef is cooking" },
  { key: "ready",            label: "Ready",             icon: Package,     desc: "Your order is ready!" },
  { key: "out_for_delivery", label: "On The Way",        icon: Truck,       desc: "Your order is on its way" },
  { key: "delivered",        label: "Delivered",         icon: Home,        desc: "Enjoy your meal!" },
];
const PICKUP_STEPS = [
  { key: "confirmed", label: "Order Confirmed",   icon: CheckCircle, desc: "We got your order!" },
  { key: "preparing", label: "Being Prepared",    icon: ChefHat,     desc: "Our chef is cooking" },
  { key: "ready",     label: "Ready for Pickup",  icon: Package,     desc: "Come collect your order!" },
  { key: "delivered", label: "Collected",         icon: Home,        desc: "Thank you!" },
];
const DINE_STEPS = [
  { key: "confirmed", label: "Order Confirmed",   icon: CheckCircle, desc: "We got your order!" },
  { key: "preparing", label: "Being Prepared",    icon: ChefHat,     desc: "Our chef is cooking" },
  { key: "ready",     label: "Ready to Serve",    icon: Package,     desc: "On its way to your table!" },
  { key: "delivered", label: "Served",            icon: Home,        desc: "Enjoy your meal!" },
];

type OrderData = {
  id: string; orderNumber: string; type: string; status: string;
  pickupCode?: string; total: number; subtotal: number;
  deliveryFee: number; tax: number; estimatedTime: number;
  vendorId?: string;
  createdAt: string;
  confirmedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  vendor?: { businessName: string | null; businessAddress: string | null } | null;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
};

function StarPicker({ value, onChange, size = 30 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95">
          <Star size={size} className={`transition-colors ${n <= (hover || value) ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-200"}`} />
        </button>
      ))}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [order,    setOrder]    = useState<OrderData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; foodRating?: number; comment?: string } | null>(null);
  const [reviewDone,     setReviewDone]     = useState(false);
  const [rating,         setRating]         = useState(0);
  const [foodRating,     setFoodRating]     = useState(0);
  const [comment,        setComment]        = useState("");
  const [submitting,     setSubmitting]     = useState(false);

  const fetchOrder = async () => {
    try {
      const res  = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      setOrder(data.order ?? null);
    } catch { /**/ }
    finally { setLoading(false); }
  };

  const checkReview = async (orderId: string, vendorId: string) => {
    try {
      const res  = await fetch(`/api/reviews?vendorId=${vendorId}`);
      const data = await res.json();
      const match = (data.reviews ?? []).find(
        (r: { orderId?: string; rating: number; foodRating?: number; comment?: string }) => r.orderId === orderId
      );
      if (match) { setExistingReview(match); setReviewDone(true); }
    } catch { /**/ }
  };

  useEffect(() => {
    fetchOrder();
    const iv = setInterval(fetchOrder, 15000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (order?.status === "delivered" && order.vendorId) checkReview(order.id, order.vendorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.id]);

  const handleMarkCollected = async () => {
    if (!order) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) throw new Error("Failed");
      setOrder((o) => o ? { ...o, status: "delivered" } : o);
      toast.success(order.type === "pickup" ? "Order collected! 🎉" : "Order confirmed received! 🎉");
    } catch { toast.error("Could not update order. Try again."); }
    finally { setMarking(false); }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating)          { toast.error("Please select a star rating"); return; }
    if (!order?.vendorId) { toast.error("Could not find vendor");       return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, vendorId: order.vendorId, rating, foodRating: foodRating || null, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Thank you for your review! 🌟");
      setExistingReview({ rating, foodRating: foodRating || undefined, comment: comment.trim() || undefined });
      setReviewDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <Navbar />
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <Navbar />
      <div className="text-center py-20"><p className="text-gray-500">Order not found.</p></div>
    </div>
  );

  const steps        = order.type === "delivery" ? DELIVERY_STEPS : order.type === "dine-in" ? DINE_STEPS : PICKUP_STEPS;
  const currentIdx   = steps.findIndex((s) => s.key === order.status);
  const isDelivered  = order.status === "delivered";

  const showCollectBtn =
    !isDelivered && (
      (order.type === "pickup"   && order.status === "ready") ||
      (order.type === "delivery" && order.status === "out_for_delivery") ||
      (order.type === "dine-in"  && order.status === "ready")
    );

  const collectLabel =
    order.type === "pickup"  ? "I've Collected My Order ✅" :
    order.type === "dine-in" ? "I've Received My Food ✅"   :
                               "I've Received My Delivery ✅";

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-20 md:pb-6">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Order tracking</p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900">#{order.orderNumber}</h1>
            {!isDelivered && (
              <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Live
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">

        {/* Pickup code */}
        {order.pickupCode && order.type === "pickup" && !isDelivered && (
          <div className="bg-white rounded-2xl border-2 border-[#FF6B00] p-5 text-center shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Show at counter</p>
            <p className="text-5xl font-black text-[#FF6B00] tracking-widest">{order.pickupCode}</p>
          </div>
        )}

        {/* Pickup address */}
        {order.type === "pickup" && order.vendor?.businessAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Pickup Address</p>
              <p className="text-sm font-semibold text-gray-900">{order.vendor.businessAddress}</p>
              {order.vendor.businessName && <p className="text-xs text-gray-400 mt-0.5">{order.vendor.businessName}</p>}
            </div>
          </div>
        )}

        {/* ── Status tracker ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-5">Order Status</p>
          <div>
            {steps.map((step, idx) => {
              const Icon   = step.icon;
              const done   = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={step.key} className="flex items-start gap-4 mb-5 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                      done ? "bg-[#FF6B00] text-white shadow-md shadow-orange-100" : "bg-gray-100 text-gray-300"
                    } ${active ? "ring-4 ring-orange-100" : ""}`}>
                      <Icon size={17} />
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`w-0.5 h-6 mt-1 rounded-full ${done && idx < currentIdx ? "bg-[#FF6B00]" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pt-2">
                    <p className={`font-bold text-sm ${done ? "text-gray-900" : "text-gray-300"}`}>{step.label}</p>
                    {active && <p className="text-xs text-[#FF6B00] font-medium mt-0.5">{step.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collect / received button */}
        {showCollectBtn && (
          <button onClick={handleMarkCollected} disabled={marking}
            className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 shadow-lg shadow-green-100">
            {marking ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {marking ? "Updating…" : collectLabel}
          </button>
        )}

        {/* ETA (while in progress) */}
        {!isDelivered && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Estimated time</p>
              <p className="text-xs text-gray-500">~{order.estimatedTime} minutes from your order time</p>
            </div>
          </div>
        )}

        {/* ── Review section ── */}
        {isDelivered && order.vendorId && (
          <>
            {(existingReview || reviewDone) ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
                <PartyPopper className="mx-auto text-green-500 mb-3" size={32} />
                <h3 className="font-black text-gray-900 text-base mb-1">Thanks for your order!</h3>
                <p className="text-gray-500 text-sm mb-4">Your review has been submitted.</p>
                {existingReview && (
                  <div className="flex justify-center gap-0.5 mb-3">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} size={18} className={n <= existingReview.rating ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-200"} />
                    ))}
                  </div>
                )}
                {existingReview?.comment && (
                  <p className="text-sm text-gray-500 italic mb-4">&ldquo;{existingReview.comment}&rdquo;</p>
                )}
                <Link href="/" className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#E55A00]">
                  Back to Home
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <Star size={18} className="text-[#FF6B00]" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">How was your meal?</h3>
                    <p className="text-xs text-gray-400">Rate your experience to close the order</p>
                  </div>
                </div>
                <form onSubmit={handleReviewSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Overall Experience *</label>
                    <StarPicker value={rating} onChange={setRating} />
                    {rating > 0 && (
                      <p className="text-sm text-[#FF6B00] mt-1.5 font-semibold">
                        {["","Poor 😕","Fair 😐","Good 😊","Great 😄","Excellent! 🤩"][rating]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Food Quality <span className="font-normal text-gray-400">(optional)</span></label>
                    <StarPicker value={foodRating} onChange={setFoodRating} size={24} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Comments <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={comment} onChange={(e) => setComment(e.target.value)}
                      rows={3} maxLength={500}
                      placeholder="What did you love? Any suggestions?"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                    />
                    <p className="text-xs text-gray-400 text-right mt-0.5">{comment.length}/500</p>
                  </div>
                  <button type="submit" disabled={submitting || !rating}
                    className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#E55A00] transition-colors disabled:opacity-50 shadow-md shadow-orange-100">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? "Submitting…" : "Submit Review & Close Order"}
                  </button>
                  <button type="button" onClick={() => router.push("/")}
                    className="w-full py-3 rounded-2xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                    Skip and go home
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* ── Audit Timeline ── */}
        {(() => {
          const fmt = (ts?: string | null) =>
            ts ? new Date(ts).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : null;

          const events: { label: string; ts: string | null | undefined; icon: string }[] = [
            { label: "Order Placed",       ts: order.createdAt,        icon: "🛒" },
            { label: "Order Confirmed",    ts: order.confirmedAt,      icon: "✅" },
            { label: "Preparation Started", ts: order.preparingAt,    icon: "🍳" },
            { label: "Ready",              ts: order.readyAt,          icon: "📦" },
            ...(order.type === "delivery"
              ? [{ label: "Out for Delivery", ts: order.outForDeliveryAt, icon: "🚚" }]
              : []),
            { label: order.type === "pickup" ? "Collected" : order.type === "dine-in" ? "Served" : "Delivered",
              ts: order.deliveredAt, icon: "🎉" },
            ...(order.cancelledAt ? [{ label: "Cancelled", ts: order.cancelledAt, icon: "❌" }] : []),
          ];

          const filled = events.filter((e) => e.ts);
          if (filled.length === 0) return null;

          return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-bold text-gray-900 text-sm mb-4">Order Timeline</p>
              <div className="space-y-3">
                {filled.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-base shrink-0">{e.icon}</div>
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{e.label}</p>
                      <p className="text-xs text-gray-400 tabular-nums shrink-0">{fmt(e.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="font-bold text-gray-900 text-sm mb-4">Order Details</p>
          <div className="space-y-2 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>GST</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between font-black text-gray-900 text-base pt-1">
              <span>Total</span><span className="text-[#FF6B00]">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
