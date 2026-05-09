"use client";
import { useCartStore, OrderType } from "@/store/cartStore";
import { formatCurrency, pointsToDiscount } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Package, UtensilsCrossed } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const ORDER_TYPES: { type: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "delivery", label: "Delivery", icon: <Truck size={20} />, desc: "~40 mins" },
  { type: "pickup", label: "Pickup", icon: <Package size={20} />, desc: "~20 mins" },
  { type: "dine-in", label: "Dine In", icon: <UtensilsCrossed size={20} />, desc: "Eat here" },
];

export default function CartPage() {
  const { items, orderType, loyaltyPointsToUse, updateQuantity, removeItem, setOrderType, setLoyaltyPointsToUse, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();
  const deliveryFee = orderType === "delivery" && subtotal < 60 ? 5 : 0;
  const loyaltyDiscount = pointsToDiscount(loyaltyPointsToUse);
  const tax = (subtotal + deliveryFee - loyaltyDiscount) * 0.1;
  const total = subtotal + deliveryFee - loyaltyDiscount + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-[#1A0A00] mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Add some delicious Indian dishes to get started!</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#CC5500] transition-colors">
            <ShoppingBag size={18} /> Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A0A00] mb-6 flex items-center gap-2">
          <ShoppingBag className="text-[#FF6B00]" /> Your Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order type selector */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
              <h3 className="font-semibold text-[#1A0A00] mb-3">How would you like your order?</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {ORDER_TYPES.map(({ type, label, icon, desc }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl border-2 transition-all ${
                      orderType === type
                        ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                        : "border-[#E8D5C0] text-gray-600 hover:border-[#FF6B00]/50"
                    }`}
                  >
                    {icon}
                    <span className="font-semibold text-xs sm:text-sm">{label}</span>
                    <span className="hidden sm:block text-xs text-gray-400">{desc}</span>
                    <span className="sm:hidden text-[10px] text-gray-400">{desc.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              {orderType === "dine-in" && (
                <div className="mt-3">
                  <input
                    type="number"
                    placeholder="Table number"
                    onChange={(e) => useCartStore.getState().setTableNumber(parseInt(e.target.value))}
                    className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              )}
            </div>

            {/* Items list */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] divide-y divide-[#E8D5C0]">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFF0E0] rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0">
                    {item.isVeg ? "🥘" : "🍗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[#1A0A00] text-sm truncate">{item.name}</h4>
                    {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                    <p className="text-[#FF6B00] font-bold text-sm">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-[#E8D5C0] flex items-center justify-center hover:border-[#FF6B00] transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center hover:bg-[#CC5500] transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-[#1A0A00]">{formatCurrency(item.price * item.quantity)}</p>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors mt-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special instructions */}
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5">
              <label className="block text-sm font-semibold text-[#1A0A00] mb-2">Special Instructions</label>
              <textarea
                onChange={(e) => useCartStore.getState().setSpecialInstructions(e.target.value)}
                placeholder="Any allergies, dietary requirements or special requests..."
                className="w-full border border-[#E8D5C0] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E8D5C0] p-5 sticky top-24">
              <h3 className="font-bold text-[#1A0A00] text-lg mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {orderType === "delivery" && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery fee</span>
                    <span>{deliveryFee === 0 ? <span className="text-green-600 font-medium">FREE</span> : formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Loyalty discount</span>
                    <span>-{formatCurrency(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-[#E8D5C0] pt-3 flex justify-between font-bold text-[#1A0A00] text-base">
                  <span>Total</span>
                  <span className="text-[#FF6B00]">{formatCurrency(total)}</span>
                </div>
              </div>

              {subtotal < 60 && orderType === "delivery" && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 mb-4">
                  Add {formatCurrency(60 - subtotal)} more for free delivery! 🎉
                </div>
              )}

              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2 w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold text-base hover:bg-[#CC5500] transition-colors shadow-lg shadow-orange-200"
              >
                Proceed to Checkout <ArrowRight size={18} />
              </Link>

              <Link href="/" className="block text-center text-sm text-[#FF6B00] mt-3 hover:underline">
                + Add more items
              </Link>

              {/* Loyalty info */}
              <div className="mt-4 bg-[#FFF8F0] rounded-xl p-3 text-xs text-[#7C4A1E]">
                🌟 You&apos;ll earn <strong>{Math.floor(total * 5)}</strong> loyalty points on this order!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
