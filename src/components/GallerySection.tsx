import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GalleryItem } from '../types';
import { Eye, X, ChevronLeft, ChevronRight, Sparkles, ZoomIn, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface GallerySectionProps {
  isStandalonePage?: boolean;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ isStandalonePage = false }) => {
  const { gallery, navigateTo } = useApp();

  // If no gallery items, don't display the section
  if (!gallery || gallery.length === 0) {
    return null;
  }

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const { ref, isVisible } = useScrollReveal();

  const categories = [
    { id: 'all', label: 'All Photos' },
    ...Array.from(new Set(gallery.map(item => item.category))).filter(Boolean).map(cat => ({
      id: cat,
      label: cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }))
  ];

  const filteredGallery = gallery.filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const openLightbox = (index: number) => {
    setActiveLightboxIndex(index);
  };

  const closeLightbox = () => {
    setActiveLightboxIndex(null);
  };

  const nextLightbox = () => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex((activeLightboxIndex + 1) % filteredGallery.length);
    }
  };

  const prevLightbox = () => {
    if (activeLightboxIndex !== null) {
      setActiveLightboxIndex((activeLightboxIndex - 1 + filteredGallery.length) % filteredGallery.length);
    }
  };

  // 6 Curated Mosaic Gallery Items corresponding to the 3-column reference layout:
  // Column 1: Item 0 (Top), Item 1 (Bottom)
  // Column 2: Item 2 (Top - Tall vertical), Item 3 (Bottom)
  // Column 3: Item 4 (Top), Item 5 (Bottom)
  const mosaicItems = gallery.slice(0, 6);

  return (
    <section 
      id="gallery-section"
      ref={ref}
      className={`py-14 sm:py-20 lg:py-24 bg-background-secondary border-t border-b border-white/5 relative transition-all duration-700 ${
        isStandalonePage ? 'pt-32' : ''
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      aria-label="The Icons Barber & Spa Style Gallery"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header Matching Reference Image */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-10 lg:mb-12 gap-4">
          <div className="max-w-xl text-left">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-2">
              Style  <span className="text-primary"> Gallery </span>
            </h2>
            <p className="text-muted-foreground-light text-xs sm:text-sm md:text-base leading-relaxed font-light">
              Explore our gallery of fresh cuts, custom color blends, and transformative styles.
            </p>
          </div>

         
        </div>

        {/* Category Tabs if on Standalone Gallery Page */}
        {isStandalonePage && (
          <div className="flex items-center justify-start sm:justify-center gap-2 pb-3 mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap tab-base ${
                  activeCategory === cat.id
                    ? 'tab-active shadow-md'
                    : 'tab-inactive'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* 3-Column Style Gallery Mosaic Layout (Preserved on All Screen Sizes, contracting and expanding smoothly) */}
        {!isStandalonePage || activeCategory === 'all' ? (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 items-start">
            
            {/* COLUMN 1: 2 Cards Stacked (Top & Bottom) */}
            <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
              {/* Card 1 (Col 1 Top) */}
              {mosaicItems[0] && (
                <div
                  id="gallery-card-1"
                  onClick={() => openLightbox(0)}
                  className="group relative aspect-[4/3.9] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[0].imageUrl}
                    alt={mosaicItems[0].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[0].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[0].caption || 'Haircuts & Fades'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}

              {/* Card 2 (Col 1 Bottom) */}
              {mosaicItems[1] && (
                <div
                  id="gallery-card-2"
                  onClick={() => openLightbox(1)}
                  className="group relative aspect-[4/4.3] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[1].imageUrl}
                    alt={mosaicItems[1].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[1].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[1].caption || 'Straight Razor Shave'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: Tall Vertical Top Card + Bottom Card */}
            <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
              {/* Card 3 (Col 2 Top - Tall Vertical Card matching reference image) */}
              {mosaicItems[2] && (
                <div
                  id="gallery-card-3"
                  onClick={() => openLightbox(2)}
                  className="group relative aspect-[3/4.5] sm:aspect-[3/4.6] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[2].imageUrl}
                    alt={mosaicItems[2].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[2].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[2].caption || 'Hair Styling & Blow Dry'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}

              {/* Card 4 (Col 2 Bottom) */}
              {mosaicItems[3] && (
                <div
                  id="gallery-card-4"
                  onClick={() => openLightbox(3)}
                  className="group relative aspect-[4/3.8] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[3].imageUrl}
                    alt={mosaicItems[3].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[3].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[3].caption || 'Scalp Therapy & Wash'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 3: Top Card + Bottom Card */}
            <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
              {/* Card 5 (Col 3 Top) */}
              {mosaicItems[4] && (
                <div
                  id="gallery-card-5"
                  onClick={() => openLightbox(4)}
                  className="group relative aspect-[4/4] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[4].imageUrl}
                    alt={mosaicItems[4].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[4].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[4].caption || 'Clipper Detail'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}

              {/* Card 6 (Col 3 Bottom) */}
              {mosaicItems[5] && (
                <div
                  id="gallery-card-6"
                  onClick={() => openLightbox(5)}
                  className="group relative aspect-[4/4.1] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
                >
                  <img
                    src={mosaicItems[5].imageUrl}
                    alt={mosaicItems[5].alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                  
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5 transition-transform duration-300">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {mosaicItems[5].title}
                    </p>
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {mosaicItems[5].caption || 'Styling & Care'}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Filtered Category Grid for Standalone Page */
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
            {filteredGallery.map((item, index) => (
              <div
                key={item.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-[4/4.5] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/70 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10"
              >
                <img
                  src={item.imageUrl}
                  alt={item.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3.5">
                  <p className="text-[9px] sm:text-[11px] font-semibold text-white truncate drop-shadow-sm">
                    {item.title}
                  </p>
                  {item.caption && (
                    <p className="text-[8px] sm:text-[10px] text-primary font-light truncate">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

         {/* View More Button (Styled exactly like the golden tan reference button) */}
          <div className="w-full  flex justify-center py-4">
            <div className="shrink-0">
              <button
                onClick={() => {
                  if (isStandalonePage) {
                    openLightbox(0);
                  } else {
                    navigateTo('/gallery');
                  }
                }}
                className="px-5 sm:px-6 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-primary-foreground font-bold text-xs sm:text-sm rounded-lg sm:rounded-xl shadow-lg transition-all duration-200 cursor-pointer inline-flex items-center gap-2"
                aria-label="View more gallery photos"
              >
                <span>View More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        {/* Lightbox Modal */}
        {activeLightboxIndex !== null && (
          <div 
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={closeLightbox}
          >
            <div 
              className="relative max-w-4xl w-full bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white hover:text-primary transition-colors cursor-pointer"
                aria-label="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Prev/Next buttons */}
              <button
                onClick={prevLightbox}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white hover:text-primary transition-colors cursor-pointer"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={nextLightbox}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white hover:text-primary transition-colors cursor-pointer"
                aria-label="Next Image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image */}
              <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={filteredGallery[activeLightboxIndex]?.imageUrl || gallery[0].imageUrl}
                  alt={filteredGallery[activeLightboxIndex]?.alt || 'Gallery item'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Lightbox Footer Details */}
              <div className="p-4 sm:p-5 bg-secondary border-t border-border flex flex-row items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-white font-bold text-xs sm:text-sm truncate">
                    {filteredGallery[activeLightboxIndex]?.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-light truncate">
                    {filteredGallery[activeLightboxIndex]?.caption || filteredGallery[activeLightboxIndex]?.alt}
                  </p>
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-primary shrink-0">
                  {activeLightboxIndex + 1} / {filteredGallery.length}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
