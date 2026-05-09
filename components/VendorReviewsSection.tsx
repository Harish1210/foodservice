"use client";
import { useEffect, useState } from "react";
import { Star, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

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
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? "fill-[#FF6B00] text-[#FF6B00]" : "text-gray-300"}
        />
      ))}
    </span>
  );
}

const LABEL: Record<number, string> = { 5: "Excellent", 4: "Great", 3: "Good", 2: "Fair", 1: "Poor" };

export default function VendorReviewsSection({ vendorId }: { vendorId: string }) {
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [avgFood,   setAvgFood]   = useState(0);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [showAll,   setShowAll]   = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?vendorId=${vendorId}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews ?? []);
        setAvgRating(d.avgRating ?? 0);
        setAvgFood(d.avgFood ?? 0);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (loading || total === 0) return null;

  const reviewerName = (r: Review) => {
    if (r.customer?.firstName) return `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim();
    if (r.guestName) return r.guestName;
    if (r.guestEmail) return r.guestEmail.split("@")[0];
    return "Anonymous";
  };

  const displayed = showAll ? reviews : reviews.slice(0, 3);

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: (reviews.filter((r) => r.rating === star).length / total) * 100,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="border-t border-[#E8D5C0] pt-10">

        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Star size={18} className="fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1A0A00]">Customer Reviews</h2>
            <p className="text-sm text-gray-500">{total} review{total !== 1 ? "s" : ""} from verified orders</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Score snapshot */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 flex flex-col items-center justify-center shadow-sm">
            <p className="text-6xl font-black text-[#1A0A00] leading-none">{avgRating.toFixed(1)}</p>
            <Stars value={avgRating} size={22} />
            <p className="text-sm text-gray-500 mt-2">{LABEL[Math.round(avgRating)] ?? "Good"}</p>
            <p className="text-xs text-gray-400 mt-1">Based on {total} reviews</p>
            {avgFood > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E8D5C0] w-full text-center">
                <p className="text-xs text-gray-400 mb-1">Food Quality</p>
                <div className="flex items-center justify-center gap-1">
                  <Stars value={avgFood} size={14} />
                  <span className="text-xs font-semibold text-[#1A0A00] ml-1">{avgFood.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Rating distribution */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 shadow-sm">
            <p className="text-sm font-bold text-[#1A0A00] mb-4">Rating Breakdown</p>
            <div className="space-y-2.5">
              {dist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-3 shrink-0">{star}</span>
                  <Star size={11} className="fill-[#FF6B00] text-[#FF6B00] shrink-0" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B00] rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="bg-white rounded-2xl border border-[#E8D5C0] p-6 shadow-sm">
            <p className="text-sm font-bold text-[#1A0A00] mb-4">Highlights</p>
            <div className="space-y-3">
              {avgRating >= 4 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
                  <span>🏆</span> Highly rated kitchen
                </div>
              )}
              {avgFood >= 4 && (
                <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-xl px-3 py-2">
                  <span>🍳</span> Excellent food quality
                </div>
              )}
              {total >= 10 && (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                  <span>✅</span> {total}+ verified orders
                </div>
              )}
              {reviews.some((r) => r.reply) && (
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-xl px-3 py-2">
                  <span>💬</span> Responds to feedback
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="space-y-4">
          {displayed.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-[#E8D5C0] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-[#CC5500] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {reviewerName(review)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#1A0A00]">{reviewerName(review)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {review.order?.type && (
                        <span className="ml-2 capitalize">
                          · {review.order.type === "dine-in" ? "🍽 Dine-in" : review.order.type === "pickup" ? "🥡 Pickup" : "🚚 Delivery"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Stars value={review.rating} size={15} />
                  {review.foodRating && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Food: {"⭐".repeat(review.foodRating)}
                    </p>
                  )}
                </div>
              </div>

              {/* Comment */}
              {review.comment && (
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  &ldquo;{review.comment}&rdquo;
                </p>
              )}

              {/* Vendor reply */}
              {review.reply && (
                <div className="bg-[#FFF8F0] border border-[#E8D5C0] rounded-xl p-3 border-l-4 border-l-[#FF6B00]">
                  <p className="text-xs font-bold text-[#FF6B00] mb-1 flex items-center gap-1">
                    <MessageSquare size={11} /> Kitchen&apos;s reply
                  </p>
                  <p className="text-sm text-gray-600">{review.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show more / less toggle */}
        {total > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 border-[#E8D5C0] rounded-2xl text-sm font-semibold text-gray-600 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all"
          >
            {showAll ? (
              <><ChevronUp size={16} /> Show fewer reviews</>
            ) : (
              <><ChevronDown size={16} /> See all {total} reviews</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
