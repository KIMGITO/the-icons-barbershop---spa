import React from 'react';
import { ShieldCheck, Sparkles, Coffee, CalendarCheck } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const WHY_CHOOSE_THE_ICONS = [
  {
    title: "Master Barbers & Artisans",
    subtitle: "Precision Over Speed",
    description: "Our groomers are certified artisans with a minimum of 6 years of elite salon and barbershop experience, constantly trained in contemporary precision fades, beard geometry, and trichology."
  },
  {
    title: "Hospital-Grade Sterilization",
    subtitle: "Absolute Hygiene Standard",
    description: "Every clipper guard and shear undergoes multi-stage medical sterilization. All straight razor blades are 100% single-use and unsealed right in front of you."
  },
  {
    title: "Executive Private Suites",
    subtitle: "Sanctuary of Tranquility",
    description: "Escape the noise of generic walk-in shops. Enjoy ergonomic Italian leather grooming chairs, acoustic dampening, personal entertainment, and complimentary barista espresso."
  },
  {
    title: "Guaranteed Zero-Wait Booking",
    subtitle: "Respect For Your Time",
    description: "Your reserved chair is prepped and waiting the moment you step through our doors. Seamless digital scheduling ensures punctual, unhurried service from start to finish."
  }
];

export const WhyChooseUs: React.FC = () => {
  const icons = [Sparkles, ShieldCheck, Coffee, CalendarCheck];
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      id="why-choose-us"
      ref={ref}
      className={`py-16 sm:py-20 lg:py-24 bg-background border-t border-border relative transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      aria-label="Why Gentlemen Choose The Icons Barber & Spa"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span>The Icons Standard of Excellence</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Why Discerning Gentlemen <span className="text-primary">Choose The Icons</span>
          </h2>
          <p className="text-muted-foreground-light text-xs sm:text-sm md:text-base leading-relaxed font-light">
            We reimagined the traditional barbershop into a private executive sanctuary where immaculate hygiene, anatomical craftsmanship, and client punctuality are guaranteed.
          </p>
        </div>

        {/* Editorial 4-Column Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {WHY_CHOOSE_THE_ICONS.map((item, index) => {
            const IconComponent = icons[index % icons.length];
            return (
              <div 
                key={index}
                className="relative p-6 sm:p-7 bg-card border border-border hover:border-primary/60 rounded-2xl flex flex-col justify-between space-y-6 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/5"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-secondary border border-border-subtle flex items-center justify-center text-primary group-hover:border-primary/50 group-hover:bg-secondary-hover transition-colors">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                      0{index + 1}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase tracking-wider text-primary font-semibold block mb-1">
                    {item.subtitle}
                  </span>
                  
                  <h3 className="font-display text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Substantiated Standard</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};