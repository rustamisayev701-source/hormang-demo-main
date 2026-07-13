/**
 * StarRating — renders 5 stars with partial fill support.
 *
 * Each star: gray empty background, amber overlay clipped to the exact
 * fractional percentage using overflow-hidden on an absolutely-positioned div.
 *
 * 3.3  → 3 full + 30 % of 4th star
 * 4.7  → 4 full + 70 % of 5th star
 */
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: string;
}

export function StarRating({ rating, size = "w-4 h-4" }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, clamped - index)) * 100;
        return (
          <div key={index} className={`relative flex-shrink-0 ${size}`}>
            <Star className={`absolute inset-0 ${size} fill-gray-200 text-gray-200`} />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill}%` }}
            >
              <Star className={`${size} fill-amber-400 text-amber-400`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
