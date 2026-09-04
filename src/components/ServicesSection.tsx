import { SafeImage } from './ui/SafeImage';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceCategory, ServiceItem } from '../types';
import { Clock, Scissors, Sparkles, Check, ArrowRight, ArrowLeft, Shield, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ServicesSectionProps {
  limit?: number;
  showCategoryFilter?: boolean;
  isStandalonePage?: boolean;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ 
  limit, 
  showCategoryFilter = true,
  isStandalonePage = false
}) => {
  const { services, openBookingModal, navigateTo, barbers, isSupabaseConfigured, serviceCategories } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('all');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { ref: sectionRef, isVisible } = useScrollReveal();

  const categories = React.useMemo(() => {
    if (serviceCategories && serviceCategories.length > 0) {
      return [
        { id: 'all' as ServiceCategory, label: 'All Services' },
        ...serviceCategories.map(cat => ({
          id: cat.slug as ServiceCategory,
          label: cat.name
        }))
      ];
    }
    return [
      { id: 'all' as ServiceCategory, label: 'All Services' },
      { id: 'haircut' as ServiceCategory, label: 'Precision Haircuts' },
      { id: 'beard' as ServiceCategory, label: 'Beard & Shaves' },
      { id: 'spa' as ServiceCategory, label: 'Scalp & Facial Spa' },
      { id: 'packages' as ServiceCategory, label: 'Signature Packages' }
    ];
  }, [serviceCategories]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Hide inactive or suspended services from public UI
      if (isSupabaseConfigured && (service.status === 'inactive' || service.status === 'archived')) return false;
      
      if (selectedCategory === 'all') return true;
      
      const serviceCategory = service.category.toLowerCase();
      
      // If we have dynamic categories, match exactly by slug
      if (serviceCategories && serviceCategories.length > 0) {
        return serviceCategory === (selectedCategory as string).toLowerCase();
      }

      // Fallback Map of display categories to DB categories
      const categoryMap: Record<string, string[]> = {
        'haircut': ['haircuts', 'haircut'],
        'beard': ['beard', 'shave'],
        'spa': ['spa'],
        'packages': ['packages', 'vip']
      };

      const allowedDbCategories = categoryMap[selectedCategory as string] || [selectedCategory];
      return allowedDbCategories.includes(serviceCategory);
    });
  }, [services, selectedCategory, isSupabaseConfigured, serviceCategories]);

  const displayServices = limit ? filteredServices.slice(0, limit) : filteredServices;

  // Update scroll bounds and active index based on scroll position
  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);

    // Calculate approximate active card index in center
    const cardWidth = clientWidth > 768 ? 400 : clientWidth * 0.82;
    const centerPoint = scrollLeft + clientWidth / 2;
    const calculatedIndex = Math.floor(centerPoint / cardWidth);
    const clampedIndex = Math.max(0, Math.min(calculatedIndex, displayServices.length - 1));
    setActiveIndex(clampedIndex);
  }, [displayServices.length]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll navigation helpers
  const scrollPrev = () => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.clientWidth > 768 ? 420 : carouselRef.current.clientWidth * 0.84;
    carouselRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  };

  const scrollNext = () => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.clientWidth > 768 ? 420 : carouselRef.current.clientWidth * 0.84;
    carouselRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
  };

  // Mouse drag functionality for desktop carousel
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeftState(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    carouselRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Keyboard navigation for carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  // If no services, don't display the section
  if (services.length === 0) {
    return null;
  }

  // -------------------------------------------------------------
  // VIEW 1: STANDALONE SERVICES DIRECTORY PAGE (/services)
  // -------------------------------------------------------------
  if (isStandalonePage) {
    return (
      <section 
        id="services-directory-page"
        className="pt-28 pb-24 bg-background min-h-screen relative"
        aria-label="The Icons Barber & Spa Full Services Menu"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors">Home</button>
            <span>/</span>
            <span className="text-primary font-medium">Our Services</span>
          </div>

          {/* Compact Services Page Hero (Section 12 requirement) */}
          <div className="relative rounded-2xl bg-gradient-to-b from-card-elevated via-card to-background border border-border p-6 sm:p-10 lg:p-12 mb-10 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                <span>Bespoke Menu & Rituals</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Our Services
              </h1>
              <p className="text-muted-foreground-light text-sm sm:text-base leading-relaxed font-light">
                Premium grooming and spa services designed around your style, comfort and experience. Every appointment includes a personalized consultation, hot towel finish, and private suite tranquility.
              </p>
            </div>
          </div>

          {/* Category Filters */}
          <div className="tabs-pill pb-4 mb-10 overflow-x-auto no-scrollbar border-b border-border-subtle">
            {categories.map(cat => (
              <button
                key={cat.id}
                id={`category-btn-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`tab-pill whitespace-nowrap text-xs uppercase tracking-wider ${
                  selectedCategory === cat.id ? 'tab-pill-active' : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Full Grid: 3-Col Desktop, 2-Col Tablet, 1-Col Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayServices.map((service) => {
              const qualifiedBarbers = barbers.filter(b => 
                b.status === 'active' && b.servicesOfferedIds.includes(service.id)
              );
              
              return (
                <article 
                  key={service.id}
                  id={`service-card-${service.slug}`}
                  className="group card-default hover:border-primary/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
                >
                  {/* High Quality Service Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                    <SafeImage
                      src={service.imageUrl}
                      alt={`${service.name} at The Icons Barber & Spa Nairobi`}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/20" />
                    
                    {/* Duration & Price Tags */}
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md border border-border text-white text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{service.durationMinutes} min</span>
                    </div>

                    {service.isPopular && (
                      <Badge variant="primary" pill className="absolute top-3 right-3 text-[10px]">
                        Signature
                      </Badge>
                    )}

                    <div className="absolute bottom-3 left-3 bg-background/95 border border-primary/40 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] text-muted-foreground-light block uppercase tracking-wider">Investment</span>
                      <span className="text-white font-bold text-base tracking-tight font-mono">
                        KSh {service.priceKsh.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors mb-2 leading-snug">
                        {service.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed line-clamp-3 font-light">
                        {service.shortDescription}
                      </p>

                      {/* Service Provider Indicator */}
                      {qualifiedBarbers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span>Available with {qualifiedBarbers.map(b => b.name.split(' ')[0]).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-border-subtle flex items-center gap-3">
                      <Button
                        id={`book-service-${service.slug}`}
                        variant="primary"
                        size="md"
                        onClick={() => openBookingModal(service.id)}
                        className="flex-1 uppercase tracking-wider text-xs shadow-md"
                      >
                        Book Now
                      </Button>

                      <Button
                        id={`details-service-${service.slug}`}
                        variant="secondary"
                        size="md"
                        onClick={() => navigateTo(`/services/${service.slug}`)}
                        className="text-xs"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: HOMEPAGE HORIZONTAL SERVICE CAROUSEL
  // Inspired directly by the reference image's layout and composition
  // -------------------------------------------------------------
  return (
    <section 
      id="services"
      ref={sectionRef}
      className={`py-14 sm:py-20 lg:py-24 bg-background border-t border-b border-white/5 relative overflow-hidden transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      aria-label="Our Grooming & Spa Services"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Section Header (Matching Reference Composition) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-[1.2]">
              Bespoke Grooming & <span className="text-primary"> Restorative Therapy <br className="hidden sm:inline" />
              for the Discerning Gentleman </span>
            </h2>
            <p className="text-muted-foreground-light text-xs sm:text-sm md:text-base leading-relaxed font-light max-w-xl">
              Step into an exclusive sanctuary of refinement. We pair elite scalp restoration with master craftsmanship, tailored precisely to your distinct stature and style.
            </p>
          </div>

          
        </div>

        {/* Horizontal Service Carousel Container with Drag, Touch Swipe, and Transformation */}
        <div
          ref={carouselRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Services carousel"
          className={`flex gap-5 sm:gap-6 overflow-x-auto pb-6 pt-2 scroll-smooth no-scrollbar snap-x snap-mandatory focus:outline-none select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayServices.map((service, index) => {
            const isCenter = index === activeIndex;

            return (
              <div
                key={service.id}
                id={`carousel-card-${service.slug}`}
                className="flex-shrink-0 w-[84vw] sm:w-[350px] md:w-[380px] snap-start"
              >
                {/* Clean Card matching the reference design layout */}
                <article 
                  className={`h-full flex flex-col justify-between transition-all duration-300 group rounded-2xl bg-card p-4 sm:p-5 border ${
                    isCenter 
                      ? 'border-primary/60 shadow-xl shadow-primary/5 scale-100' 
                      : 'border-border hover:border-border-strong scale-[0.98]'
                  }`}
                >
                  {/* High Quality Rounded Image (matching reference 16:10 / 4:3 rounded look) */}
                  <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full rounded-xl overflow-hidden bg-secondary mb-4">
                    <SafeImage
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    
                    {/* Subtle Top-Right Duration / Badge */}
                    <div className="absolute top-2.5 right-2.5 bg-background/85 backdrop-blur-sm border border-border text-white text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{service.durationMinutes} min</span>
                    </div>

                    {/* Price Tag */}
                    <div className="absolute bottom-2.5 left-2.5 bg-background/90 backdrop-blur-sm border border-primary/40 text-primary text-xs font-mono font-bold px-2.5 py-1 rounded-md">
                      KSh {service.priceKsh.toLocaleString()}
                    </div>
                  </div>

                  {/* Card Content (Display Serif Title, Short Description, and Learn More Link) */}
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Bold Display Serif Heading matching reference */}
                      <h3 className="font-display text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors leading-snug">
                        {service.name}
                      </h3>
                      
                      {/* Short concise description matching reference */}
                      <p className="mt-2 text-xs sm:text-sm text-muted-foreground-light leading-relaxed line-clamp-2 font-light">
                        {service.shortDescription}
                      </p>
                    </div>

                    {/* Footer Row: Learn More → Link & Book Now Button */}
                    <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigateTo(`/services/${service.slug}`)}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer group/link"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover/link:translate-x-1 transition-transform" />
                      </button>

                      <Button
                        id={`carousel-book-${service.slug}`}
                        variant="primary"
                        size="sm"
                        onClick={() => openBookingModal(service.id)}
                        className="uppercase tracking-wider text-xs shadow-md"
                      >
                        Book Now
                      </Button>
                    </div>

                  </div>
                </article>
              </div>
            );
          })}
        </div>

        {/* Section 10 Requirement: Prominent "Explore All Services →" Button Immediately Below Carousel */}
        <div className="text-center flex justify-between items-center mt-8 sm:mt-12">
          <Button
            variant="secondary"
            size="icon"
            pill
            onClick={scrollPrev}
            disabled={!canScrollLeft}
            aria-label="Previous service"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
            
          <Button
            id="explore-all-services-bottom-btn"
            variant="outline"
            size="lg"
            onClick={() => navigateTo('/services')}
            className="group font-medium text-sm tracking-wide shadow-lg"
          >
            <span>Explore All Services</span>
            <ArrowRight className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            pill
            onClick={scrollNext}
            disabled={!canScrollRight}
            aria-label="Next service"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </section>
  );
};
