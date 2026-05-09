"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Calendar, Clock, Users, CheckCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const TIME_SLOTS = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "17:00", "17:30", "18:00", "18:30", "19:00",
  "19:30", "20:00", "20:30", "21:00", "21:30",
];

export default function ReservationsPage() {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{ tableNumber: number; time: string; date: string; partySize: string } | null>(null);
  const [form, setForm] = useState({
    guestName: "", guestEmail: "", guestPhone: "",
    date: "", time: "", partySize: "2", notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName || !form.guestEmail || !form.guestPhone || !form.date || !form.time) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to book");
      setConfirmed({
        tableNumber: data.reservation.tableNumber,
        time: form.time,
        date: form.date,
        partySize: form.partySize,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-3xl border border-[#E8D5C0] p-10 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A0A00] mb-2">Table Reserved! 🎉</h2>
            <p className="text-gray-500 mb-8">We look forward to seeing you!</p>
            <div className="bg-[#FFF8F0] rounded-2xl p-5 text-left space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-[#FF6B00]" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-semibold text-[#1A0A00]">{new Date(confirmed.date).toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-[#FF6B00]" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-semibold text-[#1A0A00]">{confirmed.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-[#FF6B00]" size={18} />
                <div>
                  <p className="text-xs text-gray-500">Party Size</p>
                  <p className="font-semibold text-[#1A0A00]">{confirmed.partySize} guests</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🪑</span>
                <div>
                  <p className="text-xs text-gray-500">Table Number</p>
                  <p className="font-semibold text-[#1A0A00]">Table {confirmed.tableNumber}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-6">A confirmation has been noted. Please arrive on time. Call us if you need to cancel.</p>
            <button onClick={() => setConfirmed(null)} className="mt-4 text-[#FF6B00] text-sm font-medium hover:underline">
              Make another reservation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1A0A00] to-[#4A1500] py-12 px-4 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">🪑 Reserve a Table</h1>
        <p className="text-[#FF8C38]">Book your spot for a beautiful dining experience</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6">
            <h3 className="font-bold text-[#1A0A00] mb-4">👤 Your Details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "guestName", label: "Full Name *", type: "text", placeholder: "John Smith" },
                { key: "guestPhone", label: "Phone *", type: "tel", placeholder: "+61 400 000 000" },
                { key: "guestEmail", label: "Email *", type: "email", placeholder: "john@example.com", full: true },
              ].map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Date, Time, Party */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6">
            <h3 className="font-bold text-[#1A0A00] mb-4">📅 Booking Details</h3>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Party Size *</label>
                <select
                  value={form.partySize}
                  onChange={(e) => update("partySize", e.target.value)}
                  className="w-full border border-[#E8D5C0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white"
                >
                  {[1,2,3,4,5,6,7,8].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Time *</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => update("time", slot)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${
                      form.time === slot
                        ? "bg-[#FF6B00] text-white shadow"
                        : "bg-[#FFF8F0] border border-[#E8D5C0] text-[#7C4A1E] hover:border-[#FF6B00]"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6">
            <h3 className="font-bold text-[#1A0A00] mb-3">📝 Special Requests</h3>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any special occasions, dietary requirements, seating preferences..."
              className="w-full border border-[#E8D5C0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#CC5500] transition-colors disabled:opacity-60 shadow-lg shadow-orange-200"
          >
            {loading ? <><Loader2 size={20} className="animate-spin" /> Checking availability...</> : "Confirm Reservation 🍛"}
          </button>
        </form>
      </div>
    </div>
  );
}
