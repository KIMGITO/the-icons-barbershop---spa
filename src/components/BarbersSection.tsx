import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarberProfile } from '../types';
import { Scissors, Calendar, ArrowRight, Award, Sparkles, X, User, Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface BarbersSectionProps {
  isStandalonePage?: boolean;
}

export const BarbersSection: React.FC<BarbersSectionProps> = ({ isStandalonePage = false }) => {
  const { barbers, openBookingModal, navigateTo, services } = useApp();

  // If no barbers, don't display the section
  if (!barbers || barbers.length === 0) {
    return null;
  }

  const { ref, isVisible } = useScrollReveal();
  const [selectedBarber, setSelectedBarber] = useState<BarberProfile | null>(null);

  // Take the 6 master barbers to populate the 3-column bento mosaic
  // Row 1: [0, 1, 2] fills the 3 top spots across columns 1, 2, 3
  // Row 2: [3, 4, 5] fills the 3 bottom spots across columns 1, 2, 3
  const b0 = barbers[0]; // Col 1 Top
  const b1 = barbers[1]; // Col 2 Top (Tall Center)
  const b2 = barbers[2]; // Col 3 Top
  const b3 = barbers[3]; // Col 1 Bottom
  const b4 = barbers[4]; // Col 2 Bottom
  const b5 = barbers[5]; // Col 3 Bottom

  const openBarberModal = (barber: BarberProfile) => {
    setSelectedBarber(barber);
  };

  const closeBarberModal = () => {
    setSelectedBarber(null);
  };

  return (
    <section 
      id="barbers-section"
      ref={ref}
      className={`py-14 sm:py-20 lg:py-24 bg-background-secondary border-t border-b border-white/10 relative transition-all duration-700 ${
        isStandalonePage ? 'pt-32' : ''
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      aria-label="Meet The Icons Master Barbers and Spa Specialists"
    >
      {/* Ambient luxury studio lighting backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-10 lg:mb-12 gap-4">
          <div className="max-w-xl text-left">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-2">
              Meet Our <span className="text-primary"> Master Artisans </span>
            </h2>
            <p className="text-muted-foreground-light text-xs sm:text-sm md:text-base leading-relaxed font-light max-w-xl">
              Elite specialists hand-selected for surgical scissor precision, traditional hot-towel rituals, and white-glove client etiquette.
            </p>
          </div>

          
        </div>

        {/* 
          3-Column Bento Mosaic Layout (Strictly matching reference image layout, aspect ratios & division):
          - Column 1: Top card (b0) + Bottom card (b3)
          - Column 2: Tall Vertical Top card (b1) + Bottom card (b4)
          - Column 3: Top card (b2) + Bottom card (b5)
          Row 1 [b0, b1, b2] is completely filled across all 3 columns before Row 2 [b3, b4, b5].
        */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 items-start">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
            {/* Card 1: Col 1 Top (b0) */}
            {b0 && (
              <div
                id={`barber-card-${b0.slug}`}
                onClick={() => openBarberModal(b0)}
                className="group relative aspect-[4/3.9] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b0.avatarUrl}
                  alt={`${b0.name} - ${b0.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b0.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b0.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}

            {/* Card 4: Col 1 Bottom (b3) */}
            {b3 && (
              <div
                id={`barber-card-${b3.slug}`}
                onClick={() => openBarberModal(b3)}
                className="group relative aspect-[4/4.3] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b3.avatarUrl}
                  alt={`${b3.name} - ${b3.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b3.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b3.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2 (Center): Tall Vertical Top Card + Bottom Card */}
          <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
            {/* Card 2: Col 2 Top (b1 - Tall Vertical Card matching reference image) */}
            {b1 && (
              <div
                id={`barber-card-${b1.slug}`}
                onClick={() => openBarberModal(b1)}
                className="group relative aspect-[3/4.5] sm:aspect-[3/4.6] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b1.avatarUrl}
                  alt={`${b1.name} - ${b1.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b1.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b1.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}

            {/* Card 5: Col 2 Bottom (b4) */}
            {b4 && (
              <div
                id={`barber-card-${b4.slug}`}
                onClick={() => openBarberModal(b4)}
                className="group relative aspect-[4/3.8] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b4.avatarUrl}
                  alt={`${b4.name} - ${b4.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b4.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b4.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 3 */}
          <div className="flex flex-col gap-2.5 sm:gap-4 md:gap-6">
            {/* Card 3: Col 3 Top (b2) */}
            {b2 && (
              <div
                id={`barber-card-${b2.slug}`}
                onClick={() => openBarberModal(b2)}
                className="group relative aspect-[4/3.9] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b2.avatarUrl}
                  alt={`${b2.name} - ${b2.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b2.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b2.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}

            {/* Card 6: Col 3 Bottom (b5) */}
            {b5 && (
              <div
                id={`barber-card-${b5.slug}`}
                onClick={() => openBarberModal(b5)}
                className="group relative aspect-[4/4.3] bg-secondary rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/80 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-primary/10 backdrop-blur-md"
              >
                <img
                  src={b5.avatarUrl}
                  alt={`${b5.name} - ${b5.title}`}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 select-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 transition-transform duration-300">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate drop-shadow-sm group-hover:text-primary transition-colors">
                    {b5.name}
                  </h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs text-primary font-light truncate">
                    {b5.specialty}
                  </p>
                </div>

                <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            )}
          </div>
          
        </div>
        <div className="mt-10 sm:mt-12 text-center">
          <button
            id="view-more-products-btn"
            onClick={() => navigateTo('/barbers')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-secondary hover:bg-secondary-hover border border-white/15 hover:border-primary/50 text-white font-semibold text-xs uppercase tracking-wider rounded-full shadow-lg transition-all duration-300 cursor-pointer active:scale-95 group"
          >
            <span>View All Artisans</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* EXPANDED BARBER DETAIL MODAL */}
        {selectedBarber && (
          <div 
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
            onClick={closeBarberModal}
          >
            <div 
              className="relative max-w-2xl w-full bg-card border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl my-auto text-left"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeBarberModal}
                className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black border border-white/20 flex items-center justify-center text-white hover:text-primary transition-colors cursor-pointer"
                aria-label="Close Barber Detail"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header with Portrait & Glass Banner */}
              <div className="relative h-52 sm:h-64 bg-secondary overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                
                {/* Barber Info on Banner */}
                <div className="absolute bottom-4 inset-x-4 sm:inset-x-6 z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-primary/40 text-primary text-[10px] sm:text-xs font-semibold mb-2 shadow-md">
                    <Award className="w-3 h-3 text-primary" />
                    <span>{selectedBarber.yearsExperience}+ Years Experience</span>
                    {selectedBarber.instagramHandle && (
                      <span className="text-white/60 ml-1">· {selectedBarber.instagramHandle}</span>
                    )}
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
                    {selectedBarber.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-primary font-medium">
                    {selectedBarber.title} · {selectedBarber.specialty}
                  </p>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                
                {/* Quote Callout */}
                {selectedBarber.quote && (
                  <div className="p-3 sm:p-3.5 bg-white/[0.03] border-l-2 border-primary rounded-r-xl">
                    <p className="text-xs sm:text-sm text-foreground/90 italic font-serif">
                      "{selectedBarber.quote}"
                    </p>
                  </div>
                )}

                {/* Bio / Philosophy */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Master Profile & Philosophy</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light">
                    {selectedBarber.bio}
                  </p>
                </div>

                {/* Working Days Schedule */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Available In Studio</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBarber.workingDays.map(day => (
                      <Badge
                        key={day}
                        variant="neutral"
                        pill
                        className="text-[10px] sm:text-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <span>{day}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Services Provided */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span>Specialized Services</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {services
                      .filter(s => selectedBarber.servicesOfferedIds.includes(s.id))
                      .map(service => (
                        <div 
                          key={service.id} 
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-white truncate">{service.name}</p>
                            <p className="text-[10px] text-muted-foreground">{service.durationMinutes} mins</p>
                          </div>
                          <span className="text-xs font-bold text-primary shrink-0">
                            KSh {service.priceKsh.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const bId = selectedBarber.id;
                      closeBarberModal();
                      openBookingModal(undefined, bId);
                    }}
                    className="flex-1 uppercase tracking-wider text-xs shadow-lg"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book with {selectedBarber.name}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      const slug = selectedBarber.slug;
                      closeBarberModal();
                      navigateTo(`/barbers/${slug}`);
                    }}
                    className="text-xs tracking-wide"
                  >
                    <span>Full Profile & Portfolio</span>
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </Button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
