"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, X, Save, Loader2, ImageIcon, ToggleLeft, ToggleRight, ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type Category = { id: string; name: string };
type MenuItem = {
  id: string; name: string; description: string | null; price: number; image: string | null;
  isVeg: boolean; isSpicy: boolean; isGlutenFree: boolean; isFeatured: boolean; isAvailable: boolean;
  allergens: string | null; calories: number | null; prepTime: number;
  category: Category; categoryId: string;
};

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isVeg: false, isSpicy: false, isGlutenFree: false, isFeatured: false, isAvailable: true, allergens: "", calories: "", prepTime: "15" };

export default function VendorMenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auth check
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user || d.user.role !== "vendor") { router.push("/login?role=vendor"); return; }
    });
    loadItems();
    fetch("/api/menu").then((r) => r.json()).then((d) => setCategories(d.categories?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) ?? []));
  }, [router]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/vendor/menu-items");
      const d = await r.json();
      setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setImageFile(null); setImagePreview(null); setShowForm(true); };
  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description ?? "", price: String(item.price), categoryId: item.categoryId, isVeg: item.isVeg, isSpicy: item.isSpicy, isGlutenFree: item.isGlutenFree, isFeatured: item.isFeatured, isAvailable: item.isAvailable, allergens: item.allergens ?? "", calories: item.calories ? String(item.calories) : "", prepTime: String(item.prepTime) });
    setImageFile(null);
    setImagePreview(item.image);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.categoryId || !form.price) { toast.error("Name, category and price are required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (imageFile) fd.append("image", imageFile);

      const url = editItem ? `/api/vendor/menu-items/${editItem.id}` : "/api/vendor/menu-items";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editItem ? "Item updated!" : "Item added!");
      if (data.imageWarning) toast("⚠️ " + data.imageWarning, { icon: "📸" });
      setShowForm(false);
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/vendor/menu-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { toast.error("Failed to delete item"); }
    finally { setDeleting(null); }
  };

  const toggleAvailable = async (item: MenuItem) => {
    const fd = new FormData();
    fd.append("isAvailable", String(!item.isAvailable));
    await fetch(`/api/vendor/menu-items/${item.id}`, { method: "PATCH", body: fd });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i));
  };

  const filtered = filterCat === "all" ? items : items.filter((i) => i.categoryId === filterCat);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <Navbar />
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/vendor")} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg">Menu Items</h1>
            <p className="text-xs text-gray-400">{items.length} items · {items.filter(i => i.isAvailable).length} available</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#CC5500] transition-colors">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setFilterCat(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterCat === c.id ? "bg-[#FF6B00] text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#FF6B00]" size={36} /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className={`bg-[#1A1A1A] rounded-2xl border overflow-hidden transition-all ${item.isAvailable ? "border-white/10" : "border-red-900/50 opacity-60"}`}>
                {/* Image */}
                <div className="relative h-40 bg-[#111] flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={36} className="text-gray-600" />
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    {item.isVeg && <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium">🌱 Veg</span>}
                    {item.isSpicy && <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-medium">🌶 Spicy</span>}
                    {item.isFeatured && <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-medium">⭐</span>}
                  </div>
                  {/* Toggle available */}
                  <button onClick={() => toggleAvailable(item)}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors">
                    {item.isAvailable
                      ? <ToggleRight size={20} className="text-green-400" />
                      : <ToggleLeft size={20} className="text-gray-500" />}
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-[#FF6B00] font-bold text-sm shrink-0 ml-2">{formatCurrency(item.price)}</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{item.category.name}</p>
                  {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description}</p>}

                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id, item.name)} disabled={deleting === item.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                      {deleting === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit slide-up form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="font-bold text-lg">{editItem ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Photo</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative h-40 bg-[#111] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#FF6B00]/50 overflow-hidden transition-colors"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto text-gray-600 mb-2" size={28} />
                      <p className="text-xs text-gray-500">Click to upload photo</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Item Name *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Butter Chicken" required
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Price (AUD) *</label>
                  <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    type="number" step="0.50" min="0" placeholder="22.90" required
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
                  <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white">
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Short description..."
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Calories</label>
                  <input value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                    type="number" placeholder="e.g. 520"
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Prep time (mins)</label>
                  <input value={form.prepTime} onChange={(e) => setForm((f) => ({ ...f, prepTime: e.target.value }))}
                    type="number" placeholder="15"
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Allergens</label>
                <input value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
                  placeholder="e.g. dairy, nuts, gluten"
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] text-white placeholder-gray-600" />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "isVeg", label: "🌱 Vegetarian" },
                  { key: "isSpicy", label: "🌶️ Spicy" },
                  { key: "isGlutenFree", label: "🌾 Gluten Free" },
                  { key: "isFeatured", label: "⭐ Featured" },
                  { key: "isAvailable", label: "✅ Available" },
                ].map(({ key, label }) => (
                  <button key={key} type="button"
                    onClick={() => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form[key as keyof typeof form] ? "bg-[#FF6B00]/20 border-[#FF6B00]/50 text-[#FF6B00]" : "bg-white/5 border-white/10 text-gray-400"
                    }`}>
                    <span>{label}</span>
                    {form[key as keyof typeof form]
                      ? <ToggleRight size={18} className="text-[#FF6B00]" />
                      : <ToggleLeft size={18} className="text-gray-600" />}
                  </button>
                ))}
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#CC5500] transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {editItem ? "Save Changes" : "Add to Menu"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
