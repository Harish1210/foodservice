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
      select: { id: true, businessName: true, firstName: true, lastName: true, businessAddress: true, isOpen: true },
    }),
  ]);

  if (!vendor) redirect("/vendors");

  const vendorName = vendor.businessName ?? `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim();

  return (
    <div className="w-full min-h-screen bg-[#F7F3EE] overflow-x-hidden">
      <Navbar />

      {/* ── Vendor hero ── */}
      <div
        className="w-full relative"
        style={{ background: "linear-gradient(150deg,#0D0500 0%,#3D1200 50%,#7C2D12 90%,#1A0A00 100%)" }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[url('/logo.jpg')] bg-center bg-cover opacity-[0.04] pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 text-center">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-black mx-auto mb-3 shadow-xl shadow-orange-900/50">
            {(vendorName || "K")[0].toUpperCase()}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5 leading-tight px-2">
            {vendorName || "Kitchen Menu"}
          </h1>

          {vendor.businessAddress && (
            <p className="text-[#FFB87A] text-xs sm:text-sm mb-3 flex items-center justify-center gap-1.5 px-4">
              📍 <span className="line-clamp-1">{vendor.businessAddress}</span>
            </p>
          )}

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 mb-4 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full shrink-0 ${vendor.isOpen ? "bg-green-400 shadow-sm shadow-green-400 animate-pulse" : "bg-gray-400"}`} />
            <span className={`text-xs sm:text-sm font-semibold ${vendor.isOpen ? "text-green-300" : "text-gray-400"}`}>
              {vendor.isOpen ? "Open — accepting orders" : "Currently closed"}
            </span>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {[
              { icon: "🚚", label: `Delivery from $${settings?.deliveryFee?.toFixed(2) ?? "5.00"}` },
              { icon: "🎁", label: `Free over $${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}` },
              { icon: "⏱", label: `~${settings?.estimatedPrepTime ?? 20} mins` },
            ].map((p) => (
              <span key={p.label} className="bg-white/10 border border-white/15 text-white/80 px-3 py-1.5 rounded-full font-medium backdrop-blur-sm">
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Reviews ticker — contained inside hero */}
        <div className="w-full overflow-hidden">
          <ReviewsTicker vendorId={vendorId} />
        </div>
      </div>

      <MenuClient categories={categories} settings={settings} vendorId={vendorId} />
      <VendorReviewsSection vendorId={vendorId} />
    </div>
  );
}
