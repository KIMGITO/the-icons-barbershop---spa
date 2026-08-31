import { SafeImage } from './ui/SafeImage';
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, ArrowRight, Sparkles, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from './ui/Button';

export const ProductsSection: React.FC = () => {
  const { products, navigateTo, wishlistSlugs, toggleWishlist, openPurchaseModal } = useApp();
  const { ref: sectionRef, isVisible } = useScrollReveal();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Take the primary curated products for the showcase
  const featuredProducts = products.slice(0, 4);

  const formatKsh = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const handleProductClick = (slug: string) => {
    navigateTo(`/products/${slug}`);
  };

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section 
      id="products-showcase" 
      ref={sectionRef}
      className={`py-16 sm:py-24 bg-background relative border-t border-white/10 scroll-reveal overflow-hidden ${isVisible ? 'is-visible' : ''}`}
      aria-label="Must Have Grooming & Spa Products"
    >
      {/* Subtle Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div className="max-w-2xl text-left">
           

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight leading-tight mb-2">
              Curated Essentials <span className="text-primary"> for Scalp & Hair Mastery </span>
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground-light font-light leading-relaxed max-w-xl">
              Thoughtfully crafted solutions designed to restore root health and enhance hair vitality, blending pure botanical hydration with elite performance.
            </p>
          </div>

          
        </div>

        {/* Product Cards Container: Horizontal Scroll on Small/Medium Screens, Grid on Desktop (4-col) */}
        <div 
          ref={scrollContainerRef}
          className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 sm:mx-0 px-4 sm:px-0 snap-x snap-mandatory scrollbar-none scroll-smooth"
        >
          {featuredProducts.map((product) => {
            const isWishlisted = wishlistSlugs.includes(product.slug);
            return (
              <div 
                key={product.id}
                id={`product-card-${product.slug}`}
                className="group shrink-0 w-[240px] sm:w-[260px] lg:w-auto snap-center relative flex flex-col justify-end bg-card rounded-3xl border border-white/10 hover:border-primary/60 transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/10 h-[380px] sm:h-[400px]"
              >
                {/* Immersive Image with Smooth Gradient Overlay (Matching user reference card style) */}
                <div 
                  onClick={() => handleProductClick(product.slug)}
                  className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
                >
                  <SafeImage 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  {/* Subtle Dark Vignette & Bottom Scrim for high-contrast readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/75 to-black/20" />
                </div>

                {/* Top Overlay Badge / Wishlist */}
                <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between pointer-events-none">
                  

                  {/* Heart Favorite / Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product.slug);
                    }}
                    className={`pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md backdrop-blur-md ${
                      isWishlisted 
                        ? 'bg-primary text-primary-foreground scale-105' 
                        : 'bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/15'
                    }`}
                    aria-label={`Save ${product.name} to wishlist`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Card Bottom Content (Matching Reference Image) */}
                <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-end">
                  
                  {/* Product Title */}
                  <h3 
                    onClick={() => handleProductClick(product.slug)}
                    className="text-white font-heading text-base font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer mb-1.5"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  {/* Short Description */}
                  <p className="text-[11px] sm:text-xs text-white/70 line-clamp-2 leading-relaxed mb-3">
                    {product.shortDescription}
                  </p>

                  {/* Pill Tags: Price Pill & Volume Pill (Clean pill chips matching reference layout without ratings) */}
                  <div className="flex items-center gap-2 mb-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-primary font-semibold text-[11px] tracking-tight">
                      {formatKsh(product.priceKsh)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80 font-normal text-[10px] truncate max-w-[120px]">
                      {product.specifications.volume.split('/')[0].trim()}
                    </span>
                  </div>

                  {/* Full-width Pill Action Button (Matches "Reserve now" in reference image) */}
                  <Button
                    variant="gold-outline"
                    size="sm"
                    pill
                    onClick={() => openPurchaseModal(product)}
                    className="w-full tracking-wide shadow-md hover:shadow-lg"
                  >
                    <span>Reserve now</span>
                  </Button>

                </div>
              </div>
            );
          })}
        </div>

       

        {/* View More Products Button */}
        <div className="mt-10 sm:mt-12 flex items-center justify-between text-center">
          <Button
            variant="secondary"
            size="icon"
            pill
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll products left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
           
          <Button
            id="view-more-products-btn"
            variant="outline"
            size="md"
            pill
            onClick={() => navigateTo('/products')}
            className="uppercase tracking-wider text-xs shadow-lg group"
          >
            <span>View Full Collection</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            pill
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll products right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </section>
  );
};
