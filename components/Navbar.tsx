"use client";
import Link from "next/link";
import {
  ShoppingCart, Home, Search, Package, User,
  ChefHat, ShieldCheck, X, Menu, MapPin, UtensilsCrossed,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCartStore((s) => s.getItemCount());
  const selectedVendorId   = useCartStore((s) => s.selectedVendorId);
  const selectedVendorName = useCartStore((s) => s.selectedVendorName);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setHydrated(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserName(d.user.firstName ?? d.user.email);
          setUserRole(d.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const menuHref = hydrated && selectedVendorId
    ? `/menu?vendor=${selectedVendorId}`
    : "/vendors";

  const isVendor = userRole === "vendor";
  const isAdmin  = userRole === "admin";

  const isActive = (paths: string[]) =>
    paths.some((p) => p === "/" ? pathname === "/" : pathname?.startsWith(p));

  return (
    <>
      {/* ── Top navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.jpg"
              alt="Dishly"
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="font-black text-xl text-gray-900 tracking-tight">
              dishly
            </span>
          </Link>

          {/* Desktop centre — kitchen/address pill */}
          {!isVendor && !isAdmin && (
            <Link
              href="/vendors"
              className="hidden md:flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 transition-colors max-w-xs truncate"
            >
              <MapPin size={14} className="text-[#FF6B00] shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate">
                {hydrated && selectedVendorName
                  ? selectedVendorName
                  : "Find kitchens near you"}
              </span>
            </Link>
          )}

          {/* Desktop nav — vendor */}
          {isVendor && (
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: "/vendor",         label: "Dashboard" },
                { href: "/vendor/menu",    label: "My Menu" },
                { href: "/vendor/kitchen", label: "Kitchen Display" },
                { href: "/vendor/hours",   label: "Hours" },
                { href: "/vendor/reviews", label: "Reviews" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    pathname?.startsWith(item.href)
                      ? "bg-orange-50 text-[#FF6B00]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop nav — admin */}
          {isAdmin && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/admin/vendors" className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-1.5">
                <ShieldCheck size={15} /> Approve Vendors
              </Link>
              <Link href="/vendors" className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                All Vendors
              </Link>
            </nav>
          )}

          {/* Right — profile + cart */}
          <div className="flex items-center gap-2">

            {/* Customer desktop nav links */}
            {!isVendor && !isAdmin && (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/orders" className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  Orders
                </Link>
              </div>
            )}

            {/* Profile / Sign in */}
            {userName ? (
              <Link
                href="/profile"
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 bg-[#FF6B00] rounded-full flex items-center justify-center text-white text-xs font-black">
                  {userName[0].toUpperCase()}
                </div>
                <span className="hidden lg:block max-w-[100px] truncate">{userName}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden md:block px-4 py-2 rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
              >
                Sign in
              </Link>
            )}

            {/* Cart button */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-full font-semibold text-sm transition-colors"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:block">Cart</span>
              {hydrated && count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B00] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {count}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down drawer */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in">
            <div className="px-3 py-3 flex flex-col gap-0.5">
              {!isVendor && !isAdmin && (
                <>
                  <MobileNavLink href="/"          label="🏠 Home"            onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendors"   label="🔍 Find Kitchens"   onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href={menuHref}   label="🍽️ Menu"            onClick={() => setMenuOpen(false)} suffix={hydrated && selectedVendorName ? selectedVendorName : undefined} />
                  <MobileNavLink href="/orders"    label="📦 My Orders"       onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/reservations" label="📅 Reservations" onClick={() => setMenuOpen(false)} />
                </>
              )}
              {isVendor && (
                <>
                  <MobileNavLink href="/vendor"           label="📊 Dashboard"       onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendor/menu"      label="🍽️ My Menu"         onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendor/kitchen"   label="🍳 Kitchen Display"  onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendor/hours"     label="🕐 Opening Hours"   onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendor/reviews"   label="⭐ Reviews"          onClick={() => setMenuOpen(false)} />
                </>
              )}
              {isAdmin && (
                <>
                  <MobileNavLink href="/admin/vendors" label="🛡️ Approve Vendors" onClick={() => setMenuOpen(false)} />
                  <MobileNavLink href="/vendors"       label="All Vendors"         onClick={() => setMenuOpen(false)} />
                </>
              )}

              <div className="border-t border-gray-100 mt-2 pt-2">
                {userName ? (
                  <MobileNavLink href="/profile" label={`👤 ${userName}`} onClick={() => setMenuOpen(false)} />
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold text-[#FF6B00] hover:bg-orange-50 transition-colors"
                  >
                    Sign in / Register →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile bottom tab bar (customer only) ── */}
      {!isVendor && !isAdmin && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
          <div className="flex items-center justify-around px-2 pt-2 pb-3">
            {[
              { href: "/",        icon: Home,         label: "Home",    paths: ["/"] },
              { href: "/vendors", icon: UtensilsCrossed, label: "Browse",  paths: ["/vendors", "/menu"] },
              { href: "/cart",    icon: ShoppingCart, label: "Cart",    paths: ["/cart", "/checkout"], badge: hydrated && count > 0 ? count : null },
              { href: "/orders",  icon: Package,      label: "Orders",  paths: ["/orders"] },
              {
                href:  userName ? "/profile" : "/login",
                icon:  User,
                label: userName ? userName.split(" ")[0] || "Me" : "Sign in",
                paths: ["/profile", "/login"],
              },
            ].map((tab) => {
              const active = isActive(tab.paths);
              const Icon   = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-0.5"
                >
                  <div className="relative">
                    <Icon
                      size={23}
                      className={active ? "text-[#FF6B00]" : "text-gray-400"}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                    {tab.badge && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B00] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold max-w-[48px] text-center leading-tight ${
                      active ? "text-[#FF6B00]" : "text-gray-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Vendor mobile bottom tabs */}
      {isVendor && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
          <div className="flex items-center justify-around px-2 pt-2 pb-3">
            {[
              { href: "/vendor",           icon: Home,    label: "Dashboard" },
              { href: "/vendor/menu",      icon: UtensilsCrossed, label: "Menu" },
              { href: "/vendor/kitchen",   icon: ChefHat, label: "Kitchen" },
              { href: "/vendor/hours",     icon: Package, label: "Hours" },
              { href: "/profile",          icon: User,    label: "Profile" },
            ].map((tab) => {
              const active = pathname?.startsWith(tab.href) && tab.href !== "/vendor"
                ? true
                : pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 px-3 py-0.5">
                  <Icon size={23} className={active ? "text-[#FF6B00]" : "text-gray-400"} strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`text-[10px] font-semibold ${active ? "text-[#FF6B00]" : "text-gray-400"}`}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

function MobileNavLink({
  href, label, onClick, suffix,
}: {
  href: string; label: string; onClick: () => void; suffix?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
    >
      <span>{label}</span>
      {suffix && (
        <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full max-w-[110px] truncate">
          {suffix}
        </span>
      )}
    </Link>
  );
}
