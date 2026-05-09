"use client";
import { useEffect, useState, useRef } from "react";
import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment?: string;
  guestName?: string;
  guestEmail?: string;
  createdAt: string;
  customer?: { firstName?: string; lastName?: string };
};

function reviewerName(r: Review) {
  if (r.customer?.firstName) return `${r.customer.firstName} ${r.customer.lastName ?? ""}`.trim();
  if (r.guestName) return r.guestName;
  if (r.guestEmail) return r.guestEmail.split("@")[0];
  return "Customer";
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={n <= rating ? "fill-[#FF6B00] text-[#FF6B00]" : "fill-white/20 text-white/20"}
        />
      ))}
    </span>
  );
}

export default function ReviewsTicker({ vendorId }: { vendorId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef  = useRef<number>(0);
  const posRef   = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/reviews?vendorId=${vendorId}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => {});
  }, [vendorId]);

  // JS-driven smooth scroll — resets seamlessly at the halfway mark
  useEffect(() => {
    const track = trackRef.current;
    if (!track || reviews.length === 0) return;

    posRef.current = 0;
    const speed = 0.6; // px per frame

    const step = () => {
      if (!pausedRef.current && track) {
        posRef.current += speed;
        // Reset when we've scrolled exactly half (the duplicate)
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [reviews]);

  if (reviews.length === 0) return null;

  // Duplicate for seamless loop
  const loop = [...reviews, ...reviews];

  return (
    <div
      className="w-full overflow-hidden py-3"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={trackRef} className="flex gap-4 w-max will-change-transform">
        {loop.map((review, i) => (
          <div
            key={`${review.id}-${i}`}
            className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-5 py-2.5 shrink-0 max-w-xs backdrop-blur-sm"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#CC5500] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {reviewerName(review)[0].toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <StarRow rating={review.rating} />
                <span className="text-white/60 text-xs shrink-0">{reviewerName(review)}</span>
              </div>
              {review.comment && (
                <p className="text-white/80 text-xs truncate max-w-[180px]">
                  &ldquo;{review.comment}&rdquo;
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
