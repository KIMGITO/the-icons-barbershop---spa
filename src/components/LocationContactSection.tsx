import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Mail, 
  Navigation as NavIcon, 
  MessageSquare, 
  ExternalLink,
  ShieldCheck,
  Pin
} from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface LocationContactSectionProps {
  isStandalonePage?: boolean;
}

export const LocationContactSection: React.FC<LocationContactSectionProps> = ({ 
  isStandalonePage = false 
}) => {
  const { businessInfo } = useApp();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      id="contact-section"
      ref={ref}
      className={`py-8 sm:py-14 lg:py-20 bg-background border-t border-b border-white/5 relative overflow-hidden transition-all duration-500 ${
        isStandalonePage ? 'pt-24 sm:pt-32' : ''
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      aria-label="The Icons Barber & Spa Location and Contact Information"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading - Reduced padding & compact on mobile */}
        <div className="max-w-3xl mb-5 sm:mb-8 lg:mb-10 space-y-1.5 sm:space-y-2">
         
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Visit  at  <span className="text-primary">{businessInfo.address.street}, {businessInfo.address.suite}</span>
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-light">
            {businessInfo.locationDetails || `Situated in ${businessInfo.address.suite}, ${businessInfo.address.street} with dedicated parking and security.`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-stretch">
          
          {/* Left Column: Compact Address, Channels & Minimal-Height Operating Hours */}
          <div className="lg:col-span-5 flex flex-col space-y-3 sm:space-y-4 w-full">
            
            {/* Address & Direct Direction Buttons */}
            <div className="p-3.5 sm:p-5 bg-card border border-border rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-white font-bold text-xs sm:text-sm">{businessInfo.name}</h3>
                  <p className="text-xs text-muted-foreground-light mt-0.5 leading-snug font-light">
                    {businessInfo.address.suite}, {businessInfo.address.street}, {businessInfo.address.neighborhood}, {businessInfo.address.city}
                  </p>
                </div>
              </div>

              {/* Compact Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={businessInfo.address.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-base btn-primary text-[11px] sm:text-xs uppercase tracking-wider py-2 px-2.5 rounded-lg shadow-sm gap-1.5"
                >
                  <NavIcon className="w-3 h-3" />
                  <span>Get Directions</span>
                </a>

                <a
                  href={`tel:${businessInfo.phone}`}
                  className="btn-base btn-secondary text-[11px] sm:text-xs uppercase tracking-wider py-2 px-2.5 rounded-lg gap-1.5"
                >
                  <Phone className="w-3 h-3 text-primary" />
                  <span>Call Now</span>
                </a>
              </div>
            </div>

            

            {/* Operating Hours - Redesigned for Minimum Height with 3-Column Compact Grid */}
            <div className="p-3 sm:p-3.5 bg-card border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-primary text-[11px] uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>Operating Hours</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Open
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center divide-x divide-border pt-0.5">
                <div className="px-1">
                  <span className="block text-[10px] text-muted-foreground font-light">Mon – Fri</span>
                  <span className="font-mono text-white text-[11px] font-medium leading-tight">{businessInfo.hours.weekdays}</span>
                </div>
                <div className="px-1">
                  <span className="block text-[10px] text-muted-foreground font-light">Saturday</span>
                  <span className="font-mono text-white text-[11px] font-medium leading-tight">{businessInfo.hours.saturday}</span>
                </div>
                <div className="px-1">
                  <span className="block text-[10px] text-muted-foreground font-light">Sun & Hol</span>
                  <span className="font-mono text-white text-[11px] font-medium leading-tight">{businessInfo.hours.sunday}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Google Maps Frame - REMOVED ON SMALL SCREENS (hidden on mobile/tablet, shown only on lg+) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col">
            <div className="relative w-full h-full min-h-[340px] bg-background border border-border rounded-xl overflow-hidden shadow-xl">
              
              {/* Map Iframe */}
              <iframe
                title={`${businessInfo.name} Location Map on ${businessInfo.address.street}, ${businessInfo.address.city}`}
                src="https://www.google.com/maps?q=-1.2126399,36.836479&z=17&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />

              {/* Map Floating Card */}
              <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-background/40 backdrop-blur-md border border-border p-3 rounded-lg shadow-xl">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider mb-0.5">
                  <Pin className="w-3.5 h-3.5" />
                  <span>Location:</span>
                </div>
                <p className="text-[10px] text-primary leading-tight font-light">
                  {businessInfo.locationDetails || `Located at ${businessInfo.address.suite}, ${businessInfo.address.street}, ${businessInfo.address.city}.`}
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
