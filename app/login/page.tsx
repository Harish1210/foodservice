"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ChefHat, User, Navigation, MapPin,
  ShieldCheck, RefreshCw, Phone,
} from "lucide-react";
import toast from "react-hot-toast";

type Role      = "customer" | "vendor";
type OtpStep   = "details" | "otp";
type VendorMode = "login" | "register";

const inputCls = "w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]";

// ─────────────────────────────────────────────────────────────────────────────
// Shared OTP digit entry
// ─────────────────────────────────────────────────────────────────────────────
function OtpEntry({
  digits, error, verifying, resending,
  onChange, onKeyDown, onPaste, onVerify, onResend, onBack, maskedPhone,
}: {
  digits:      string[];
  error:       string;
  verifying:   boolean;
  resending:   boolean;
  onChange:    (i: number, v: string) => void;
  onKeyDown:   (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste:     (e: React.ClipboardEvent) => void;
  onVerify:    () => void;
  onResend:    () => void;
  onBack:      () => void;
  maskedPhone: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <ShieldCheck size={32} className="text-[#FF6B00]" />
      </div>
      <h2 className="text-xl font-bold text-[#1A0A00] mb-1">Verify your number</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        We sent a 6-digit code to<br />
        <span className="font-semibold text-[#1A0A00]">{maskedPhone}</span>
      </p>

      <div className="flex gap-2 justify-center mb-4" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text" inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1} value={d}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            autoFocus={i === 0}
            className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all ${
              error ? "border-red-400 bg-red-50 text-red-600"
                : d  ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                     : "border-[#E8D5C0] text-[#1A0A00] focus:border-[#FF6B00]"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>}

      {verifying && (
        <div className="flex items-center justify-center gap-2 text-[#FF6B00] text-sm mb-3">
          <Loader2 size={16} className="animate-spin" /> Verifying…
        </div>
      )}
      {!verifying && (
        <button onClick={onVerify} disabled={digits.some((d) => !d)}
          className="w-full bg-[#FF6B00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#CC5500] transition-colors disabled:opacity-40 mb-4">
          Confirm & Sign In
        </button>
      )}

      <button onClick={onResend} disabled={resending}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-[#FF6B00] transition-colors disabled:opacity-50 mb-4">
        {resending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {resending ? "Sending…" : "Resend code"}
      </button>

      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 underline">
        ← Change details
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared OTP hook logic
// ─────────────────────────────────────────────────────────────────────────────
function useOtp(step: OtpStep, email: string, phone: string, onSuccess: () => void) {
  const [digits,    setDigits]    = useState(["","","","","",""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState("");

  // Web OTP API — Android Chrome auto-fill
  useEffect(() => {
    if (step !== "otp" || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ code: string }> })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((c) => { if (c?.code) verify(c.code); })
      .catch(() => {});
    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const verify = async (code?: string) => {
    const otp = (code ?? digits.join("")).trim();
    if (otp.length !== 6) return;
    setVerifying(true); setError("");
    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid code"); return; }
      toast.success(`Welcome, ${data.user?.firstName ?? ""}! 🎉`);
      onSuccess();
    } catch { setError("Something went wrong — try again"); }
    finally   { setVerifying(false); }
  };

  const resend = async (sendFn: () => Promise<boolean>) => {
    setResending(true); setError(""); setDigits(["","","","","",""]);
    try {
      const ok = await sendFn();
      if (ok) toast.success("New code sent!");
      else    toast.error("Could not resend — try again");
    } catch { toast.error("Could not resend — try again"); }
    finally  { setResending(false); }
  };

  const onChange = (idx: number, val: string, sendFn?: () => void) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...digits]; next[idx] = digit;
    setDigits(next); setError("");
    if (digit && idx < 5) document.querySelectorAll<HTMLInputElement>(".otp-input")[idx + 1]?.focus();
    if (next.every((d) => d)) verify(next.join(""));
  };

  const onKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0)
      document.querySelectorAll<HTMLInputElement>(".otp-input")[idx - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setDigits(next);
    if (pasted.length === 6) verify(pasted);
  };

  const masked = phone.replace(/(\d{4})(\d+)(\d{3})/, "$1 •••• $3");

  return { digits, verifying, resending, error, verify, resend, onChange, onKeyDown, onPaste, masked, setDigits, setError };
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer OTP flow
// ─────────────────────────────────────────────────────────────────────────────
function CustomerOtpFlow({ redirectTo }: { redirectTo: string }) {
  const [step,    setStep]    = useState<OtpStep>("details");
  const [form,    setForm]    = useState({ name: "", email: "", phone: "" });
  const [sending, setSending] = useState(false);

  const sendOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    return res.ok;
  };

  const otp = useOtp(step, form.email, form.phone, () => { window.location.href = redirectTo; });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.phone) { toast.error("Please enter your email and mobile number"); return; }
    setSending(true);
    try {
      if (!(await sendOtp())) throw new Error();
      setStep("otp");
    } catch { toast.error("Could not send code — try again"); }
    finally  { setSending(false); }
  };

  if (step === "otp") {
    return (
      <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
        <OtpEntry
          digits={otp.digits} error={otp.error} verifying={otp.verifying} resending={otp.resending}
          onChange={(i, v) => otp.onChange(i, v)}
          onKeyDown={otp.onKeyDown} onPaste={otp.onPaste}
          onVerify={() => otp.verify()} onResend={() => otp.resend(sendOtp)}
          onBack={() => { setStep("details"); otp.setDigits(["","","","","",""]); otp.setError(""); }}
          maskedPhone={otp.masked}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-[#1A0A00] mb-1">Sign in or Register</h1>
      <p className="text-gray-500 text-sm mb-6">
        No password needed — we&apos;ll send a code to your mobile.
      </p>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name <span className="text-gray-400">(optional for existing users)</span></label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Lambu Harish" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
          <input type="email" required value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
          <input type="tel" required value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+61 400 000 000" className={inputCls} />
        </div>
        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#FF6B00] hover:bg-[#CC5500] transition-colors disabled:opacity-60 shadow-lg shadow-orange-100">
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

// ─────────────────────────────────────────────────────────────────────────────
// Vendor OTP flow
// ─────────────────────────────────────────────────────────────────────────────
function VendorOtpFlow({ redirectTo }: { redirectTo: string }) {
  const [mode,      setMode]      = useState<VendorMode>("login");
  const [step,      setStep]      = useState<OtpStep>("details");
  const [sending,   setSending]   = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    businessName: "", businessAddress: "", lat: "", lng: "",
  });

  const up = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const sendOtp = async () => {
    const body = mode === "register"
      ? { name: `${form.firstName} ${form.lastName}`.trim(), email: form.email, phone: form.phone, role: "vendor", businessName: form.businessName, businessAddress: form.businessAddress, lat: form.lat, lng: form.lng }
      : { email: form.email, phone: form.phone, role: "vendor" };
    const res = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const otp = useOtp(step, form.email, form.phone, () => { window.location.href = "/vendor"; });

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
            const full = data.display_name ?? "";
            setForm((f) => ({ ...f, businessAddress: full, lat: String(latitude), lng: String(longitude) }));
            toast.success("Location detected!");
          } else {
            setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) }));
          }
        } catch { setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) })); }
        finally { setDetecting(false); }
      },
      () => { setDetecting(false); toast.error("Location denied — enter address manually."); },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.phone) { toast.error("Please enter your email and mobile number"); return; }
    if (mode === "register" && !form.businessAddress.trim()) { toast.error("Kitchen address is required"); return; }
    setSending(true);
    try {
      if (!(await sendOtp())) throw new Error();
      setStep("otp");
    } catch { toast.error("Could not send code — try again"); }
    finally  { setSending(false); }
  };

  if (step === "otp") {
    return (
      <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
        <OtpEntry
          digits={otp.digits} error={otp.error} verifying={otp.verifying} resending={otp.resending}
          onChange={(i, v) => otp.onChange(i, v)}
          onKeyDown={otp.onKeyDown} onPaste={otp.onPaste}
          onVerify={() => otp.verify()} onResend={() => otp.resend(sendOtp)}
          onBack={() => { setStep("details"); otp.setDigits(["","","","","",""]); otp.setError(""); }}
          maskedPhone={otp.masked}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
      {/* Login / Register toggle */}
      <div className="flex bg-[#FFF8F0] rounded-xl p-1 border border-[#E8D5C0] mb-6">
        {(["login","register"] as VendorMode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === m ? "bg-[#1A0A00] text-white shadow" : "text-gray-500 hover:text-[#1A0A00]"
            }`}>
            {m === "login" ? "Sign In" : "Register Kitchen"}
          </button>
        ))}
      </div>

      <h1 className="text-xl font-bold text-[#1A0A00] mb-1">
        {mode === "login" ? "Chef Sign In" : "Join as a Chef"}
      </h1>
      <p className="text-gray-500 text-sm mb-5">
        {mode === "login"
          ? "Enter your email & mobile — we'll send a verification code."
          : "Register your kitchen. No password needed!"}
      </p>

      <form onSubmit={handleSend} className="space-y-4">
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

            {/* Kitchen address */}
            <div className="border border-[#E8D5C0] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#FF6B00]" />
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kitchen Details *</p>
                </div>
                <button type="button" onClick={detectLocation} disabled={detecting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-lg hover:bg-[#FF6B00] hover:text-white transition-colors disabled:opacity-60">
                  {detecting ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                  {detecting ? "Detecting…" : "📍 My Location"}
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
          <input type="email" required value={form.email} onChange={(e) => up("email", e.target.value)}
            placeholder="chef@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
          <input type="tel" required value={form.phone} onChange={(e) => up("phone", e.target.value)}
            placeholder="+61 400 000 000" className={inputCls} />
        </div>

        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#1A0A00] hover:bg-[#2D1500] transition-colors disabled:opacity-60 shadow-lg">
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
          {sending ? "Sending code…" : "Send Verification Code"}
        </button>

        <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-[#FF6B00]" />
          {mode === "register"
            ? "Your application will be reviewed before approval."
            : "A 6-digit code will be sent to your mobile via SMS"}
        </p>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
function LoginPageInner() {
  const searchParams    = useSearchParams();
  const defaultRole     = (searchParams.get("role") as Role) ?? "customer";
  const [role, setRole] = useState<Role>(defaultRole);
  const redirectTo      = searchParams.get("from") ?? "/";

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1A0A00] px-6 py-4 flex items-center">
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
            : <VendorOtpFlow   redirectTo={redirectTo} />
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
