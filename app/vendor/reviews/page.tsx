"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronLeft, Loader2, MessageSquare, Send, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

type Review = {
  id: string;
  rating: number;
  foodRating?: number;
  comment?: string;
  reply?: string;
  guestName?: string;
  guestEmail?: string;
  createdAt: string;
  order?: { orderNumber: string; type: string };
  customer?: { firstName?: string; lastName?: string };
};

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(value) ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-300"} />
      ))}
    </span>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-[#1A0A00] w-6 shrink-0">{value.toFixed(1)}</span>
    </div>
  );
}

export default function VendorReviewsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [avgFood,   setAvgFood]   = useState(0);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [replyId,   setReplyId]   = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== "vendor") { router.push("/login?role=vendor"); return; }
      setVendorId(d.user.id);
      loadReviews(d.user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReviews = async (vid: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/reviews?vendorId=${vid}`);
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setAvgRating(data.avgRating ?? 0);
      setAvgFood(data.avgFood ?? 0);
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Reply posted!");
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyText.trim() } : r));
      setReplyId(null);
      setReplyText("");
    } catch {
      toast.error("Failed to post reply");
    } finally { setSaving(false); }
  };

  const dist = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: total > 0 ? (reviews.filter(r => r.rating === star).length / total) * 100 : 0,
  }));

  const reviewerName = (r: Review) => {
    if (r.customer?.firstName) return `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim();
    if (r.guestName) return r.guestName;
    if (r.guestEmail) return r.guestEmail.split("@")[0];
    return "Anonymous";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/vendor")} className="text-gray-400 hover:text-white">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="font-bold text-lg">Customer Reviews</h1>
          <p className="text-xs text-gray-400">{total} review{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star size={36} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg font-semibold">No reviews yet</p>
            <p className="text-gray-600 text-sm mt-2">Reviews appear here after customers rate their delivered orders.</p>
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-8 flex-wrap">
                {/* Big score */}
                <div className="text-center">
                  <p className="text-6xl font-black text-white">{avgRating.toFixed(1)}</p>
                  <Stars value={avgRating} size={20} />
                  <p className="text-gray-400 text-xs mt-1">{total} reviews</p>
                </div>

                {/* Distribution */}
                <div className="flex-1 min-w-[180px] space-y-2">
                  {dist.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-3">{star}</span>
                      <Star size={11} className="text-[#FF6B00] fill-[#FF6B00] shrink-0" />
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6B00] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Sub-ratings */}
                {avgFood > 0 && (
                  <div className="flex-1 min-w-[180px] space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={12} /> Breakdown
                    </p>
                    <RatingBar label="Overall" value={avgRating} />
                    <RatingBar label="Food Quality" value={avgFood} />
                  </div>
                )}
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  {/* Review header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {reviewerName(review)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{reviewerName(review)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          {review.order && ` · #${review.order.orderNumber}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Stars value={review.rating} />
                      {review.foodRating && (
                        <p className="text-xs text-gray-500 mt-0.5">Food: {review.foodRating}/5</p>
                      )}
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                  )}

                  {/* Vendor reply */}
                  {review.reply ? (
                    <div className="bg-gray-800 rounded-xl p-3 border-l-2 border-[#FF6B00]">
                      <p className="text-xs font-semibold text-[#FF6B00] mb-1">Your reply</p>
                      <p className="text-sm text-gray-300">{review.reply}</p>
                    </div>
                  ) : (
                    replyId === review.id ? (
                      <div className="mt-3">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Write a reply to this review…"
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => submitReply(review.id)}
                            disabled={saving || !replyText.trim()}
                            className="flex items-center gap-1.5 bg-[#FF6B00] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#CC5500] disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Post Reply
                          </button>
                          <button
                            onClick={() => { setReplyId(null); setReplyText(""); }}
                            className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyId(review.id); setReplyText(""); }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FF6B00] transition-colors"
                      >
                        <MessageSquare size={12} /> Reply to this review
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
