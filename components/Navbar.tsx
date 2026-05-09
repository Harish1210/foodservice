"use client";
import Link from "next/link";
import { ShoppingCart, Menu, X, Phone, MapPin, User, ChefHat, LogIn, UtensilsCrossed } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const count = useCartStore((s) => s.getItemCount());
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setUserName(d.user.firstName ?? d.user.email);
        setUserRole(d.user.role);
      }
    }).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#1A0A00] shadow-lg">
      {/* Top bar */}
      <div className="bg-[#FF6B00] text-white text-xs py-1 px-4 flex justify-between items-center">
        <span className="flex items-center gap-1">
          <Phone size={11} /> +61 2 9000 1234
        </span>
        <span className="hidden sm:flex items-center gap-1">
          <MapPin size={11} /> 123 George St, Sydney NSW 2000
        </span>
        <span>Open: 11am – 10pm</span>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🍛</span>
          <div>
            <div className="text-white font-bold text-lg leading-tight group-hover:text-[#FF6B00] transition-colors">
              Home Food Service
            </div>
            <div className="text-[#FF6B00] text-xs">Authentic Indian Home Cooking</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/vendors" className="flex items-center gap-1.5 bg-[#FF6B00] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#CC5500] transition-colors">
            <UtensilsCrossed size={14} /> Find Kitchens
          </Link>
          <Link href="/" className="text-gray-300 hover:text-[#FF6B00] transition-colors font-medium">Menu</Link>
          <Link href="/reservations" className="text-gray-300 hover:text-[#FF6B00] transition-colors font-medium">Reservations</Link>
          <Link href="/orders" className="text-gray-300 hover:text-[#FF6B00] transition-colors font-medium">My Orders</Link>
          {userRole === "vendor" && (
            <Link href="/vendor" className="flex items-center gap-1 text-gray-300 hover:text-[#FF6B00] transition-colors font-medium">
              <ChefHat size={14} /> Vendor
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {userName ? (
            <Link href="/profile" className="hidden md:flex items-center gap-2 text-gray-300 hover:text-[#FF6B00] transition-colors text-sm font-medium">
              <div className="w-7 h-7 bg-[#FF6B00] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {userName[0].toUpperCase()}
              </div>
              <span className="hidden lg:inline">{userName}</span>
            </Link>
          ) : (
            <Link href="/login" className="hidden md:flex items-center gap-1.5 text-gray-300 hover:text-[#FF6B00] transition-colors text-sm font-medium">
              <LogIn size={16} /> Sign in
            </Link>
          )}
          <Link href="/cart" className="relative flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#CC5500] transition-colors">
            <ShoppingCart size={18} />
            <span className="hidden sm:inline text-sm">Cart</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-[#FF6B00] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                {count}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden text-white p-1">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#2A1500] border-t border-[#FF6B00]/30 px-4 py-4 flex flex-col gap-3 animate-fade-in">
          <Link href="/vendors" onClick={() => setOpen(false)} className="text-[#FF6B00] font-semibold py-2 border-b border-[#FF6B00]/20">🍳 Find Kitchens Near You</Link>
          <Link href="/" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2 border-b border-[#FF6B00]/20">Menu</Link>
          <Link href="/reservations" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2 border-b border-[#FF6B00]/20">Reservations</Link>
          <Link href="/orders" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2 border-b border-[#FF6B00]/20">My Orders</Link>
          {userRole === "vendor" && (
            <Link href="/vendor" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2 border-b border-[#FF6B00]/20">Vendor Dashboard</Link>
          )}
          {userName ? (
            <Link href="/profile" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2">My Profile ({userName})</Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="text-gray-300 hover:text-[#FF6B00] py-2">Sign In / Register</Link>
          )}
        </div>
      )}
    </header>
  );
}
