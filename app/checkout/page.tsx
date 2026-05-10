"use client";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import { CreditCard, MapPin, CheckCircle, Loader2, ChevronRight, Calendar, UserCheck, ShieldCheck, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, orderType, tableNumber, specialInstructions, loyaltyPointsToUse, clearCart, getSubtotal, selectedVendorId } = useCartStore();

  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState<"details" | "otp" | "success">("details");
  const [orderId,    setOrderId]    = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [prefilled,  setPrefilled]  = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // OTP state
  const [otpDigits,    setOtpDigits]    = useState(["", "", "", "", "", ""]);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [otpError,     setOtpError]     = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    street: "", suburb: "", postcode: "",
    scheduledAt: "", paymentMethod: "card",
  });

  useEffect(() => {
    if (items.length === 0 && step !== "success" && step !== "otp") {
      router.push("/cart");
    }
  }, [items.length, step, router]);

  // Check login status + prefill
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          const u = d.user;
          setIsLoggedIn(true);
          setForm((f) => ({
            ...f,
            name:     [u.firstName, u.lastName].filter(Boolean).join(" ") || f.name,
            email:    u.email    || f.email,
            phone:    u.phone    || f.phone,
            street:   u.street   || f.street,
            suburb:   u.suburb   || f.suburb,
            postcode: u.postcode || f.postcode,
          }));
          setPrefilled(true);
        }
      })
      .catch(() => {});
  }, []);

  // Web OTP API — auto-fill on Android Chrome
  useEffect(() => {
    if (step !== "otp" || typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get: (opts: unknown) => Promise<{ code: string }> })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((credential) => {
        if (credential?.code) {
          const digits = credential.code.slice(0, 6).split("");
          setOtpDigits(digits.concat(Array(6 - digits.length).fill("")));
          handleVerifyOtp(credential.code);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const subtotal       = getSubtotal();
  const deliveryFee    = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax            = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total          = subtotal + deliveryFee - loyaltyDiscount + tax;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Place order ─────────────────────────────────────────────────────────────
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
          guestName: form.name, guestEmail: form.email, guestPhone: form.phone,
          type: orderType, tableNumber: tableNumber ?? null,
          scheduledAt: form.scheduledAt || null, specialInstructions,
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
      clearCart();

      if (isLoggedIn) {
        // Already logged in — go straight to success
        setStep("success");
      } else {
        // Send OTP and move to verification step
        await sendOtp();
        setStep("otp");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Send / resend OTP ───────────────────────────────────────────────────────
  const sendOtp = async () => {
    await fetch("/api/auth/send-otp", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
    });
  };

  const handleResend = async () => {
    setOtpResending(true);
    setOtpError("");
    setOtpDigits(["", "", "", "", "", ""]);
    try {
      await sendOtp();
      toast.success("New code sent!");
      otpRefs.current[0]?.focus();
    } catch { toast.error("Could not resend — try again"); }
    finally { setOtpResending(false); }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (code?: string) => {
    const otp = (code ?? otpDigits.join("")).trim();
    if (otp.length !== 6) return;
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Invalid code"); return; }
      toast.success(`Welcome, ${data.user?.firstName ?? ""}! 🎉`);
      setStep("success");
    } catch { setOtpError("Something went wrong — try again"); }
    finally { setOtpVerifying(false); }
  };

  // ── OTP input key handling ──────────────────────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...otpDigits];
    next[idx]   = digit;
    setOtpDigits(next);
    setOtpError("");
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) handleVerifyOtp(next.join(""));
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setOtpDigits(digits);
    if (pasted.length === 6) handleVerifyOtp(pasted);
    else otpRefs.current[pasted.length]?.focus();
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (items.length === 0 && step === "details") return null;

  // ── OTP verification screen ─────────────────────────────────────────────────
  if (step === "otp") {
    const maskedPhone = form.phone.replace(/(\d{4})(\d+)(\d{3})/, "$1 •••• $3");
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="max-w-sm mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">

            {/* Icon */}
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={32} className="text-[#FF6B00]" />
            </div>

            <h2 className="text-xl font-bold text-[#1A0A00] mb-1">Verify your number</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              We sent a 6-digit code to<br />
              <span className="font-semibold text-[#1A0A00]">{maskedPhone}</span>
            </p>

            {/* 6-digit boxes */}
            <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  autoFocus={i === 0}
                  className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all ${
                    otpError
                      ? "border-red-400 bg-red-50 text-red-600"
                      : d
                        ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                        : "border-[#E8D5C0] text-[#1A0A00] focus:border-[#FF6B00]"
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            {otpError && (
              <p className="text-red-500 text-sm mb-3 font-medium">{otpError}</p>
            )}

            {/* Verifying spinner */}
            {otpVerifying && (
              <div className="flex items-center justify-center gap-2 text-[#FF6B00] text-sm mb-3">
                <Loader2 size={16} className="animate-spin" /> Verifying…
              </div>
            )}

            {/* Verify button (manual fallback) */}
            {!otpVerifying && (
              <button
                onClick={() => handleVerifyOtp()}
                disabled={otpDigits.some((d) => d === "") || otpVerifying}
                className="w-full bg-[#FF6B00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#CC5500] transition-colors disabled:opacity-40 mb-4"
              >
                Confirm & Create Account
              </button>
            )}

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={otpResending}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-[#FF6B00] transition-colors disabled:opacity-50"
            >
              {otpResending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {otpResending ? "Sending…" : "Resend code"}
            </button>

            <p className="text-xs text-gray-400 mt-5">
              Your order is confirmed! ✅<br />Verify to track it and earn loyalty points.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ──────────────────────────────────────────────────────────
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

  // ── Checkout form ───────────────────────────────────────────────────────────
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
                  <h3 className="font-semibold text-[#1A0A00] flex items-center gap-2">👤 Contact Details</h3>
                  {prefilled && (
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                      <UserCheck size={12} /> Pre-filled from your profile
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: "name",  label: "Full Name *",                           type: "text", placeholder: "John Smith",         required: true },
                    { key: "email", label: "Email *",                               type: "email", placeholder: "john@example.com",   required: true },
                    { key: "phone", label: "Mobile Number * (for SMS updates)",     type: "tel",  placeholder: "+61 400 000 000",     required: true },
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
                {!isLoggedIn && (
                  <p className="text-xs text-[#FF6B00] mt-3 flex items-center gap-1.5">
                    <ShieldCheck size={12} /> We&apos;ll send a verification code to your mobile to create your account automatically.
                  </p>
                )}
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
                  type="datetime-local" value={form.scheduledAt}
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
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: "card", label: "💳 Card", desc: "Visa / Mastercard" },
                    { key: "cash", label: "💵 Cash", desc: "Pay on arrival" },
                    { key: "applepay", label: "🍎 Apple Pay", desc: "Quick checkout" },
                  ].map((p) => (
                    <button key={p.key} type="button" onClick={() => update("paymentMethod", p.key)}
                      className={`flex flex-col items-center p-2 sm:p-3 rounded-xl border-2 transition-all text-center ${form.paymentMethod === p.key ? "border-[#FF6B00] bg-orange-50" : "border-[#E8D5C0] hover:border-[#FF6B00]/50"}`}>
                      <span className="text-lg">{p.label.split(" ")[0]}</span>
                      <span className="text-[11px] sm:text-xs font-medium mt-1 leading-tight">{p.label.split(" ").slice(1).join(" ")}</span>
                      <span className="hidden sm:block text-xs text-gray-400">{p.desc}</span>
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

                <button type="submit" disabled={loading}
                  className="w-full mt-5 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-xl font-bold hover:bg-[#CC5500] transition-colors disabled:opacity-60 shadow-lg shadow-orange-200">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <>Place Order — {formatCurrency(total)}</>}
                </button>
                {!isLoggedIn && (
                  <p className="text-[10px] text-center text-gray-400 mt-2">
                    📱 A verification code will be sent to your mobile
                  </p>
                )}
                <p className="text-xs text-center text-gray-400 mt-1">🔒 Secure checkout</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
