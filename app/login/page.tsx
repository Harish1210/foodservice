"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, ChefHat, User,
  Navigation, MapPin, ShieldCheck, RefreshCw, Phone,
} from "lucide-react";
import toast from "react-hot-toast";

type Role         = "customer" | "vendor";
type VendorMode   = "login" | "register";
type CustomerStep = "details" | "otp";

// ─────────────────────────────────────────────────────────────────────────────
// Customer OTP flow
// ─────────────────────────────────────────────────────────────────────────────
function CustomerOtpFlow({ redirectTo }: { redirectTo: string }) {
  const [step,        setStep]        = useState<CustomerStep>("details");
  const [form,        setForm]        = useState({ name: "", email: "", phone: "" });
  const [sending,     setSending]     = useState(false);
  const [otpDigits,   setOtpDigits]   = useState(["","","","","",""]);
  const [otpVerifying,setOtpVerifying]= useState(false);
  const [otpResending,setOtpResending]= useState(false);
  const [otpError,    setOtpError]    = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const inputCls = "w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]";

  // Web OTP API — Android Chrome auto-fill
  useEffect(() => {
    if (step !== "otp" || typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ code: string }> })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((c) => { if (c?.code) handleVerify(c.code); })
      .catch(() => {});
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sendOtp = async () => {
    const res  = await fetch("/api/auth/send-otp", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    return res.ok;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.phone) {
      toast.error("Please enter your email and mobile number");
      return;
    }
    setSending(true);
    try {
      const ok = await sendOtp();
      if (!ok) throw new Error("Failed to send code");
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch { toast.error("Could not send code — try again"); }
    finally  { setSending(false); }
  };

  const handleResend = async () => {
    setOtpResending(true);
    setOtpError("");
    setOtpDigits(["","","","","",""]);
    try {
      const ok = await sendOtp();
      if (ok) { toast.success("New code sent!"); otpRefs.current[0]?.focus(); }
      else      toast.error("Could not resend — try again");
    } catch    { toast.error("Could not resend — try again"); }
    finally    { setOtpResending(false); }
  };

  const handleVerify = async (code?: string) => {
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
      window.location.href = redirectTo;
    } catch { setOtpError("Something went wrong — try again"); }
    finally { setOtpVerifying(false); }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...otpDigits]; next[idx] = digit;
    setOtpDigits(next);
    setOtpError("");
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) handleVerify(next.join(""));
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
    if (pasted.length === 6) handleVerify(pasted);
    else otpRefs.current[pasted.length]?.focus();
  };

  // ── Step 1: email + phone ──────────────────────────────────────────────────
  if (step === "details") {
    return (
      <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[#1A0A00] mb-1">Sign in or Register</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your details — we&apos;ll send a code to your mobile. No password needed!
        </p>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name (optional for existing users)</label>
            <input
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Lambu Harish" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input
              type="email" required
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
            <input
              type="tel" required
              value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+61 400 000 000" className={inputCls}
            />
          </div>

          <button
            type="submit" disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#FF6B00] hover:bg-[#CC5500] transition-colors disabled:opacity-60 shadow-lg shadow-orange-100"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
            {sending ? "Sending code…" : "Send Verification Code"}
          </button>

          <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-[#FF6B00]" />
            A 6-digit code will be sent to your mobile via SMS
          </p>
        </form>
      </div>
    );
  }

  // ── Step 2: OTP entry ──────────────────────────────────────────────────────
  const maskedPhone = form.phone.replace(/(\d{4})(\d+)(\d{3})/, "$1 •••• $3");
  return (
    <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <ShieldCheck size={32} className="text-[#FF6B00]" />
      </div>

      <h2 className="text-xl font-bold text-[#1A0A00] mb-1">Verify your number</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        We sent a 6-digit code to<br />
        <span className="font-semibold text-[#1A0A00]">{maskedPhone}</span>
      </p>

      <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
        {otpDigits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text" inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1} value={d}
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

      {otpError && <p className="text-red-500 text-sm mb-3 font-medium">{otpError}</p>}

      {otpVerifying && (
        <div className="flex items-center justify-center gap-2 text-[#FF6B00] text-sm mb-3">
          <Loader2 size={16} className="animate-spin" /> Verifying…
        </div>
      )}

      {!otpVerifying && (
        <button
          onClick={() => handleVerify()}
          disabled={otpDigits.some((d) => d === "")}
          className="w-full bg-[#FF6B00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#CC5500] transition-colors disabled:opacity-40 mb-4"
        >
          Confirm & Sign In
        </button>
      )}

      <button
        onClick={handleResend} disabled={otpResending}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-[#FF6B00] transition-colors disabled:opacity-50 mb-4"
      >
        {otpResending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {otpResending ? "Sending…" : "Resend code"}
      </button>

      <button
        onClick={() => { setStep("details"); setOtpDigits(["","","","","",""]); setOtpError(""); }}
        className="text-xs text-gray-400 hover:text-gray-600 underline"
      >
        ← Change email or number
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor password flow (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function VendorPasswordFlow({ redirectTo }: { redirectTo: string }) {
  const router    = useRouter();
  const [mode,    setMode]    = useState<VendorMode>("login");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", confirmPassword: "",
    street: "", suburb: "", state: "NSW", postcode: "",
    businessName: "", businessAddress: "",
    lat: "", lng: "",
  });

  const up  = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]";

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported — enter address manually."); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const full = data.display_name ??
              `${a.road ?? ""} ${a.suburb ?? a.city ?? ""} ${a.state ?? ""} ${a.postcode ?? ""}`.trim();
            setForm((f) => ({ ...f, businessAddress: full, lat: String(latitude), lng: String(longitude) }));
            toast.success("Location detected!");
          } else {
            setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) }));
            toast("Coordinates captured — please fill address manually.", { icon: "📍" });
          }
        } catch {
          setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) }));
        } finally { setDetecting(false); }
      },
      () => { setDetecting(false); toast.error("Location denied — enter address manually."); },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (form.password !== form.confirmPassword) { toast.error("Passwords do not match"); return; }
      if (!form.businessAddress.trim()) { toast.error("Kitchen address is required"); return; }
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body     = mode === "login"
        ? { email: form.email, password: form.password }
        : { ...form, role: "vendor" };
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (mode === "register") {
        toast.success("Account created! Your application is pending admin approval.");
      } else {
        toast.success(`Welcome back, ${data.user.firstName}!`);
      }
      router.push("/vendor");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-[#1A0A00] mb-1">
        {mode === "login" ? "Chef Sign In" : "Join as a Chef"}
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        {mode === "login" ? "Sign in to your kitchen dashboard" : "Register your kitchen on Dishly"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input value={form.firstName} onChange={(e) => up("firstName", e.target.value)}
                  placeholder="Priya" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input value={form.lastName} onChange={(e) => up("lastName", e.target.value)}
                  placeholder="Sharma" required className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input value={form.phone} onChange={(e) => up("phone", e.target.value)}
                type="tel" placeholder="+61 400 000 000" className={inputCls} />
            </div>

            {/* Kitchen address */}
            <div className="border border-[#E8D5C0] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#FF6B00]" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kitchen Address *</p>
                </div>
                <button type="button" onClick={detectLocation} disabled={detecting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-lg hover:bg-[#FF6B00] hover:text-white transition-colors disabled:opacity-60">
                  {detecting ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  {detecting ? "Detecting…" : "📍 Use My Location"}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kitchen / Business Name *</label>
                <input value={form.businessName} onChange={(e) => up("businessName", e.target.value)}
                  placeholder="Priya's Home Kitchen" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Kitchen Address *</label>
                <input value={form.businessAddress} onChange={(e) => up("businessAddress", e.target.value)}
                  placeholder="123 Main St, Sydney NSW 2000" required className={inputCls} />
              </div>
              {(form.lat || form.lng) && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                    <input value={form.lat} onChange={(e) => up("lat", e.target.value)} placeholder="-33.8688" className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                    <input value={form.lng} onChange={(e) => up("lng", e.target.value)} placeholder="151.2093" className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
          <input value={form.email} onChange={(e) => up("email", e.target.value)}
            type="email" placeholder="chef@example.com" required className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
          <div className="relative">
            <input value={form.password} onChange={(e) => up("password", e.target.value)}
              type={showPw ? "text" : "password"} placeholder="Min. 6 characters" required
              className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password *</label>
            <input value={form.confirmPassword} onChange={(e) => up("confirmPassword", e.target.value)}
              type={showPw ? "text" : "password"} placeholder="Repeat password" required className={inputCls} />
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-[#1A0A00] hover:bg-[#2D1500] transition-colors disabled:opacity-60 shadow-lg">
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {mode === "login" ? "Sign In" : "Create Chef Account"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-gray-500">
        {mode === "login" ? (
          <>Don&apos;t have an account?{" "}
            <button onClick={() => setMode("register")} className="text-[#FF6B00] font-semibold hover:underline">Register</button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button onClick={() => setMode("login")} className="text-[#FF6B00] font-semibold hover:underline">Sign in</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
function LoginPageInner() {
  const searchParams  = useSearchParams();
  const defaultRole   = (searchParams.get("role") as Role) ?? "customer";
  const [role, setRole] = useState<Role>(defaultRole);
  const redirectTo    = searchParams.get("from") ?? "/";

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1A0A00] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Logo" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FF6B00]/40" />
          <div>
            <p className="text-white font-bold text-sm">Dishly</p>
            <p className="text-orange-300 text-xs">Local Kitchens &amp; Restaurants</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Role toggle */}
          <div className="flex bg-white rounded-2xl p-1 border border-[#E8D5C0] mb-6 shadow-sm">
            <button type="button" onClick={() => setRole("customer")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                role === "customer" ? "bg-[#FF6B00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
              }`}>
              <User size={16} /> Customer
            </button>
            <button type="button" onClick={() => setRole("vendor")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                role === "vendor" ? "bg-[#1A0A00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
              }`}>
              <ChefHat size={16} /> Chef
            </button>
          </div>

          {role === "customer"
            ? <CustomerOtpFlow redirectTo={redirectTo} />
            : <VendorPasswordFlow redirectTo={redirectTo} />
          }
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
