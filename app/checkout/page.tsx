"use client";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import {
  CreditCard, MapPin, CheckCircle, Loader2, ChevronRight,
  Calendar, UserCheck, ShieldCheck, RefreshCw, Lock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-gray-900 placeholder-gray-400";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items, orderType, tableNumber, specialInstructions,
    loyaltyPointsToUse, clearCart, getSubtotal, selectedVendorId,
  } = useCartStore();

  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState<"details" | "otp" | "success">("details");
  const [orderId,    setOrderId]    = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [prefilled,  setPrefilled]  = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [otpDigits,    setOtpDigits]    = useState(["","","","","",""]);
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
    if (items.length === 0 && step !== "success" && step !== "otp") router.push("/cart");
  }, [items.length, step, router]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
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
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== "otp" || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ code: string }> })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((c) => { if (c?.code) { const digits = c.code.slice(0,6).split(""); setOtpDigits(digits.concat(Array(6-digits.length).fill(""))); handleVerifyOtp(c.code); } })
      .catch(() => {});
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const subtotal        = getSubtotal();
  const deliveryFee     = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax             = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total           = subtotal + deliveryFee - loyaltyDiscount + tax;
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Please fill in your name, email and mobile."); return; }
    if (orderType === "delivery" && (!form.street || !form.suburb || !form.postcode)) { toast.error("Please fill in your delivery address."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.name, guestEmail: form.email, guestPhone: form.phone,
          type: orderType, tableNumber: tableNumber ?? null,
          scheduledAt: form.scheduledAt || null, specialInstructions,
          paymentMethod: form.paymentMethod,
          address: orderType === "delivery" ? { street: form.street, suburb: form.suburb, postcode: form.postcode } : null,
          items: items.map((i) => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity, notes: i.notes })),
          subtotal, deliveryFee, discount: loyaltyDiscount, tax, total,
          loyaltyPointsUsed: loyaltyPointsToUse, vendorId: selectedVendorId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      setOrderId(data.order.id);
      setPickupCode(data.order.pickupCode ?? "");
      if (isLoggedIn) {
        await saveAddress();
        clearCart();
        setStep("success");
      } else {
        setStep("otp");
        const smsSent = await sendOtp();
        if (!smsSent) toast.error("Could not send SMS — tap 'Resend code'", { duration: 6000 });
        clearCart();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const sendOtp = async (): Promise<boolean> => {
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          ...(orderType === "delivery" && { street: form.street, suburb: form.suburb, postcode: form.postcode }),
        }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      return data.smsSent ?? false;
    } catch { return false; }
  };

  const saveAddress = async () => {
    if (orderType !== "delivery" || !form.street) return;
    try {
      await fetch("/api/auth/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street: form.street, suburb: form.suburb, postcode: form.postcode }),
      });
    } catch { /* non-critical */ }
  };

  const handleResend = async () => {
    setOtpResending(true); setOtpError(""); setOtpDigits(["","","","","",""]);
    try {
      const sent = await sendOtp();
      if (sent) toast.success("New code sent!"); else toast.error("Could not send SMS");
      otpRefs.current[0]?.focus();
    } catch { toast.error("Could not resend"); }
    finally { setOtpResending(false); }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otp = (code ?? otpDigits.join("")).trim();
    if (otp.length !== 6) return;
    setOtpVerifying(true); setOtpError("");
    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Invalid code"); return; }
      toast.success(`Welcome, ${data.user?.firstName ?? ""}! 🎉`);
      window.location.href = `/orders/${orderId}`;
    } catch { setOtpError("Something went wrong"); }
    finally { setOtpVerifying(false); }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...otpDigits]; next[idx] = digit;
    setOtpDigits(next); setOtpError("");
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

  if (items.length === 0 && step === "details") return null;

  /* ── OTP screen ── */
  if (step === "otp") {
    const maskedPhone = form.phone.replace(/(\d{4})(\d+)(\d{3})/, "$1 •••• $3");
    return (
      <div className="min-h-screen bg-[#F6F6F6]">
        <Navbar />
        <div className="max-w-sm mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={30} className="text-[#FF6B00]" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Verify your number</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              6-digit code sent to<br /><span className="font-bold text-gray-900">{maskedPhone}</span>
            </p>
            <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
              {otpDigits.map((d, i) => (
                <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1} value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onFocus={(e) => e.target.select()} autoFocus={i === 0}
                  className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 focus:outline-none transition-all ${
                    otpError ? "border-red-300 bg-red-50 text-red-600"
                      : d ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                          : "border-gray-200 text-gray-900 focus:border-[#FF6B00]"
                  }`}
                />
              ))}
            </div>
            {otpError && <p className="text-red-500 text-sm mb-3 font-medium">{otpError}</p>}
            {otpVerifying ? (
              <div className="flex items-center justify-center gap-2 text-[#FF6B00] text-sm mb-4">
                <Loader2 size={15} className="animate-spin" /> Verifying…
              </div>
            ) : (
              <button onClick={() => handleVerifyOtp()} disabled={otpDigits.some((d) => d === "") || otpVerifying}
                className="w-full bg-[#FF6B00] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#E55A00] transition-colors disabled:opacity-40 mb-3 shadow-lg shadow-orange-100">
                Confirm & Create Account
              </button>
            )}
            <button onClick={handleResend} disabled={otpResending}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-[#FF6B00] transition-colors disabled:opacity-50">
              {otpResending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {otpResending ? "Sending…" : "Resend code"}
            </button>
            <p className="text-xs text-gray-400 mt-5">Your order is confirmed! ✅<br />Verify to track it and earn loyalty points.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success screen ── */
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#F6F6F6]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Order Confirmed! 🎉</h2>
            <p className="text-gray-500 mb-6 text-sm">Thank you! We&apos;re preparing your food.</p>
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order type</span>
                <span className="font-bold capitalize text-gray-900">{orderType}</span>
              </div>
              {pickupCode && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Pickup code</span>
                  <span className="font-black text-2xl text-[#FF6B00] tracking-widest">{pickupCode}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total paid</span>
                <span className="font-black text-[#FF6B00]">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Est. time</span>
                <span className="font-bold text-gray-900">{orderType === "delivery" ? "~40 mins" : "~20 mins"}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push(`/orders/${orderId}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#E55A00]">
                Track Order <ChevronRight size={15} />
              </button>
              <button onClick={() => router.push("/")}
                className="flex-1 border-2 border-gray-200 py-3.5 rounded-2xl font-bold text-sm text-gray-600 hover:bg-gray-50">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Checkout form ── */
  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-36 md:pb-8">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-black text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">

              {/* Contact */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Contact details</h3>
                  {prefilled && (
                    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                      <UserCheck size={11} /> Pre-filled
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { key: "name",  label: "Full Name *",     type: "text",  placeholder: "John Smith",       required: true },
                    { key: "email", label: "Email *",         type: "email", placeholder: "john@example.com", required: true },
                    { key: "phone", label: "Mobile Number *", type: "tel",   placeholder: "+61 400 000 000",  required: true },
                  ].map((f) => (
                    <div key={f.key} className={f.key === "email" ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
                {!isLoggedIn && (
                  <p className="text-xs text-[#FF6B00] mt-3 flex items-center gap-1.5">
                    <ShieldCheck size={11} /> We&apos;ll send a code to your mobile to create your account.
                  </p>
                )}
              </div>

              {/* Delivery address */}
              {orderType === "delivery" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#FF6B00]" /> Delivery Address
                    </h3>
                    {prefilled && form.street && (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                        <UserCheck size={11} /> Saved
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street Address</label>
                      <input value={form.street} onChange={(e) => update("street", e.target.value)}
                        placeholder="123 George Street" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Suburb</label>
                        <input value={form.suburb} onChange={(e) => update("suburb", e.target.value)}
                          placeholder="Sydney" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Postcode</label>
                        <input value={form.postcode} onChange={(e) => update("postcode", e.target.value)}
                          placeholder="2000" className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#FF6B00]" /> Schedule Order <span className="font-normal text-gray-400">(Optional)</span>
                </h3>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={(e) => update("scheduledAt", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={inputCls} />
                <p className="text-xs text-gray-400 mt-2">Leave empty for ASAP ordering</p>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#FF6B00]" /> Payment Method
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "card",     label: "💳 Card",       desc: "Visa / Mastercard" },
                    { key: "cash",     label: "💵 Cash",       desc: "Pay on arrival" },
                    { key: "applepay", label: "🍎 Apple Pay",  desc: "Quick checkout" },
                  ].map((p) => (
                    <button key={p.key} type="button" onClick={() => update("paymentMethod", p.key)}
                      className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all text-center ${
                        form.paymentMethod === p.key
                          ? "border-[#FF6B00] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <span className="text-xl mb-1">{p.label.split(" ")[0]}</span>
                      <span className="text-xs font-bold text-gray-700">{p.label.split(" ").slice(1).join(" ")}</span>
                      <span className="text-[10px] text-gray-400">{p.desc}</span>
                    </button>
                  ))}
                </div>
                {form.paymentMethod === "card" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Card Number</label>
                      <input type="text" placeholder="4242 4242 4242 4242 (test)" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiry</label>
                        <input type="text" placeholder="MM/YY" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">CVC</label>
                        <input type="text" placeholder="123" className={inputCls} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Lock size={10} /> Powered by Stripe — your card details are secure
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Desktop sidebar ── */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 text-sm">Order Summary</h3>
                <div className="space-y-1.5 text-sm mb-4 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-gray-500">
                      <span className="truncate">{item.quantity}× {item.name}</span>
                      <span className="shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm mb-5">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {orderType === "delivery" && (
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery</span>
                      <span>{deliveryFee === 0 ? <span className="text-green-600 font-semibold">FREE</span> : formatCurrency(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500"><span>GST (10%)</span><span>{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-[#FF6B00]">{formatCurrency(total)}</span>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#E55A00] transition-colors disabled:opacity-60 shadow-lg shadow-orange-100">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Place Order — {formatCurrency(total)}</>}
                </button>
                {!isLoggedIn && <p className="text-[10px] text-center text-gray-400 mt-2">📱 Verification code sent after ordering</p>}
                <p className="text-xs text-center text-gray-400 mt-1 flex items-center justify-center gap-1"><Lock size={10} /> Secure checkout</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-2xl px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{items.length} item{items.length > 1 ? "s" : ""} · {orderType}</p>
          <p className="text-lg font-black text-[#FF6B00]">{formatCurrency(total)}</p>
        </div>
        <button type="submit" form="checkout-form" disabled={loading} onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#E55A00] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-orange-100">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Place Order — {formatCurrency(total)}</>}
        </button>
      </div>
    </div>
  );
}
