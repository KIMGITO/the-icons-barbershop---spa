import React from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { ProductReview, ServiceReview } from '../../types';

interface ReviewListProps {
  reviews: (ProductReview | ServiceReview)[];
  emptyMessage?: string;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AVATAR_COLORS = [
  'from-primary/40 to-primary/10 border-primary/50 text-primary',
  'from-emerald-500/40 to-emerald-500/10 border-emerald-500/50 text-emerald-400',
  'from-amber-500/40 to-amber-500/10 border-amber-500/50 text-amber-400',
  'from-sky-500/40 to-sky-500/10 border-sky-500/50 text-sky-400',
  'from-rose-500/40 to-rose-500/10 border-rose-500/50 text-rose-400',
  'from-violet-500/40 to-violet-500/10 border-violet-500/50 text-violet-400',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  emptyMessage = 'No reviews yet. Be the first to share your experience!'
}) => {
  if (reviews.length === 0) {
    return (
      <div className="p-6 text-center bg-card border border-border rounded-2xl">
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between space-y-3"
        >
          <div className="space-y-3">
            {/* Header: Avatar + Name + Date */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br border flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(review.authorName)}`}>
                {getInitials(review.authorName)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {review.authorName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {review.date}
                </div>
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex items-center text-primary">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < Math.round(review.rating) ? 'fill-current' : 'opacity-30'}`}
                />
              ))}
              <span className="ml-1.5 text-[10px] font-bold text-foreground">{review.rating}.0</span>
            </div>

            {/* Comment */}
            <p className="text-xs text-foreground leading-relaxed">
              "{review.comment}"
            </p>
          </div>

          {/* Verified Badge */}
          {review.verifiedPurchase && (
            <div className="flex items-center gap-1.5 pt-3 border-t border-border/60 text-[10px] text-success">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Client</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};