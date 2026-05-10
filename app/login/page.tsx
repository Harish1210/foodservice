"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ChefHat, User, Navigation, MapPin,
  ShieldCheck, RefreshCw, Phone, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

type Role       = "customer" | "vendor";
type OtpStep    = "details" | "otp";
type VendorMode = "login" | "register";

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white text-gray-900 placeholder-gray-400";

/* ── OTP digit entry ── */
function OtpEntry({
  digits, error, verifying, resending,
  onChange, onPaste, onVerify, onResend, onBack, maskedPhone,
}: {
  digits: string[]; error: string; verifying: boolean; resending: boolean;
  onChange: (i: number, v: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onVerify: () => void; onResend: () => void; onBack: () => void;
  maskedPhone: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    onChange(idx, digit);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <ShieldCheck size={30} className="text-[#FF6B00]" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-1">Verify your number</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        6-digit code sent to<br />
        <span className="font-bold text-gray-900">{maskedPhone}</span>
      </p>

      <div className="flex gap-2 justify-center mb-4" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text" inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1} value={d}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            autoFocus={i === 0}
            className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 focus:outline-none transition-all ${
              error
                ? "border-red-300 bg-red-50 text-red-600"
                : d
                  ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                  : "border-gray-200 text-gray-900 focus:border-[#FF6B00]"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>}

      {verifying ? (
        <div className="flex items-center justify-center gap-2 text-[#FF6B00] text-sm mb-4">
          <Loader2 size={16} className="animate-spin" /> Verifying…
        </div>
      ) : (
        <button
          onClick={onVerify}
          disabled={digits.some((d) => !d)}
          className="w-full bg-[#FF6B00] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#E55A00] transition-colors disabled:opacity-40 mb-3 shadow-lg shadow-orange-100"
        >
          Confirm & Sign In
        </button>
      )}

      <button
        onClick={onResend}
        disabled={resending}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-400 hover:text-[#FF6B00] transition-colors disabled:opacity-50 mb-3"
      >
        {resending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {resending ? "Sending…" : "Resend code"}
      </button>

      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
        <ArrowLeft size={12} /> Change details
      </button>
    </div>
  );
}

/* ── OTP hook ── */
function useOtp(step: OtpStep, email: string, phone: string, onSuccess: () => void) {
  const [digits,    setDigits]    = useState(["","","","","",""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState("");

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

  const onChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...digits]; next[idx] = digit;
    setDigits(next); setError("");
    if (next.every((d) => d)) verify(next.join(""));
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
  return { digits, verifying, resending, error, verify, resend, onChange, onPaste, masked, setDigits, setError };
}

/* ── Customer flow ── */
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
    if (!form.email || !form.phone) { toast.error("Please enter your email and mobile"); return; }
    setSending(true);
    try {
      if (!(await sendOtp())) throw new Error();
      setStep("otp");
    } catch { toast.error("Could not send code — try again"); }
    finally  { setSending(false); }
  };

  if (step === "otp") {
    return (
      <OtpEntry
        digits={otp.digits} error={otp.error} verifying={otp.verifying} resending={otp.resending}
        onChange={(i, v) => otp.onChange(i, v)} onPaste={otp.onPaste}
        onVerify={() => otp.verify()} onResend={() => otp.resend(sendOtp)}
        onBack={() => { setStep("details"); otp.setDigits(["","","","","",""]); otp.setError(""); }}
        maskedPhone={otp.masked}
      />
    );
  }

  return (
    <>
      <h2 className="text-xl font-black text-gray-900 mb-1">Sign in or create account</h2>
      <p className="text-gray-500 text-sm mb-6">No password — we send a code to your mobile.</p>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="John Smith" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
          <input type="email" required value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number *</label>
          <input type="tel" required value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+61 400 000 000" className={inputCls} />
        </div>
        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-[#FF6B00] hover:bg-[#E55A00] transition-colors disabled:opacity-60 shadow-lg shadow-orange-100 text-sm mt-2">
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
          {sending ? "Sending code…" : "Continue with SMS"}
        </button>
        <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck size={11} className="text-[#FF6B00]" />
          6-digit code sent via SMS
        </p>
      </form>
    </>
  );
}

/* ── Vendor flow ── */
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
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
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
          const full = data.display_name ?? "";
          setForm((f) => ({ ...f, businessAddress: full, lat: String(latitude), lng: String(longitude) }));
          toast.success("Location detected!");
        } catch {
          setForm((f) => ({ ...f, lat: String(latitude), lng: String(longitude) }));
        } finally { setDetecting(false); }
      },
      () => { setDetecting(false); toast.error("Location denied — enter address manually."); },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.phone) { toast.error("Please enter email and mobile"); return; }
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
      <OtpEntry
        digits={otp.digits} error={otp.error} verifying={otp.verifying} resending={otp.resending}
        onChange={(i, v) => otp.onChange(i, v)} onPaste={otp.onPaste}
        onVerify={() => otp.verify()} onResend={() => otp.resend(sendOtp)}
        onBack={() => { setStep("details"); otp.setDigits(["","","","","",""]); otp.setError(""); }}
        maskedPhone={otp.masked}
      />
    );
  }

  return (
    <>
      {/* Sign in / Register toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        {(["login","register"] as VendorMode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}>
            {m === "login" ? "Sign In" : "Register Kitchen"}
          </button>
        ))}
      </div>

      <h2 className="text-xl font-black text-gray-900 mb-1">
        {mode === "login" ? "Welcome back, Chef" : "Join as a Chef"}
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        {mode === "login" ? "Enter your email & mobile for a verification code." : "Register your kitchen — no password needed!"}
      </p>

      <form onSubmit={handleSend} className="space-y-4">
        {mode === "register" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                <input value={form.firstName} onChange={(e) => up("firstName", e.target.value)}
                  placeholder="Priya" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                <input value={form.lastName} onChange={(e) => up("lastName", e.target.value)}
                  placeholder="Sharma" required className={inputCls} />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#FF6B00]" />
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Kitchen Details *</p>
                </div>
                <button type="button" onClick={detectLocation} disabled={detecting}
                  className="flex items-center gap-1 text-xs font-semibold text-[#FF6B00] hover:underline disabled:opacity-60">
                  {detecting ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                  {detecting ? "Detecting…" : "Use my location"}
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kitchen / Business Name *</label>
                <input value={form.businessName} onChange={(e) => up("businessName", e.target.value)}
                  placeholder="Priya's Home Kitchen" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Kitchen Address *</label>
                <input value={form.businessAddress} onChange={(e) => up("businessAddress", e.target.value)}
                  placeholder="123 Main St, Sydney NSW 2000" required className={inputCls} />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
          <input type="email" required value={form.email} onChange={(e) => up("email", e.target.value)}
            placeholder="chef@example.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number *</label>
          <input type="tel" required value={form.phone} onChange={(e) => up("phone", e.target.value)}
            placeholder="+61 400 000 000" className={inputCls} />
        </div>

        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors disabled:opacity-60 shadow-lg text-sm mt-2">
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
          {sending ? "Sending code…" : "Continue with SMS"}
        </button>

        {mode === "register" && (
          <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck size={11} className="text-[#FF6B00]" />
            Your application will be reviewed before approval.
          </p>
        )}
      </form>
    </>
  );
}

/* ── Main page ── */
function LoginPageInner() {
  const searchParams = useSearchParams();
  const defaultRole  = (searchParams.get("role") as Role) ?? "customer";
  const [role, setRole] = useState<Role>(defaultRole);
  const redirectTo   = searchParams.get("from") ?? "/";

  return (
    <div className="min-h-screen bg-[#F6F6F6] flex flex-col">
      {/* Simple top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Dishly" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-black text-lg text-gray-900">dishly</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Customer / Chef toggle */}
          <div className="flex bg-white rounded-2xl p-1 border border-gray-200 mb-5 shadow-sm">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                role === "customer"
                  ? "bg-[#FF6B00] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <User size={15} /> Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("vendor")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                role === "vendor"
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ChefHat size={15} /> Chef
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm">
            {role === "customer"
              ? <CustomerOtpFlow redirectTo={redirectTo} />
              : <VendorOtpFlow   redirectTo={redirectTo} />
            }
          </div>
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
