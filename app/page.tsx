import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Vendors and admins don't belong on the customer home page
  const session = await getSession();
  if (session?.role === "vendor") redirect("/vendor");
  if (session?.role === "admin") redirect("/admin/vendors");

  const settings = await prisma.businessSettings.findFirst();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D0500 0%, #3D1200 40%, #7C2D12 75%, #1A0A00 100%)" }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-orange-900/20 rounded-full blur-2xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6">
            <img src="/logo.jpg" alt="Home Food Service" className="w-24 h-24 rounded-full object-cover shadow-2xl shadow-orange-900/60 ring-4 ring-[#FF6B00]/30" />
          </div>

          <span className="inline-block bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8C38] text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-widest uppercase">
            🏠 Home-Cooked &amp; Delivered
          </span>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight tracking-tight">
            {settings?.name ?? "Home Food Service"}
          </h1>
          <p className="text-[#FFB87A] text-lg md:text-xl mb-8 max-w-xl leading-relaxed">
            {settings?.tagline ?? "Authentic Indian home cooking from local kitchens, delivered fresh to your door."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link
              href="/vendors"
              className="inline-flex items-center justify-center gap-2 bg-[#FF6B00] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#E05E00] transition-all shadow-xl shadow-orange-900/50 hover:scale-105 active:scale-95"
            >
              🍳 Find a Kitchen Near You →
            </Link>
            {!session && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                Sign In / Register
              </Link>
            )}
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: "🚚", label: `Delivery from $${settings?.deliveryFee?.toFixed(2) ?? "5.00"}` },
              { icon: "🎁", label: `Free over $${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}` },
              { icon: "⏱", label: `Ready in ~${settings?.estimatedPrepTime ?? 20} mins` },
              { icon: "🌶️", label: "Fresh & Authentic" },
            ].map((p) => (
              <span key={p.label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-xs px-4 py-2 rounded-full font-medium">
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-[#FF6B00] text-sm font-bold uppercase tracking-widest">Simple &amp; Easy</span>
          <h2 className="text-3xl font-black text-[#1A0A00] mt-2">How It Works</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: "01", icon: "📍", title: "Find a Kitchen", desc: "Browse home cooks near you, see their menus and pick one that's open right now.", color: "from-orange-50 to-amber-50", border: "border-orange-200" },
            { step: "02", icon: "🍽️", title: "Pick Your Dishes", desc: "Browse that kitchen's freshly made menu and add your favourites to the cart.", color: "from-red-50 to-orange-50", border: "border-red-200" },
            { step: "03", icon: "🚚", title: "Get It Delivered", desc: "Place your order and track it live — hot food delivered straight to your door.", color: "from-amber-50 to-yellow-50", border: "border-amber-200" },
          ].map((s, i) => (
            <div key={s.step} className={`relative bg-gradient-to-br ${s.color} rounded-3xl border-2 ${s.border} p-7 shadow-sm hover:shadow-lg transition-shadow`}>
              <span className="absolute top-5 right-6 text-5xl font-black text-black/5 select-none">{s.step}</span>
              <div className="text-5xl mb-4">{s.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-[#FF6B00] text-white rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                <h3 className="font-black text-[#1A0A00] text-lg">{s.title}</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── WHY CHOOSE US ── */}
      <div className="bg-[#1A0A00] py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-[#FF6B00] text-sm font-bold uppercase tracking-widest">Why Us</span>
            <h2 className="text-3xl font-black text-white mt-2">Real Home Cooks. Real Food.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: "🏠", title: "Home Kitchen Quality", desc: "Every dish made with love in a real home kitchen, not a factory." },
              { icon: "🌿", title: "Fresh Ingredients", desc: "Local, fresh ingredients sourced daily for every meal." },
              { icon: "⭐", title: "Verified Cooks", desc: "All vendors are verified and approved before listing." },
              { icon: "💰", title: "Fair Prices", desc: "Support local cooks and enjoy authentic food at great prices." },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h4 className="text-white font-bold mb-1 text-sm">{f.title}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="py-16 text-center bg-gradient-to-b from-[#FFF8F0] to-orange-50">
        <div className="max-w-2xl mx-auto px-4">
          <img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-5 shadow-lg" />
          <h2 className="text-3xl font-black text-[#1A0A00] mb-3">Ready to Order?</h2>
          <p className="text-gray-500 mb-8 text-base">Discover home kitchens in your area and enjoy a real home-cooked meal.</p>
          <Link
            href="/vendors"
            className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-10 py-4 rounded-2xl font-bold text-base hover:bg-[#E05E00] transition-all shadow-lg shadow-orange-200 hover:scale-105 active:scale-95"
          >
            🍳 Browse Kitchens Near You →
          </Link>
        </div>
      </div>
    </div>
  );
}
