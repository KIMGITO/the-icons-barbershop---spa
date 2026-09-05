import React, { useState, useEffect } from 'react';
import { Star, Quote, ShieldCheck, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { reviewService } from '../services/reviewService';
import { ProductReview, ServiceReview } from '../types';
import { Button } from './ui/Button';

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

const isServiceReview = (r: ServiceReview | ProductReview): r is ServiceReview =>
  'serviceId' in r && !('productId' in r);

export const TestimonialsSection: React.FC = () => {
  const { services, products, navigateTo } = useApp();
  const { ref: sectionRef, isVisible } = useScrollReveal();
  const [testimonials, setTestimonials] = useState<(ServiceReview | ProductReview)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService.getTestimonials(6)
      .then(res => setTestimonials(res.merged))
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  const getItemName = (review: ServiceReview | ProductReview): string => {
    if (isServiceReview(review)) {
      return services.find(s => s.id === review.serviceId)?.name || 'Studio Service';
    }
    return products.find(p => p.id === review.productId)?.name || 'Grooming Product';
  };

  const getItemType = (review: ServiceReview | ProductReview): 'service' | 'product' =>
    isServiceReview(review) ? 'service' : 'product';

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className={`py-16 sm:py-24 bg-background relative border-t border-white/10 scroll-reveal overflow-hidden ${isVisible ? 'is-visible' : ''}`}
      aria-label="What Our Customers Say"
    >
      {/* Subtle Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
         
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight leading-tight mt-2 mb-3">
            Hear  from other  <span className="text-primary">Icons </span>.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground-light font-light leading-relaxed">
           Reviews from clients who have experienced <span className='text-primary font-script'>The Icons Barbershop</span> .
          </p>
        </div>

        {/* Testimonials Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-muted/50" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 bg-muted/50 rounded" />
                    <div className="h-2.5 w-16 bg-muted/30 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-full bg-muted/30 rounded" />
                  <div className="h-2.5 w-5/6 bg-muted/30 rounded" />
                  <div className="h-2.5 w-3/4 bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((review) => {
              const itemType = getItemType(review);
              const itemName = getItemName(review);
              return (
                <div
                  key={review.id}
                  className="group bg-card border border-white/10 hover:border-primary/50 rounded-2xl p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    {/* Quote Icon + Stars */}
                    <div className="flex items-start justify-between">
                      <Quote className="w-6 h-6 text-primary/40" />
                      <div className="flex items-center text-primary">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(review.rating) ? 'fill-current' : 'opacity-30'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed font-light">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Footer: Avatar + Name + Item */}
                  <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br border flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(review.authorName)}`}>
                      {getInitials(review.authorName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {review.authorName}
                        {review.verifiedPurchase && (
                          <span className="ml-1.5 inline-flex items-center text-[9px] text-emerald-400">
                            <Star className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigateTo(
                          itemType === 'service'
                            ? `/services/${services.find(s => s.id === (review as ServiceReview).serviceId)?.slug || ''}`
                            : `/products/${products.find(p => p.id === (review as ProductReview).productId)?.slug || ''}`
                        )}
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors truncate block max-w-full"
                        title={itemName}
                      >
                        <span className={`uppercase tracking-wider font-bold ${itemType === 'service' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {itemType === 'service' ? 'Service' : 'Product'}
                        </span>
                        <span className="text-muted-foreground"> · {itemName}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <Button
            variant="outline"
            size="md"
            pill
            onClick={() => navigateTo('/services')}
            className="uppercase tracking-wider text-xs shadow-lg group "
          >
            <span>Experience It Yourself</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

      </div>
    </section>
  );
};