"use client";
import { useState, useRef, useCallback } from "react";
import { Search, Mic, MicOff, ShoppingCart, Plus, Minus, Flame, Leaf, X, Filter } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isVeg: boolean;
  isSpicy: boolean;
  isGlutenFree: boolean;
  isFeatured: boolean;
  calories: number | null;
  allergens: string | null;
  prepTime: number;
  image: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  menuItems: MenuItem[];
}

interface Props {
  categories: Category[];
  settings: { deliveryFee: number; freeDeliveryOver: number; taxRate: number } | null;
  vendorId?: string | null;
}

export default function MenuClient({ categories, settings, vendorId }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "veg" | "spicy" | "glutenfree">("all");
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const cartCount = useCartStore((s) => s.getItemCount());
  const cartTotal = useCartStore((s) => s.getSubtotal());
  const selectedVendorName = useCartStore((s) => s.selectedVendorName);

  const allItems = categories.flatMap((c) => c.menuItems);

  const filtered = allItems.filter((item) => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCat = activeCategory === "all" || categories.find((c) => c.id === activeCategory)?.menuItems.some((m) => m.id === item.id);
    const matchFilter =
      filter === "all" ||
      (filter === "veg" && item.isVeg) ||
      (filter === "spicy" && item.isSpicy) ||
      (filter === "glutenfree" && item.isGlutenFree);
    return matchSearch && matchCat && matchFilter;
  });

  const getItemQtyInCart = (id: string) =>
    items.filter((i) => i.menuItemId === id).reduce((s, i) => s + i.quantity, 0);

  const handleAddToCart = (item: MenuItem, quantity = 1, note = "") => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      notes: note || undefined,
      isVeg: item.isVeg,
    });
    toast.success(`${item.name} added to cart!`);
    setSelectedItem(null);
    setQty(1);
    setItemNote("");
  };

  const startVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice ordering not supported in this browser. Try Chrome.");
      return;
    }
    const SR = (window as Window & typeof globalThis & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
               (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-AU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setVoiceText(text);
      setListening(false);
      await processVoiceOrder(text);
    };
    recognition.onerror = () => { setListening(false); toast.error("Voice not recognised. Please try again."); };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const processVoiceOrder = async (text: string) => {
    try {
      const res = await fetch("/api/voice-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, menuItems: allItems.map((i) => ({ id: i.id, name: i.name, price: i.price })) }),
      });
      const data = await res.json();
      if (data.items?.length) {
        data.items.forEach((found: { id: string; quantity: number }) => {
          const item = allItems.find((i) => i.id === found.id);
          if (item) handleAddToCart(item, found.quantity || 1);
        });
        toast.success(`Voice order processed! Added ${data.items.length} item(s).`);
      } else {
        toast(`I heard: "${text}" — no matching items found. Try searching manually.`, { icon: "🎙️" });
      }
    } catch {
      const lower = text.toLowerCase();
      const matched = allItems.filter((i) => lower.includes(i.name.toLowerCase().split(" ")[0]));
      if (matched.length) {
        matched.slice(0, 3).forEach((item) => handleAddToCart(item, 1));
        toast.success(`Added ${matched.length} item(s) from voice!`);
      } else {
        toast(`I heard: "${text}" — please try again or search manually.`, { icon: "🎙️" });
      }
    }
  };

  const displayItems = search || filter !== "all" ? filtered :
    activeCategory === "all" ? allItems :
    categories.find((c) => c.id === activeCategory)?.menuItems ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Vendor context banner */}
      {vendorId && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-5 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🍳</span>
            <span className="text-[#1A0A00]">
              Showing menu from <strong className="text-[#FF6B00]">{selectedVendorName ?? "this kitchen"}</strong>
            </span>
          </div>
          <Link
            href="/vendors"
            className="shrink-0 text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-xl hover:bg-[#FF6B00] hover:text-white transition-colors"
          >
            Change Kitchen
          </Link>
        </div>
      )}

      {/* Voice + Search bar */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={startVoice}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
            listening
              ? "bg-red-500 text-white shadow-lg shadow-red-200"
              : "bg-[#FF6B00] text-white hover:bg-[#CC5500]"
          } voice-btn ${listening ? "listening" : ""}`}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
          <span className="hidden sm:inline">{listening ? "Listening..." : "Voice Order"}</span>
        </button>
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, ingredients..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E8D5C0] bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-[#1A0A00]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {voiceText && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 flex items-center gap-2">
          <span>🎙️</span> I heard: <strong>&quot;{voiceText}&quot;</strong>
          <button onClick={() => setVoiceText("")} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[{ key: "all", label: "All", icon: "🍽️" }, { key: "veg", label: "Vegetarian", icon: "🥦" }, { key: "spicy", label: "Spicy", icon: "🌶️" }, { key: "glutenfree", label: "Gluten Free", icon: "✨" }].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-[#FF6B00] text-white shadow"
                : "bg-white text-[#7C4A1E] border border-[#E8D5C0] hover:border-[#FF6B00]"
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-52 shrink-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeCategory === "all"
                ? "bg-[#FF6B00] text-white"
                : "bg-white text-[#7C4A1E] hover:bg-orange-50 border border-[#E8D5C0]"
            }`}
          >
            🍽️ All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white text-[#7C4A1E] hover:bg-orange-50 border border-[#E8D5C0]"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </aside>

        {/* Menu grid */}
        <div className="flex-1">
          {/* Mobile category scroll */}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={() => setActiveCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeCategory === "all" ? "bg-[#FF6B00] text-white" : "bg-white border border-[#E8D5C0] text-[#7C4A1E]"}`}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeCategory === cat.id ? "bg-[#FF6B00] text-white" : "bg-white border border-[#E8D5C0] text-[#7C4A1E]"}`}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {search || filter !== "all" || activeCategory !== "all" ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">{displayItems.length} item{displayItems.length !== 1 ? "s" : ""} found</p>
              <ItemGrid items={displayItems} onSelect={setSelectedItem} getQty={getItemQtyInCart} onAdd={handleAddToCart} />
            </div>
          ) : (
            categories.map((cat) => (
              cat.menuItems.length > 0 && (
                <div key={cat.id} id={cat.id} className="mb-10">
                  <h2 className="text-xl font-bold text-[#1A0A00] mb-4 flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.name}
                  </h2>
                  <ItemGrid items={cat.menuItems} onSelect={setSelectedItem} getQty={getItemQtyInCart} onAdd={handleAddToCart} />
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <Link href="/cart" className="flex items-center gap-4 bg-[#1A0A00] text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-[#2A1500] transition-colors">
            <div className="bg-[#FF6B00] rounded-lg p-1.5">
              <ShoppingCart size={18} />
            </div>
            <span className="font-semibold">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
            <span className="text-gray-400 text-sm">•</span>
            <span className="text-[#FF8C38] font-bold">{formatCurrency(cartTotal)}</span>
            <span className="text-sm text-gray-300">View Cart →</span>
          </Link>
        </div>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {selectedItem.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1A0A00]">{selectedItem.name}</h3>
                  <div className="flex gap-2 mt-1">
                    {selectedItem.isVeg ? (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-600 rounded px-2 py-0.5 text-xs font-semibold">
                        <Leaf size={10} /> VEG
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-600 rounded px-2 py-0.5 text-xs font-semibold">
                        NON-VEG
                      </span>
                    )}
                    {selectedItem.isSpicy && (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 rounded px-2 py-0.5 text-xs font-semibold">
                        <Flame size={10} /> SPICY
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={22} />
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 text-sm mb-4">{selectedItem.description}</p>
              )}

              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                {selectedItem.calories && <span>🔥 {selectedItem.calories} cal</span>}
                <span>⏱ {selectedItem.prepTime} mins</span>
                {selectedItem.allergens && <span>⚠️ {selectedItem.allergens}</span>}
              </div>

              <textarea
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="Special instructions (e.g. no onions, extra spicy)..."
                className="w-full border border-[#E8D5C0] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] mb-4 resize-none"
                rows={2}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-[#FFF8F0] rounded-xl p-1">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-lg bg-white border border-[#E8D5C0] flex items-center justify-center hover:border-[#FF6B00]">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center hover:bg-[#CC5500]">
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => handleAddToCart(selectedItem, qty, itemNote)}
                  className="flex items-center gap-2 bg-[#FF6B00] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#CC5500] transition-colors"
                >
                  <ShoppingCart size={16} />
                  Add {formatCurrency(selectedItem.price * qty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemGrid({ items, onSelect, getQty, onAdd }: {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  getQty: (id: string) => number;
  onAdd: (item: MenuItem, qty: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const inCart = getQty(item.id);
        return (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-[#E8D5C0] overflow-hidden hover:shadow-md hover:border-[#FF6B00]/40 transition-all group cursor-pointer"
            onClick={() => onSelect(item)}
          >
            {/* Item image or emoji fallback */}
            <div className="h-36 bg-gradient-to-br from-[#FFF0E0] to-[#FFE0C0] flex items-center justify-center text-5xl relative overflow-hidden">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span>{item.isVeg ? "🥘" : item.isSpicy ? "🌶️" : "🍗"}</span>
              )}
              {item.isFeatured && (
                <span className="absolute top-2 right-2 bg-[#D4A017] text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow">
                  ⭐ Popular
                </span>
              )}
              {inCart > 0 && (
                <span className="absolute top-2 left-2 bg-[#FF6B00] text-white text-xs px-2 py-0.5 rounded-full font-bold shadow">
                  {inCart} in cart
                </span>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-[#1A0A00] text-sm leading-tight group-hover:text-[#FF6B00] transition-colors">
                  {item.name}
                </h3>
                <div className="flex gap-1 shrink-0">
                  {item.isVeg ? (
                    <span className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm">
                      <span className="w-2 h-2 bg-green-600 rounded-full" />
                    </span>
                  ) : (
                    <span className="w-4 h-4 border-2 border-red-600 flex items-center justify-center rounded-sm">
                      <span className="w-2 h-2 bg-red-600 rounded-full" />
                    </span>
                  )}
                  {item.isSpicy && <Flame size={14} className="text-orange-500" />}
                </div>
              </div>

              {item.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center justify-between">
                <span className="font-bold text-[#FF6B00] text-base">{formatCurrency(item.price)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdd(item, 1); }}
                  className="flex items-center gap-1 bg-[#FF6B00] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#CC5500] transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
