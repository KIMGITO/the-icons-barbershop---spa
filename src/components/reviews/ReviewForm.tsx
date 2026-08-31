import React, { useState } from 'react';
import { Star, Send, CheckCircle2, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ReviewFormProps {
  onSubmit: (data: { authorName: string; rating: number; comment: string }) => Promise<void>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  title = 'Share Your Experience',
  subtitle = 'Your review will be published after admin approval.',
  submitLabel = 'Submit Review'
}) => {
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!authorName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a short review.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        authorName: authorName.trim(),
        rating,
        comment: comment.trim()
      });
      setSuccess(true);
      setAuthorName('');
      setRating(0);
      setComment('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-success/10 border border-success/30 text-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Review Submitted!</h4>
        <p className="text-xs text-muted-foreground">
          Thank you for sharing your experience. Your review is now pending admin approval and will appear here once approved.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSuccess(false)}
          className="text-xs"
        >
          Write Another Review
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {error && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input with Initial Avatar Preview */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your Name
          </label>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {authorName.trim() ? authorName.trim().charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <Input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. David Kiprono"
              className="rounded-xl py-2 text-xs"
              required
            />
          </div>
        </div>

        {/* Star Rating */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 cursor-pointer"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground/40'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-xs font-bold text-foreground">
              {rating > 0 ? `${rating}.0` : 'Select'}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Your Review
          </label>
          <Input
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience — what did you love, what could improve?"
            className="rounded-xl p-2.5 text-xs"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          className="w-full text-xs font-bold uppercase tracking-wider"
        >
          {isSubmitting ? 'Submitting...' : (
            <>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {submitLabel}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};