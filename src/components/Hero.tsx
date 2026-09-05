import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Shield,
  Clock,
  Phone,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/Button';

export const Hero: React.FC = () => {
  const { openBookingModal, navigateTo, businessInfo } = useApp();

  return (
    <section
      id="hero-section"
      className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 bg-background overflow-hidden"
      aria-label="Welcome to The Icons Barber & Spa"
    >
      {/* Background Master Barber Image with Cinematic Lighting matching reference image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=85&w=2400&auto=format&fit=crop')`,
          filter: 'brightness(0.72) contrast(1.1)',
        }}
      />

      {/* Dark Vignette and Gradient Overlay for Pristine Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/95 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-background/30 to-background/85 pointer-events-none" />

      {/* Main Centered Hero Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 my-auto text-center flex flex-col items-center justify-center pt-8 sm:pt-12 pb-8">
        {/* Slender Eyebrow with Delicate Arrows (matching screenshot) */}
        <div className="inline-flex items-center justify-center gap-3 text-xs sm:text-sm text-primary font-medium tracking-widest uppercase mb-4 sm:mb-6 select-none animate-fadeIn">
          <span className="w-6 sm:w-10 h-[1px] bg-primary/60 inline-block" />
          <span className="text-white/90 font-semibold tracking-wider text-xs sm:text-sm">
            Your Style, Our Expertise
          </span>
          <span className="w-6 sm:w-10 h-[1px] bg-primary/60 inline-block" />
        </div>

        {/* High-Impact Centered Display Serif Headline (matching screenshot) */}
        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold text-white leading-[1.14] sm:leading-[1.18] tracking-tight max-w-4xl mx-auto drop-shadow-md">
          Look Like an{' '}
          <span className="text-primary">
            {' '}
            Icon <span className='text-white'>&</span> <br className="hidden sm:inline" />
            Leave a Legacy.
          </span>
        </h1>

        {/* Centered Descriptive Paragraph (matching screenshot) */}
        <p className="mt-5 sm:mt-7 text-sm sm:text-base md:text-lg text-foreground font-light leading-relaxed max-w-2xl sm:max-w-3xl mx-auto drop-shadow-sm">
          Where precision meets presence. At  <span className='text-primary  font-script font-bold'>The Icons Barbershop</span>, every cut is
          crafted to make you stand out. Sharp lines, flawless finishes, and
          grooming worthy of a champion. Because ordinary is never the goal.
        </p>

        {/* Centered Rounded Gold/Amber Call To Action Button (matching screenshot) */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            id="hero-book-appointment-btn"
            variant="primary"
            size="lg"
            onClick={() => openBookingModal()}
            className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base shadow-xl"
          >
            Book Appointment
          </Button>
        </div>
      </div>
    </section>
  );
};
