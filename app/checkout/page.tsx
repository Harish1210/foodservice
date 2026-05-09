"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import { CreditCard, MapPin, CheckCircle, Loader2, ChevronRight, Calendar, UserCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, orderType, tableNumber, specialInstructions, loyaltyPointsToUse, clearCart, getSubtotal, selectedVendorId } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "success">("details");
  const [orderId, setOrderId] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    street: "", suburb: "", postcode: "",
    scheduledAt: "", paymentMethod: "card",
  });

  // Auto-fill from logged-in user's profile
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          const u = d.user;
          setForm((f) => ({
            ...f,
            name: [u.firstName, u.lastName].filter(Boolean).join(" ") || f.name,
            email: u.email || f.email,
            phone: u.phone || f.phone,
            street: u.street || f.street,
            suburb: u.suburb || f.suburb,
            postcode: u.postcode || f.postcode,
          }));
          setPrefilled(true);
        }
      })
      .catch(() => {});
  }, []);

  const subtotal = getSubtotal();
  const deliveryFee = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total = subtotal + deliveryFee - loyaltyDiscount + tax;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill in your name, email and mobile number.");
      return;
    }
    if (orderType === "delivery" && (!form.street || !form.suburb || !form.postcode)) {
      toast.error("Please fill in your delivery address.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.name,
          guestEmail: form.email,
          guestPhone: form.phone,
          type: orderType,
          tableNumber: tableNumber ?? null,
          scheduledAt: form.scheduledAt || null,
          specialInstructions,
          paymentMethod: form.paymentMethod,
          address: orderType === "delivery" ? { street: form.street, suburb: form.suburb, postcode: form.postcode } : null,
          items: items.map((i) => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity, notes: i.notes })),
          subtotal, deliveryFee, discount: loyaltyDiscount, tax, total,
          loyaltyPointsUsed: loyaltyPointsToUse,
          vendorId: selectedVendorId ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");

      setOrderId(data.order.id);
      setPickupCode(data.order.pickupCode ?? "");
      setStep("success");
      clearCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step !== "success") {
    router.push("/cart");
    return null;
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-[#E8D5C0] p-10 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A0A00] mb-2">Order Confirmed! 🎉</h2>
            <p className="text-gray-500 mb-6">Thank you for your order. We&apos;re preparing your food!</p>

            <div className="bg-[#FFF8F0] rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order type</span>
                <span className="font-semibold capitalize text-[#1A0A00]">{orderType}</span>
              </div>
              {pickupCode && (
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Pickup code</span>
                  <span className="font-bold text-2xl text-[#FF6B00] tracking-widest">{pickupCode}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total paid</span>
                <span className="font-bold text-[#FF6B00]">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Est. time</span>
                <span className="font-semibold text-[#1A0A00]">{orderType === "delivery" ? "~40 mins" : "~20 mins"}</span>
              </div>
            </div>

            {orderType === "pickup" && pickupCode && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-orange-700 font-medium">Show this code at the counter:</p>
                <p className="text-4xl font-bold text-[#FF6B00] tracking-widest mt-1">{pickupCode}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => router.push(`/orders/${orderId}`)} className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3 rounded-xl font-semibold hover:bg-[#CC5500]">
                Track Order <ChevronRight size={16} />
              </button>
              <button onClick={() => router.push("/")} className="flex-1 border border-[#E8D5C0] py-3 rounded-xl font-semibold text-[#7C4A1E] hover:bg-[#FFF0E0]">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A0A00] mb-6 flex items-center gap-2">
          <CreditCard className="text-[#FF6B00]" /> Checkout
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Contact */}
              <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1A0A00] flex items-center gap-2">
                    👤 Contact Details
                  </h3>
                  {prefilled && (
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                      <UserCheck size={12} /> Pre-filled from your profile
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: "name", label: "Full Name *", type: "text", placeholder: "John Smith", required: true },
                    { key: "email", label: "Email *", type: "email", placeholder: "john@example.com", required: true },
                    { key: "phone", label: "Mobile Number * (for SMS updates)", type: "tel", placeholder: "+61 400 000 000", required: true },
                  ].map((f) => (
                    <div key={f.key} className={f.key === "email" ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input
                        type={f.type}
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery address */}
              {orderType === "delivery" && (
                <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#1A0A00] flex items-center gap-2">
                      <MapPin size={16} className="text-[#FF6B00]" /> Delivery Address
                    </h3>
                    {prefilled && form.street && (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                        <UserCheck size={12} /> From your profile
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                      <input value={form.street} onChange={(e) => update("street", e.target.value)} placeholder="123 George Street" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Suburb</label>
                        <input value={form.suburb} onChange={(e) => update("suburb", e.target.value)} placeholder="Sydney" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                        <input value={form.postcode} onChange={(e) => update("postcode", e.target.value)} placeholder="2000" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
                <h3 className="font-semibold text-[#1A0A00] mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-[#FF6B00]" /> Schedule Order (Optional)
                </h3>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => update("scheduledAt", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                <p className="text-xs text-gray-400 mt-2">Leave empty for ASAP ordering</p>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
                <h3 className="font-semibold text-[#1A0A00] mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-[#FF6B00]" /> Payment Method
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "card", label: "💳 Card", desc: "Visa / Mastercard" },
                    { key: "cash", label: "💵 Cash", desc: "Pay on arrival" },
                    { key: "applepay", label: "🍎 Apple Pay", desc: "Quick checkout" },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => update("paymentMethod", p.key)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                        form.paymentMethod === p.key ? "border-[#FF6B00] bg-orange-50" : "border-[#E8D5C0] hover:border-[#FF6B00]/50"
                      }`}
                    >
                      <span className="text-lg">{p.label.split(" ")[0]}</span>
                      <span className="text-xs font-medium mt-1">{p.label.split(" ").slice(1).join(" ")}</span>
                      <span className="text-xs text-gray-400">{p.desc}</span>
                    </button>
                  ))}
                </div>

                {form.paymentMethod === "card" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Card Number</label>
                      <input type="text" placeholder="4242 4242 4242 4242 (test)" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">CVC</label>
                        <input type="text" placeholder="123" className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">🔒 Powered by Stripe — your card details are secure</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary sidebar */}
            <div>
              <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5 sticky top-24">
                <h3 className="font-bold text-[#1A0A00] mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm mb-4 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-gray-600">
                      <span className="truncate">{item.quantity}x {item.name}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#E8D5C0] pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {orderType === "delivery" && <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{deliveryFee === 0 ? <span className="text-green-600">FREE</span> : formatCurrency(deliveryFee)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>GST (10%)</span><span>{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between font-bold text-[#1A0A00] text-base pt-1 border-t border-[#E8D5C0]">
                    <span>Total</span>
                    <span className="text-[#FF6B00]">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-5 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-xl font-bold hover:bg-[#CC5500] transition-colors disabled:opacity-60 shadow-lg shadow-orange-200"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                  ) : (
                    <>Place Order — {formatCurrency(total)}</>
                  )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">🔒 Secure checkout</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
