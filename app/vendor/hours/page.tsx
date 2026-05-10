"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Save, Loader2, ChevronLeft, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

type DayKey = typeof DAYS[number]["key"];

type DayHours = { isOpen: boolean; open: string; close: string };
type Hours = Record<DayKey, DayHours> & { override: "open" | "closed" | null };

const DEFAULT_HOURS: Hours = {
  mon: { isOpen: true,  open: "09:00", close: "21:00" },
  tue: { isOpen: true,  open: "09:00", close: "21:00" },
  wed: { isOpen: true,  open: "09:00", close: "21:00" },
  thu: { isOpen: true,  open: "09:00", close: "21:00" },
  fri: { isOpen: true,  open: "09:00", close: "22:00" },
  sat: { isOpen: true,  open: "10:00", close: "22:00" },
  sun: { isOpen: false, open: "10:00", close: "20:00" },
  override: null,
};

function fmt12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function VendorHoursPage() {
  const router = useRouter();
  const [hours, setHours]                   = useState<Hours>(DEFAULT_HOURS);
  const [isOpen, setIsOpen]                 = useState(true);
  const [supportsDelivery, setDelivery]     = useState(true);
  const [supportsPickup, setPickup]         = useState(true);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [savingFulfillment, setSavingFulfi] = useState(false);

  // Kitchen details
  const [businessName,    setBusinessName]    = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [phone,           setPhone]           = useState("");
  const [savingDetails,   setSavingDetails]   = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.user || d.user.role !== "vendor") { router.push("/login?role=vendor"); }
    });
    fetch("/api/vendor/hours").then((r) => r.json()).then((d) => {
      if (d.hours) setHours(d.hours);
      setIsOpen(d.isOpen ?? true);
    }).finally(() => setLoading(false));
    fetch("/api/vendor/fulfillment").then((r) => r.json()).then((d) => {
      setDelivery(d.supportsDelivery ?? true);
      setPickup(d.supportsPickup ?? true);
    });
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setBusinessName(d.user.businessName ?? "");
        setBusinessAddress(d.user.businessAddress ?? "");
        setPhone(d.user.phone ?? "");
      }
    });
  }, [router]);

  const saveDetails = async () => {
    if (!businessAddress.trim()) { toast.error("Please enter your pickup address"); return; }
    setSavingDetails(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, businessAddress, phone }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Kitchen details saved!");
    } catch { toast.error("Failed to save details"); }
    finally { setSavingDetails(false); }
  };

  const saveFulfillment = async (delivery: boolean, pickup: boolean) => {
    if (!delivery && !pickup) { toast.error("Enable at least one of delivery or pickup"); return; }
    setSavingFulfi(true);
    try {
      await fetch("/api/vendor/fulfillment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportsDelivery: delivery, supportsPickup: pickup }),
      });
      toast.success("Fulfillment settings saved!");
    } catch { toast.error("Failed to save"); }
    finally { setSavingFulfi(false); }
  };

  const updateDay = (day: DayKey, field: keyof DayHours, value: string | boolean) => {
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }));
  };

  const applyAllDays = (template: DayKey) => {
    const src = hours[template];
    setHours((h) => {
      const next = { ...h };
      DAYS.forEach(({ key }) => {
        next[key] = { ...next[key], open: src.open, close: src.close };
      });
      return next;
    });
    toast.success("Times copied to all days");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, isOpen }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Hours saved!");
    } catch {
      toast.error("Failed to save hours");
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async (override: "open" | "closed" | null) => {
    const next = { ...hours, override };
    setHours(next);
    // Also flip isOpen immediately based on override
    const newIsOpen = override === "closed" ? false : override === "open" ? true : isOpen;
    setIsOpen(newIsOpen);
    await fetch("/api/vendor/hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: next, isOpen: newIsOpen }),
    });
    toast.success(override === "closed" ? "Kitchen marked as closed" : override === "open" ? "Kitchen marked as open" : "Override cleared");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  // Determine live status
  const now = new Date();
  const dayNames: DayKey[] = ["sun","mon","tue","wed","thu","fri","sat"];
  const todayKey = dayNames[now.getDay()];
  const todayHours = hours[todayKey];
  const currentTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const scheduledOpen = todayHours.isOpen && currentTime >= todayHours.open && currentTime < todayHours.close;
  const effectivelyOpen = hours.override === "open" ? true : hours.override === "closed" ? false : scheduledOpen;

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
            <h1 className="font-bold text-lg flex items-center gap-2"><Clock size={18} className="text-[#FF6B00]" /> Opening Hours</h1>
            <p className="text-xs text-gray-400">Set the days and times your kitchen is open</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#FF6B00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#CC5500] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Hours
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Kitchen details ── */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold text-sm text-gray-200 mb-1 flex items-center gap-2">
            <MapPin size={15} className="text-[#FF6B00]" /> Kitchen Details
          </h2>
          <p className="text-xs text-gray-500 mb-4">Your pickup address appears in SMS notifications sent to customers.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kitchen / Business Name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Dimple Kitchen"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B00] placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pickup Address *</label>
              <input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="e.g. 12 Smith St, Newtown NSW 2042"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B00] placeholder-gray-600"
              />
              <p className="text-[11px] text-gray-600 mt-1">This is shown to customers who select pickup</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contact Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 000 000"
                type="tel"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B00] placeholder-gray-600"
              />
            </div>
          </div>
          <button
            onClick={saveDetails}
            disabled={savingDetails}
            className="mt-4 flex items-center gap-2 bg-[#FF6B00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#CC5500] transition-colors disabled:opacity-60"
          >
            {savingDetails ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Details
          </button>
        </div>

        {/* ── Fulfillment options ── */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold text-sm text-gray-200 mb-1 flex items-center gap-2">🚚 Order Fulfillment</h2>
          <p className="text-xs text-gray-500 mb-4">Choose how customers can receive their orders from your kitchen.</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Delivery toggle */}
            <button
              onClick={() => { const next = !supportsDelivery; setDelivery(next); saveFulfillment(next, supportsPickup); }}
              disabled={savingFulfillment}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${supportsDelivery ? "border-[#FF6B00] bg-[#FF6B00]/10" : "border-white/10 bg-white/5 opacity-60"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${supportsDelivery ? "bg-[#FF6B00]" : "bg-white/10"}`}>🚚</div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white">Delivery</p>
                <p className="text-xs text-gray-400">{supportsDelivery ? "Enabled" : "Disabled"}</p>
              </div>
              <div className={`ml-auto shrink-0 w-5 h-5 rounded-full border-2 ${supportsDelivery ? "bg-[#FF6B00] border-[#FF6B00]" : "border-gray-600"} flex items-center justify-center`}>
                {supportsDelivery && <span className="text-white text-xs font-black">✓</span>}
              </div>
            </button>
            {/* Pickup toggle */}
            <button
              onClick={() => { const next = !supportsPickup; setPickup(next); saveFulfillment(supportsDelivery, next); }}
              disabled={savingFulfillment}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${supportsPickup ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5 opacity-60"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${supportsPickup ? "bg-blue-500" : "bg-white/10"}`}>🏃</div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white">Pickup</p>
                <p className="text-xs text-gray-400">{supportsPickup ? "Enabled" : "Disabled"}</p>
              </div>
              <div className={`ml-auto shrink-0 w-5 h-5 rounded-full border-2 ${supportsPickup ? "bg-blue-500 border-blue-500" : "border-gray-600"} flex items-center justify-center`}>
                {supportsPickup && <span className="text-white text-xs font-black">✓</span>}
              </div>
            </button>
          </div>
        </div>

        {/* Live status banner */}
        <div className={`rounded-2xl border p-4 flex items-center justify-between ${
          effectivelyOpen ? "bg-green-900/30 border-green-700/50" : "bg-red-900/30 border-red-700/50"
        }`}>
          <div className="flex items-center gap-3">
            {effectivelyOpen
              ? <CheckCircle size={22} className="text-green-400 shrink-0" />
              : <AlertCircle size={22} className="text-red-400 shrink-0" />}
            <div>
              <p className={`font-bold text-sm ${effectivelyOpen ? "text-green-300" : "text-red-300"}`}>
                Kitchen is currently {effectivelyOpen ? "OPEN" : "CLOSED"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hours.override
                  ? `Manual override: ${hours.override}`
                  : `Today (${DAYS.find(d=>d.key===todayKey)?.label}): ${todayHours.isOpen ? `${fmt12(todayHours.open)} – ${fmt12(todayHours.close)}` : "Closed"}`
                }
              </p>
            </div>
          </div>
          {/* Quick toggle */}
          <button
            onClick={() => setIsOpen((v) => {
              const next = !v;
              fetch("/api/vendor/hours", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ isOpen: next }) });
              toast.success(next ? "Marked as open" : "Marked as closed");
              return next;
            })}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isOpen ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {isOpen ? "Open" : "Closed"}
          </button>
        </div>

        {/* Manual override */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-yellow-400" /> Quick Override
          </h2>
          <p className="text-xs text-gray-500 mb-4">Force your kitchen open or closed regardless of the schedule below. Clear the override to follow the schedule again.</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleOverride("open")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                hours.override === "open"
                  ? "bg-green-600 border-green-600 text-white"
                  : "border-green-700/50 text-green-400 hover:bg-green-900/30"
              }`}
            >
              ✅ Force Open Now
            </button>
            <button
              onClick={() => handleOverride("closed")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                hours.override === "closed"
                  ? "bg-red-600 border-red-600 text-white"
                  : "border-red-700/50 text-red-400 hover:bg-red-900/30"
              }`}
            >
              🔴 Force Closed Now
            </button>
            {hours.override && (
              <button
                onClick={() => handleOverride(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-700 text-gray-400 hover:bg-gray-800 transition-all"
              >
                ↩ Follow Schedule
              </button>
            )}
          </div>
        </div>

        {/* Weekly schedule */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-300">Weekly Schedule</h2>
            <p className="text-xs text-gray-500">Toggle days on/off, set open & close times</p>
          </div>
          <div className="divide-y divide-white/5">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              const isToday = key === todayKey;
              return (
                <div key={key} className={`px-5 py-4 ${isToday ? "bg-[#FF6B00]/5" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {/* Day toggle */}
                    <button
                      type="button"
                      onClick={() => updateDay(key, "isOpen", !day.isOpen)}
                      className={`shrink-0 transition-colors ${day.isOpen ? "text-green-400" : "text-gray-600"}`}
                    >
                      {day.isOpen ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                    <span className={`font-semibold text-sm w-24 ${isToday ? "text-[#FF6B00]" : day.isOpen ? "text-white" : "text-gray-500"}`}>
                      {label}{isToday && <span className="ml-1 text-[10px] text-[#FF6B00] font-bold">TODAY</span>}
                    </span>
                    {!day.isOpen && <span className="text-xs text-gray-600 italic">Closed</span>}
                  </div>

                  {day.isOpen && (
                    <div className="flex items-center gap-3 ml-9 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-10 shrink-0">Opens</label>
                        <input
                          type="time"
                          value={day.open}
                          onChange={(e) => updateDay(key, "open", e.target.value)}
                          className="bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00]"
                        />
                        <span className="text-xs text-gray-500">{fmt12(day.open)}</span>
                      </div>
                      <span className="text-gray-600">–</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-10 shrink-0">Closes</label>
                        <input
                          type="time"
                          value={day.close}
                          onChange={(e) => updateDay(key, "close", e.target.value)}
                          className="bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B00]"
                        />
                        <span className="text-xs text-gray-500">{fmt12(day.close)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAllDays(key)}
                        className="text-[10px] text-[#FF6B00] border border-[#FF6B00]/30 px-2 py-1 rounded-lg hover:bg-[#FF6B00]/10 transition-colors whitespace-nowrap"
                      >
                        Copy to all
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save button (bottom) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3.5 rounded-2xl font-bold hover:bg-[#CC5500] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Opening Hours
        </button>
      </div>
    </div>
  );
}
