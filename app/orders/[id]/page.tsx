"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, Clock, ChefHat, Package, Truck, Home, Loader2, Star, Send, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_STEPS = [
  { key: "confirmed",       label: "Order Confirmed",  icon: CheckCircle, desc: "We received your order!" },
  { key: "preparing",       label: "Being Prepared",   icon: ChefHat,     desc: "Our chefs are cooking your food" },
  { key: "ready",           label: "Ready",            icon: Package,     desc: "Your order is ready!" },
  { key: "out_for_delivery",label: "On The Way",       icon: Truck,       desc: "Your order is on its way" },
  { key: "delivered",       label: "Delivered",        icon: Home,        desc: "Enjoy your meal!" },
];

const PICKUP_STEPS = [
  { key: "confirmed", label: "Order Confirmed",   icon: CheckCircle, desc: "We received your order!" },
  { key: "preparing", label: "Being Prepared",    icon: ChefHat,     desc: "Our chefs are cooking your food" },
  { key: "ready",     label: "Ready for Pickup",  icon: Package,     desc: "Come collect your order!" },
  { key: "delivered", label: "Collected",         icon: Home,        desc: "Thank you!" },
];

type OrderData = {
  id: string; orderNumber: string; type: string; status: string;
  pickupCode?: string; total: number; subtotal: number;
  deliveryFee: number; tax: number; estimatedTime: number;
  vendorId?: string;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
};

/** Star rating picker */
function StarPicker({ value, onChange, size = 28 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={size}
            className={`transition-colors ${n <= (hover || value) ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

/** Review card (shown when already submitted) */
function ReviewCard({ rating, foodRating, comment }: { rating: number; foodRating?: number; comment?: string }) {
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="text-green-600" size={18} />
        <p className="font-bold text-green-800">Review submitted — thank you!</p>
      </div>
      <div className="flex gap-0.5 mb-1">
        {[1,2,3,4,5].map(n => (
          <Star key={n} size={16} className={n <= rating ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-300"} />
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
      </div>
      {foodRating && (
        <p className="text-xs text-gray-500 mb-1">Food quality: {foodRating}/5</p>
      )}
      {comment && <p className="text-sm text-gray-700 italic">&ldquo;{comment}&rdquo;</p>}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder]   = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  // Review state
  const [existingReview, setExistingReview] = useState<{ rating: number; foodRating?: number; comment?: string } | null>(null);
  const [rating, setRating]       = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [comment, setComment]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = async () => {
    try {
      const res  = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      setOrder(data.order);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // Check for existing review
  const checkReview = async (orderId: string, vendorId: string) => {
    try {
      const res  = await fetch(`/api/reviews?vendorId=${vendorId}`);
      const data = await res.json();
      const found = (data.reviews ?? []).find((r: { order?: { orderNumber?: string }; rating: number; foodRating?: number; comment?: string }) =>
        r.order?.orderNumber && orderId
      );
      // Fetch by orderId directly instead
      const allRes = await fetch(`/api/reviews?vendorId=${vendorId}`);
      const allData = await allRes.json();
      // Find review matching this order
      const match = (allData.reviews ?? []).find((r: { orderId?: string; rating: number; foodRating?: number; comment?: string }) => r.orderId === orderId);
      if (match) setExistingReview(match);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (order?.status === "delivered" && order.vendorId) {
      checkReview(order.id, order.vendorId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error("Please select a rating"); return; }
    if (!order?.vendorId) { toast.error("Could not find vendor"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId:    order.id,
          vendorId:   order.vendorId,
          rating,
          foodRating: foodRating || null,
          comment:    comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Thank you for your review! 🌟");
      setExistingReview({ rating, foodRating: foodRating || undefined, comment: comment.trim() || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F0]"><Navbar />
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#FF6B00]" size={40} />
      </div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-[#FFF8F0]"><Navbar />
      <div className="text-center py-20"><p className="text-gray-500">Order not found.</p></div>
    </div>
  );

  const steps = order.type === "delivery" ? STATUS_STEPS : PICKUP_STEPS;
  const currentStepIdx = steps.findIndex((s) => s.key === order.status);
  const isDelivered = order.status === "delivered";

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A0A00]">Track Your Order</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            Order
            <span className="bg-[#1A0A00] text-orange-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              #{order.orderNumber}
            </span>
          </p>
        </div>

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
              const done   = idx <= currentStepIdx;
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

        {/* ── REVIEW SECTION — shown only after delivery ── */}
        {isDelivered && order.vendorId && (
          <div className="mb-6">
            {existingReview ? (
              <ReviewCard {...existingReview} />
            ) : (
              <div className="bg-white rounded-2xl border-2 border-[#E8D5C0] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Star size={18} className="text-[#FF6B00]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A0A00]">How was your meal?</h3>
                    <p className="text-xs text-gray-400">Your feedback helps our home cooks improve</p>
                  </div>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-5">
                  {/* Overall rating */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Experience *</label>
                    <StarPicker value={rating} onChange={setRating} />
                    {rating > 0 && (
                      <p className="text-xs text-[#FF6B00] mt-1 font-medium">
                        {["", "Poor 😕", "Fair 😐", "Good 😊", "Great 😄", "Excellent! 🤩"][rating]}
                      </p>
                    )}
                  </div>

                  {/* Food quality */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Food Quality</label>
                    <StarPicker value={foodRating} onChange={setFoodRating} size={22} />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Your feedback (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Tell us what you loved (or didn't!) about your meal…"
                      className="w-full border border-[#E8D5C0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                    />
                    <p className="text-xs text-gray-400 text-right mt-0.5">{comment.length}/500</p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !rating}
                    className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#CC5500] transition-colors disabled:opacity-50 shadow-md shadow-orange-200"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 mb-6">
          <h3 className="font-bold text-[#1A0A00] mb-4">Order Details</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8D5C0] mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>GST</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between font-bold text-[#1A0A00] text-base">
              <span>Total</span><span className="text-[#FF6B00]">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Estimated time */}
        {!isDelivered && (
          <div className="bg-[#FFF8F0] rounded-2xl border border-[#E8D5C0] p-4 flex items-center gap-3 text-sm">
            <Clock className="text-[#FF6B00] shrink-0" size={20} />
            <div>
              <p className="font-medium text-[#1A0A00]">Estimated {order.type === "delivery" ? "delivery" : "pickup"} time</p>
              <p className="text-gray-500">~{order.estimatedTime} minutes from order time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
