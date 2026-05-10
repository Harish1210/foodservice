import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import MenuClient from "@/components/MenuClient";
import VendorReviewsSection from "@/components/VendorReviewsSection";
import ReviewsTicker from "@/components/ReviewsTicker";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const { vendor: vendorId } = await searchParams;
  if (!vendorId) redirect("/vendors");

  const [categories, settings, vendor] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: {
        menuItems: {
          where: { isAvailable: true, vendorId },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: { sortOrder: "asc" },
    }).then((cats) => cats.filter((c) => c.menuItems.length > 0)),
    prisma.businessSettings.findFirst(),
    prisma.user.findUnique({
      where: { id: vendorId },
      select: {
        id: true, businessName: true, firstName: true, lastName: true,
        businessAddress: true, isOpen: true,
      },
    }),
  ]);

  if (!vendor) redirect("/vendors");

  const vendorName =
    vendor.businessName ??
    `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim();

  return (
    <div className="w-full min-h-screen bg-[#F6F6F6] overflow-x-hidden">
      <Navbar />

      {/* ── Vendor hero ── */}
      <div className="w-full relative bg-gray-900">
        {/* Subtle background texture */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "linear-gradient(135deg, #FF6B00 0%, transparent 60%)" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-7 sm:py-10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#FF6B00] to-[#E55A00] rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-black shrink-0 shadow-lg shadow-orange-900/30">
              {(vendorName || "K")[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight mb-1 truncate">
                {vendorName || "Kitchen Menu"}
              </h1>

              {vendor.businessAddress && (
                <p className="text-gray-400 text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                  📍 <span className="line-clamp-1">{vendor.businessAddress}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {/* Open/closed status */}
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                  vendor.isOpen
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-gray-700 text-gray-400 border border-gray-600"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vendor.isOpen ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                  {vendor.isOpen ? "Open now" : "Closed"}
                </span>

                {/* Info pills */}
                {[
                  `🚚 From $${settings?.deliveryFee?.toFixed(2) ?? "5.00"}`,
                  `🎁 Free over $${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}`,
                  `⏱ ~${settings?.estimatedPrepTime ?? 20} min`,
                ].map((p) => (
                  <span key={p} className="text-xs text-gray-400 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews ticker */}
        <div className="w-full overflow-hidden">
          <ReviewsTicker vendorId={vendorId} />
        </div>
      </div>

      <MenuClient categories={categories} settings={settings} vendorId={vendorId} />
      <VendorReviewsSection vendorId={vendorId} />
    </div>
  );
}
