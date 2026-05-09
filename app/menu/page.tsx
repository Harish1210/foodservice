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

  // No vendor selected — send the customer to pick one
  if (!vendorId) {
    redirect("/vendors");
  }

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
        id: true,
        businessName: true,
        firstName: true,
        lastName: true,
        businessAddress: true,
        isOpen: true,
      },
    }),
  ]);

  // Vendor not found — send back to vendor list
  if (!vendor) {
    redirect("/vendors");
  }

  const vendorName =
    vendor.businessName ??
    `${vendor.firstName ?? ""} ${vendor.lastName ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* Vendor hero banner */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0D0500 0%, #3D1200 50%, #7C2D12 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[url('/logo.jpg')] bg-center bg-cover opacity-5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 text-center">
          {/* Vendor avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-xl shadow-orange-900/50">
            {(vendorName || "K")[0].toUpperCase()}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            {vendorName || "Kitchen Menu"}
          </h1>
          {vendor.businessAddress && (
            <p className="text-[#FFB87A] text-sm mb-3 flex items-center justify-center gap-1.5">
              📍 {vendor.businessAddress}
            </p>
          )}
          <div className="inline-flex items-center gap-2 mb-5 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
            <span
              className={`w-2 h-2 rounded-full ${
                vendor.isOpen
                  ? "bg-green-400 shadow-sm shadow-green-400"
                  : "bg-gray-400"
              }`}
            />
            <span
              className={`text-sm font-semibold ${
                vendor.isOpen ? "text-green-300" : "text-gray-400"
              }`}
            >
              {vendor.isOpen ? "Open now — accepting orders" : "Currently closed"}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {[
              {
                icon: "🚚",
                label: `Delivery from $${settings?.deliveryFee?.toFixed(2) ?? "5.00"}`,
              },
              {
                icon: "🎁",
                label: `Free over $${settings?.freeDeliveryOver?.toFixed(0) ?? "60"}`,
              },
              {
                icon: "⏱",
                label: `~${settings?.estimatedPrepTime ?? 20} mins`,
              },
            ].map((p) => (
              <span
                key={p.label}
                className="bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FFB87A] px-3 py-1.5 rounded-full font-medium"
              >
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>

        <ReviewsTicker vendorId={vendorId} />
      </div>

      <MenuClient categories={categories} settings={settings} vendorId={vendorId} />
      <VendorReviewsSection vendorId={vendorId} />
    </div>
  );
}
