"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderType = "delivery" | "pickup" | "dine-in";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: string;
  notes?: string;
  isVeg: boolean;
}

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  tableNumber?: number;
  scheduledAt?: string;
  specialInstructions?: string;
  loyaltyPointsToUse: number;
  selectedVendorId: string | null;
  selectedVendorName: string | null;

  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (n: number) => void;
  setScheduledAt: (d: string) => void;
  setSpecialInstructions: (s: string) => void;
  setLoyaltyPointsToUse: (p: number) => void;
  setSelectedVendor: (id: string | null, name: string | null) => void;

  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: "delivery",
      loyaltyPointsToUse: 0,
      selectedVendorId: null,
      selectedVendorName: null,

      addItem: (item) => {
        const items = get().items;
        const existing = items.find(
          (i) => i.menuItemId === item.menuItemId && i.customizations === item.customizations
        );
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          });
        } else {
          set({
            items: [...items, { ...item, id: `${item.menuItemId}-${Date.now()}` }],
          });
        }
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
        } else {
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          });
        }
      },

      clearCart: () =>
        set({ items: [], loyaltyPointsToUse: 0, specialInstructions: undefined }),

      setSelectedVendor: (id, name) => set({ selectedVendorId: id, selectedVendorName: name }),

      setOrderType: (orderType) => set({ orderType }),
      setTableNumber: (tableNumber) => set({ tableNumber }),
      setScheduledAt: (scheduledAt) => set({ scheduledAt }),
      setSpecialInstructions: (specialInstructions) => set({ specialInstructions }),
      setLoyaltyPointsToUse: (loyaltyPointsToUse) => set({ loyaltyPointsToUse }),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "hfs-cart" }
  )
);
