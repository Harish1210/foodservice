import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import MenuClient from "@/components/MenuClient";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const { vendor: vendorId } = await searchParams;

  const [categories, settings, vendor] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
            ...(vendorId ? { vendorId } : {}),
          },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: { sortOrder: "asc" },
    }).then((cats) => vendorId ? cats.filter((c) => c.menuItems.length > 0) : cats),
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

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      {/* Hero Banner */}
      <div
        className="relative py-14 px-4 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1A0A00 0%, #4A1500 50%, #7C2D12 100%)" }}
      >
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-5xl mb-3">🍛</div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            {vendorName ?? settings?.name ?? "Home Food Service"}
          </h1>
          <p className="text-[#FF8C38] text-lg mb-2">
            {vendor ? (vendor.businessAddress ?? "Authentic Indian Home Cooking") : (settings?.tagline ?? "Authentic Indian Home Cooking")}
          </p>
          {vendor && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${vendor.isOpen ? "bg-green-400" : "bg-gray-400"}`} />
              <span className={`text-sm font-medium ${vendor.isOpen ? "text-green-300" : "text-gray-400"}`}>
                {vendor.isOpen ? "Open now" : "Currently closed"}
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
      {/* Vendor selector prompt — shown when no vendor is selected */}
      {!vendorId && (
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="bg-gradient-to-r from-[#1A0A00] to-[#3D1500] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center text-2xl shrink-0">
                🍳
              </div>
              <div>
                <p className="text-white font-bold text-base">Choose a Kitchen Near You</p>
                <p className="text-orange-300 text-sm">Browse home cooks in your area and see their menu</p>
              </div>
            </div>
            <a
              href="/vendors"
              className="shrink-0 flex items-center gap-2 bg-[#FF6B00] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#CC5500] transition-colors text-sm whitespace-nowrap"
            >
              Find Kitchens →
            </a>
          </div>
        </div>
      )}

      <MenuClient categories={categories} settings={settings} vendorId={vendorId ?? null} />
    </div>
  );
}
