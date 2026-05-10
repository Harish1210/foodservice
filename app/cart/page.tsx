"use client";
import { useCartStore, OrderType } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Package, UtensilsCrossed, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";

const ORDER_TYPES: { type: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "delivery", label: "Delivery", icon: <Truck size={18} />, desc: "~40 mins" },
  { type: "pickup",   label: "Pickup",   icon: <Package size={18} />, desc: "~20 mins" },
  { type: "dine-in",  label: "Dine In",  icon: <UtensilsCrossed size={18} />, desc: "Eat here" },
];

export default function CartPage() {
  const { items, orderType, loyaltyPointsToUse, updateQuantity, removeItem, setOrderType, getSubtotal, selectedVendorId } = useCartStore();
  const subtotal        = getSubtotal();
  const deliveryFee     = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax             = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total           = subtotal + deliveryFee - loyaltyDiscount + tax;

  const [vendorIsOpen, setVendorIsOpen] = useState<boolean | null>(null);
  const [vendorName,   setVendorName]   = useState<string>("");
  const [summaryOpen,  setSummaryOpen]  = useState(false);

  useEffect(() => {
    if (!selectedVendorId) { setVendorIsOpen(null); return; }
    fetch(`/api/vendors/${selectedVendorId}`)
      .then((r) => r.json())
      .then((d) => {
        const v = d.vendor ?? d;
        setVendorIsOpen(v.isOpen ?? null);
        setVendorName(v.businessName ?? v.firstName ?? "");
      })
      .catch(() => setVendorIsOpen(null));
  }, [selectedVendorId]);

  const kitchenClosed = vendorIsOpen === false;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-[#1A0A00] mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Browse local kitchens and add your favourite dishes!</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-[#CC5500] transition-colors shadow-lg shadow-orange-200">
            <ShoppingBag size={18} /> Browse Kitchens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      {/* ── Page wrapper with bottom padding for sticky bar ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-32 lg:pb-8">

        <h1 className="text-xl sm:text-2xl font-bold text-[#1A0A00] mb-5 flex items-center gap-2">
          <ShoppingBag className="text-[#FF6B00]" size={22} /> Your Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Order type */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-4 sm:p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A0A00] mb-3 text-sm sm:text-base">How would you like your order?</h3>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                      orderType === type
                        ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                        : "border-[#E8D5C0] text-gray-500 hover:border-[#FF6B00]/50"
                    }`}
                  >
                    {icon}
                    <span className="font-bold text-xs">{label}</span>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
              {orderType === "dine-in" && (
                <div className="mt-3">
                  <input
                    type="number"
                    placeholder="Enter your table number"
                    onChange={(e) => useCartStore.getState().setTableNumber(parseInt(e.target.value))}
                    className="w-full border border-[#E8D5C0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              {items.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-3 p-4 ${idx !== items.length - 1 ? "border-b border-[#F0E4D4]" : ""}`}>
                  <div className="w-11 h-11 bg-[#FFF0E0] rounded-xl flex items-center justify-center text-xl shrink-0">
                    {item.isVeg ? "🥘" : "🍗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[#1A0A00] text-sm truncate">{item.name}</h4>
                    {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                    <p className="text-[#FF6B00] font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-xl border border-[#E8D5C0] flex items-center justify-center hover:border-[#FF6B00] active:scale-95 transition-all"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center hover:bg-[#CC5500] active:scale-95 transition-all"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1A0A00]">{formatCurrency(item.price * item.quantity)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-500 active:scale-95 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Special instructions */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-4 sm:p-5 shadow-sm">
              <label className="block text-sm font-semibold text-[#1A0A00] mb-2">Special Instructions</label>
              <textarea
                onChange={(e) => useCartStore.getState().setSpecialInstructions(e.target.value)}
                placeholder="Any allergies, dietary requirements or special requests…"
                className="w-full border border-[#E8D5C0] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* ── Right sidebar (desktop only) ── */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5 sticky top-24 shadow-sm">
              <h3 className="font-bold text-[#1A0A00] text-lg mb-4">Order Summary</h3>
              <SummaryLines subtotal={subtotal} deliveryFee={deliveryFee} loyaltyDiscount={loyaltyDiscount} tax={tax} total={total} orderType={orderType} />
              {subtotal < 60 && orderType === "delivery" && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 mb-4">
                  Add {formatCurrency(60 - subtotal)} more for free delivery! 🎉
                </div>
              )}
              {kitchenClosed ? (
                <ClosedBanner vendorName={vendorName} />
              ) : (
                <Link href="/checkout" className="flex items-center justify-center gap-2 w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold hover:bg-[#CC5500] transition-colors shadow-lg shadow-orange-200">
                  Checkout <ArrowRight size={18} />
                </Link>
              )}
              <Link href="/" className="block text-center text-sm text-[#FF6B00] mt-3 hover:underline">+ Add more items</Link>
              <div className="mt-4 bg-[#FFF8F0] rounded-xl p-3 text-xs text-[#7C4A1E]">
                🌟 You&apos;ll earn <strong>{Math.floor(total * 5)}</strong> loyalty points on this order!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8D5C0] shadow-2xl shadow-black/10">
        {/* Expandable summary */}
        <button
          onClick={() => setSummaryOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 pt-3 pb-2 text-sm font-medium text-gray-600"
        >
          <span className="flex items-center gap-2">
            {summaryOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {summaryOpen ? "Hide summary" : `${items.length} item${items.length > 1 ? "s" : ""} in cart`}
          </span>
          <span className="font-bold text-[#FF6B00] text-base">{formatCurrency(total)}</span>
        </button>
        {summaryOpen && (
          <div className="px-4 pb-2 border-t border-[#F0E4D4] pt-2">
            <SummaryLines subtotal={subtotal} deliveryFee={deliveryFee} loyaltyDiscount={loyaltyDiscount} tax={tax} total={total} orderType={orderType} compact />
            {subtotal < 60 && orderType === "delivery" && (
              <p className="text-xs text-orange-600 mt-1">Add {formatCurrency(60 - subtotal)} more for free delivery!</p>
            )}
          </div>
        )}
        <div className="px-4 pb-5 pt-2">
          {kitchenClosed ? (
            <ClosedBanner vendorName={vendorName} />
          ) : (
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full bg-[#FF6B00] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#CC5500] active:scale-[0.98] transition-all shadow-lg shadow-orange-300"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryLines({ subtotal, deliveryFee, loyaltyDiscount, tax, total, orderType, compact }: {
  subtotal: number; deliveryFee: number; loyaltyDiscount: number; tax: number; total: number;
  orderType: string; compact?: boolean;
}) {
  return (
    <div className={`space-y-2 text-sm ${compact ? "mb-1" : "mb-4"}`}>
      <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
      {orderType === "delivery" && (
        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span>{deliveryFee === 0 ? <span className="text-green-600 font-medium">FREE</span> : formatCurrency(deliveryFee)}</span>
        </div>
      )}
      {loyaltyDiscount > 0 && (
        <div className="flex justify-between text-green-600"><span>Loyalty discount</span><span>-{formatCurrency(loyaltyDiscount)}</span></div>
      )}
      <div className="flex justify-between text-gray-600"><span>GST (10%)</span><span>{formatCurrency(tax)}</span></div>
      <div className="border-t border-[#E8D5C0] pt-2 flex justify-between font-bold text-[#1A0A00]">
        <span>Total</span><span className="text-[#FF6B00]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function ClosedBanner({ vendorName }: { vendorName: string }) {
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-red-600 font-bold mb-1">
        <Clock size={16} /> Kitchen is Closed
      </div>
      <p className="text-sm text-red-500">{vendorName ? `${vendorName} is` : "This kitchen is"} not taking orders right now.</p>
    </div>
  );
}
