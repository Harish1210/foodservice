import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import MenuClient from "@/components/MenuClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const { vendor: vendorId } = await searchParams;

  const [categories, settings, vendor] = await Promise.all([
    // Only fetch menu items when a vendor is selected
    vendorId
      ? prisma.category.findMany({
          where: { isActive: true },
          include: {
            menuItems: {
              where: { isAvailable: true, vendorId },
              orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
            },
          },
          orderBy: { sortOrder: "asc" },
        }).then((cats) => cats.filter((c) => c.menuItems.length > 0))
      : Promise.resolve([]),
    prisma.businessSettings.findFirst(),
    vendorId
      ? prisma.user.findUnique({
          where: { id: vendorId },
          select: { id: true, businessName: true, firstName: true, lastName: true, businessAddress: true, isOpen: true },
        })
      : Promise.resolve(null),
  ]);

  const vendorName = vendor
    ? vendor.businessName ?? `${vendor.firstName} ${vendor.lastName}`
    : null;

  // No vendor selected — show landing / kitchen-finder page
  if (!vendorId) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        {/* Hero */}
        <div
          className="relative py-16 px-4 text-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1A0A00 0%, #4A1500 50%, #7C2D12 100%)" }}
        >
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🍛</div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
              {settings?.name ?? "Home Food Service"}
            </h1>
            <p className="text-[#FF8C38] text-lg mb-6">
              {settings?.tagline ?? "Authentic Indian Home Cooking — Delivered to Your Door"}
            </p>
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#CC5500] transition-colors shadow-lg shadow-orange-900/40"
            >
              🍳 Find a Kitchen Near You →
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-[#1A0A00] text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "📍", title: "Find a Kitchen", desc: "Browse home cooks near you and pick one that's open." },
              { step: "2", icon: "🍽️", title: "Choose Your Dishes", desc: "Browse that kitchen's menu and add items to your cart." },
              { step: "3", icon: "🚚", title: "Get It Delivered", desc: "Place your order and track it to your door." },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-[#E8D5C0] p-6 text-center shadow-sm">
                <div className="w-10 h-10 bg-[#FF6B00] text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {s.step}
                </div>
                <div className="text-4xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-[#1A0A00] mb-1">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 bg-[#1A0A00] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#2D1200] transition-colors"
            >
              🍳 Browse Kitchens Near You →
            </Link>
          </div>
        </div>

        {/* Info pills */}
        <div className="bg-white border-t border-[#E8D5C0] py-6">
          <div className="max-w-4xl mx-auto px-4 flex flex-wrap justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              🚚 Delivery from ${settings?.deliveryFee?.toFixed(2) ?? "5.00"}
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              🎁 Free delivery over ${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              ⏱ Ready in ~{settings?.estimatedPrepTime ?? 20} mins
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Vendor selected — show that vendor's menu
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      {/* Vendor hero banner */}
      <div
        className="relative py-12 px-4 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1A0A00 0%, #4A1500 50%, #7C2D12 100%)" }}
      >
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-5xl mb-3">🍳</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {vendorName ?? "Kitchen Menu"}
          </h1>
          {vendor?.businessAddress && (
            <p className="text-[#FF8C38] text-base mb-2">{vendor.businessAddress}</p>
          )}
          {vendor && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${vendor.isOpen ? "bg-green-400" : "bg-gray-400"}`} />
              <span className={`text-sm font-medium ${vendor.isOpen ? "text-green-300" : "text-gray-400"}`}>
                {vendor.isOpen ? "Open now — accepting orders" : "Currently closed"}
              </span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="bg-[#FF6B00]/20 border border-[#FF6B00] text-[#FF8C38] px-4 py-2 rounded-full">
              🚚 Delivery from ${settings?.deliveryFee?.toFixed(2) ?? "5.00"}
            </span>
            <span className="bg-[#FF6B00]/20 border border-[#FF6B00] text-[#FF8C38] px-4 py-2 rounded-full">
              🎁 Free delivery over ${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}
            </span>
            <span className="bg-[#FF6B00]/20 border border-[#FF6B00] text-[#FF8C38] px-4 py-2 rounded-full">
              ⏱ Ready in ~{settings?.estimatedPrepTime ?? 20} mins
            </span>
          </div>
        </div>
      </div>

      <MenuClient categories={categories} settings={settings} vendorId={vendorId} />
    </div>
  );
}
