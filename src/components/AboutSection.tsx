import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from './ui/Button';

interface AboutSectionProps {
  isStandalonePage?: boolean;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  isStandalonePage = false,
}) => {
  const { openBookingModal, businessInfo } = useApp();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      id="about-section"
      ref={ref}
      className={`py-16 sm:py-20 lg:py-24 bg-background border-t border-b border-white/5 relative overflow-hidden transition-all duration-700 ${
        isStandalonePage ? 'pt-32' : ''
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      aria-label="About The Icons Barber & Spa"
    >
      {/* Warm ambient studio lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Photos Collage */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Photo 1 */}
              <div className="space-y-4">
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-secondary border border-border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop"
                    alt="Master barber sculpting client hairline at The Icons Barber in Kilimani Nairobi"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="p-4 bg-card border border-border rounded-xl">
                  <div className="text-lg font-display font-bold text-primary">
                    Hospital Grade Care
                  </div>
                  <div className="text-xs text-muted-foreground font-light mt-0.5">
                    Autoclaved machine detailing blades & hypoallergenic foil
                    shavers
                  </div>
                </div>
              </div>

              {/* Photo 2 */}
              <div className="space-y-4 pt-6 sm:pt-10">
                <div className="p-4 bg-card border border-border rounded-xl">
                  <div className="text-lg font-display font-bold text-white">
                    {businessInfo.address.suite}
                  </div>
                  <div className="text-xs text-muted-foreground font-light mt-0.5">
                    {businessInfo.address.street}, {businessInfo.address.city}
                  </div>
                </div>

                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-secondary border border-border shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop"
                    alt="Gentleman experiencing rejuvenating scalp spa therapy at The Icons Spa"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Brand Story */}
          <div className="lg:col-span-6 space-y-5">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-snug">
               <span className="text-primary">Iconic</span> Treatment ...
              <span className="text-primary">{businessInfo.address.suite}</span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-muted-foreground-light leading-relaxed font-light">
              Located along {businessInfo.address.street}, {businessInfo.name}{' '}
              is built around one simple idea: <span className='text-primary'>every person deserves a look like
              an icon</span>. From precision cuts to complete grooming, we focus on
              clean work, great service, and a finish you’ll be proud to
              wear.{' '}
            </p>

            {/* CTA */}
            <div className="pt-1 w-full flex justify-center ">
              <Button
                variant="outline"
                size="md"
                onClick={() => openBookingModal()}
                className="font-bold text-xs border-0 uppercase tracking-wider shadow-lg"
              >
                <Calendar className="w-4 h-4" />
                <span>Reserve Your Session</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
