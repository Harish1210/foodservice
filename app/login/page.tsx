"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ChefHat, User } from "lucide-react";
import toast from "react-hot-toast";
import { Suspense } from "react";

type Mode = "login" | "register";
type Role = "customer" | "vendor";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) ?? "customer";

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>(defaultRole);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    password: "", confirmPassword: "",
    street: "", suburb: "", state: "NSW", postcode: "",
    businessName: "", businessAddress: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register" && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { ...form, role };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      toast.success(mode === "login" ? `Welcome back, ${data.user.firstName}!` : "Account created!");
      if (data.user.role === "vendor") {
        router.push("/vendor");
      } else {
        router.push(searchParams.get("from") ?? "/");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1A0A00] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🍛</span>
          <div>
            <p className="text-white font-bold text-sm">Home Food Service</p>
            <p className="text-orange-300 text-xs">Authentic Indian Home Cooking</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Role toggle */}
          <div className="flex bg-white rounded-2xl p-1 border border-[#E8D5C0] mb-6 shadow-sm">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                role === "customer" ? "bg-[#FF6B00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
              }`}
            >
              <User size={16} /> Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("vendor")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                role === "vendor" ? "bg-[#1A0A00] text-white shadow-md" : "text-gray-500 hover:text-[#1A0A00]"
              }`}
            >
              <ChefHat size={16} /> Vendor / Staff
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8D5C0] p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-[#1A0A00] mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {mode === "login"
                ? `Sign in as ${role === "vendor" ? "vendor/staff" : "customer"}`
                : `Register as a ${role === "vendor" ? "vendor/staff member" : "customer"}`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                      <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)}
                        placeholder="Priya" required
                        className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                      <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)}
                        placeholder="Sharma" required
                        className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                      type="tel" placeholder="+61 400 000 000"
                      className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  </div>

                  {role === "customer" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                        <input value={form.street} onChange={(e) => update("street", e.target.value)}
                          placeholder="123 George St"
                          className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Suburb</label>
                          <input value={form.suburb} onChange={(e) => update("suburb", e.target.value)}
                            placeholder="Sydney"
                            className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                          <input value={form.postcode} onChange={(e) => update("postcode", e.target.value)}
                            placeholder="2000"
                            className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                        </div>
                      </div>
                    </>
                  )}

                  {role === "vendor" && (
                    <>
                      <div className="border-t border-[#E8D5C0] pt-3 pb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kitchen Details</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Kitchen / Business Name *</label>
                        <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)}
                          placeholder="Priya's Home Kitchen" required
                          className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Kitchen Address *</label>
                        <input value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)}
                          placeholder="123 Main St, Sydney NSW 2000" required
                          className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                        💡 You can add your exact GPS coordinates later from your profile to appear in nearby searches.
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input value={form.email} onChange={(e) => update("email", e.target.value)}
                  type="email" placeholder="you@example.com" required
                  className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                <div className="relative">
                  <input value={form.password} onChange={(e) => update("password", e.target.value)}
                    type={showPw ? "text" : "password"} placeholder="Min. 6 characters" required
                    className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password *</label>
                  <input value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)}
                    type={showPw ? "text" : "password"} placeholder="Repeat password" required
                    className="w-full border border-[#E8D5C0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-60 shadow-lg"
                style={{ background: role === "vendor" ? "#1A0A00" : "#FF6B00" }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-gray-500">
              {mode === "login" ? (
                <>Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("register")} className="text-[#FF6B00] font-semibold hover:underline">
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-[#FF6B00] font-semibold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
