"use client";
import { useCartStore, OrderType } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowRight,
  Truck, Package, UtensilsCrossed, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";

const ORDER_TYPES: { type: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "delivery", label: "Delivery",  icon: <Truck size={18} />,         desc: "~40 mins" },
  { type: "pickup",   label: "Pickup",    icon: <Package size={18} />,        desc: "~20 mins" },
  { type: "dine-in",  label: "Dine In",   icon: <UtensilsCrossed size={18} />, desc: "Eat here" },
];

export default function CartPage() {
  const {
    items, orderType, loyaltyPointsToUse,
    updateQuantity, removeItem, setOrderType,
    getSubtotal, selectedVendorId,
  } = useCartStore();

  const subtotal        = getSubtotal();
  const deliveryFee     = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax             = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total           = subtotal + deliveryFee - loyaltyDiscount + tax;

  const [vendorIsOpen, setVendorIsOpen] = useState<boolean | null>(null);
  const [vendorName,   setVendorName]   = useState("");
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
      <div className="min-h-screen bg-[#F6F6F6] pb-20 md:pb-0">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShoppingBag size={36} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 text-sm">Browse local kitchens and add your favourite dishes!</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#E55A00] transition-colors shadow-lg shadow-orange-200"
          >
            Browse Kitchens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-44 md:pb-0">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Order type */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-bold text-gray-900 mb-3">Order type</p>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${
                      orderType === type
                        ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {icon}
                    <span className="font-bold text-xs">{label}</span>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
              {orderType === "dine-in" && (
                <input
                  type="number"
                  placeholder="Table number"
                  onChange={(e) => useCartStore.getState().setTableNumber(parseInt(e.target.value))}
                  className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900">{items.length} item{items.length !== 1 ? "s" : ""}</p>
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 px-5 py-4 ${idx !== items.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  {/* Emoji / image */}
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                    {item.isVeg ? "🥘" : "🍗"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    {item.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{item.notes}</p>}
                    <p className="text-[#FF6B00] font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Qty controls */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-full px-1 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#FF6B00] text-white flex items-center justify-center hover:bg-[#E55A00] active:scale-95 transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-400 active:scale-95 transition-all p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special instructions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-bold text-gray-900 mb-2">Special instructions</p>
              <textarea
                onChange={(e) => useCartStore.getState().setSpecialInstructions(e.target.value)}
                placeholder="Allergies, dietary needs, special requests…"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none text-gray-700 placeholder-gray-400"
                rows={3}
              />
            </div>
          </div>

          {/* ── Desktop sidebar ── */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl p-5 sticky top-20 shadow-sm border border-gray-100">
              <p className="font-bold text-gray-900 text-base mb-4">Order summary</p>
              <SummaryLines
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                loyaltyDiscount={loyaltyDiscount}
                tax={tax}
                total={total}
                orderType={orderType}
              />
              {subtotal < 60 && orderType === "delivery" && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700 mb-4">
                  🎉 Add {formatCurrency(60 - subtotal)} more for free delivery!
                </div>
              )}
              {kitchenClosed ? (
                <ClosedBanner vendorName={vendorName} />
              ) : (
                <Link
                  href="/checkout"
                  className="flex items-center justify-center gap-2 w-full bg-[#FF6B00] text-white py-4 rounded-2xl font-bold hover:bg-[#E55A00] transition-colors shadow-lg shadow-orange-200 text-sm"
                >
                  Checkout <ArrowRight size={16} />
                </Link>
              )}
              <Link href="/vendors" className="block text-center text-sm text-[#FF6B00] mt-3 hover:underline">
                + Add more items
              </Link>
              <div className="mt-4 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                🌟 You&apos;ll earn <strong className="text-gray-700">{Math.floor(total * 5)}</strong> loyalty points
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-2xl">
        {/* Expandable summary */}
        <button
          onClick={() => setSummaryOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 pt-3 pb-2 text-sm"
        >
          <span className="flex items-center gap-2 text-gray-500 font-medium">
            {summaryOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            {summaryOpen ? "Hide summary" : `${items.length} item${items.length > 1 ? "s" : ""}`}
          </span>
          <span className="font-black text-gray-900">{formatCurrency(total)}</span>
        </button>
        {summaryOpen && (
          <div className="px-5 pb-2 border-t border-gray-50 pt-2">
            <SummaryLines
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              loyaltyDiscount={loyaltyDiscount}
              tax={tax}
              total={total}
              orderType={orderType}
              compact
            />
            {subtotal < 60 && orderType === "delivery" && (
              <p className="text-xs text-orange-600 mt-1">Add {formatCurrency(60 - subtotal)} more for free delivery!</p>
            )}
          </div>
        )}
        <div className="px-4 pb-4 pt-2">
          {kitchenClosed ? (
            <ClosedBanner vendorName={vendorName} />
          ) : (
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full bg-[#FF6B00] text-white py-4 rounded-2xl font-bold text-sm hover:bg-[#E55A00] active:scale-[0.98] transition-all shadow-lg shadow-orange-200"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryLines({
  subtotal, deliveryFee, loyaltyDiscount, tax, total, orderType, compact,
}: {
  subtotal: number; deliveryFee: number; loyaltyDiscount: number; tax: number;
  total: number; orderType: string; compact?: boolean;
}) {
  return (
    <div className={`space-y-2.5 text-sm ${compact ? "mb-1" : "mb-5"}`}>
      <div className="flex justify-between text-gray-500">
        <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
      </div>
      {orderType === "delivery" && (
        <div className="flex justify-between text-gray-500">
          <span>Delivery fee</span>
          <span>{deliveryFee === 0
            ? <span className="text-green-600 font-semibold">FREE</span>
            : formatCurrency(deliveryFee)}
          </span>
        </div>
      )}
      {loyaltyDiscount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Loyalty discount</span>
          <span>−{formatCurrency(loyaltyDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between text-gray-500">
        <span>GST (10%)</span><span>{formatCurrency(tax)}</span>
      </div>
      <div className="border-t border-gray-100 pt-2.5 flex justify-between font-black text-gray-900 text-base">
        <span>Total</span>
        <span className="text-[#FF6B00]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function ClosedBanner({ vendorName }: { vendorName: string }) {
  return (
    <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-sm mb-1">
        <Clock size={15} /> Kitchen Closed
      </div>
      <p className="text-xs text-red-500">
        {vendorName ? `${vendorName} is` : "This kitchen is"} not accepting orders right now.
      </p>
    </div>
  );
}
