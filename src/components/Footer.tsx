import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle,
  Check,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import footerBarberToolsBg from '../assets/images/footer_barber_tools_bg_1787833322854.jpg';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import Logo from './bland/logo';

interface FooterProps {
  hideServices?: boolean;
  hideProducts?: boolean;
  hideBarbers?: boolean;
  hideFaqs?: boolean;
  hideGallery?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  hideServices,
  hideProducts,
  hideBarbers,
  hideFaqs,
  hideGallery
}) => {
  const { businessInfo, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Mobile & viewport scroll reveal
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setIsSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setIsSubscribed(false);
      }, 5000);
    }
  };

  return (
    <footer
      id="main-footer"
      ref={ref}
      className={`relative text-white overflow-hidden border-t border-white/15 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      aria-label="The Icons Barber & Spa Luxury Glassmorphic Footer"
    >
      {/* High-Resolution Barber Tools on Leather Mat Atmosphere Image Behind Footer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${footerBarberToolsBg})`,
        }}
      />

      {/* Subtle translucent dark tint so the shears, razor and leather mat remain vividly visible while keeping white text legible */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70 pointer-events-none" />

      {/* Ambient Top Subtle Golden Light Reflection */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-10">
        {/* 4-Column Main Layout: Centered On Mobile with Staggered Entrance Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 sm:gap-8 lg:gap-10 pb-12 text-center sm:text-left">
          {/* COLUMN 1: Brand & Philosophy (Mobile Centered + Animated Glass Pill) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col items-center sm:items-start">
            <Logo />

            {/* Philosophy Text */}
            <p className="text-xs sm:text-[13px] text-muted-foreground-light leading-relaxed max-w-sm font-light mx-auto sm:mx-0">
              Start with empathy. We create distinctive silhouettes, elevate
              confidence, collaborate with master artisans, and deliver
              sanctuary care.
            </p>
          </div>

          {/* COLUMN 2: Navigation Links (Mobile Centered) */}
          <div className="lg:col-span-2  space-y-3.5 flex flex-col items-center sm:items-center">
            <h4 className="font-serif text-base sm:text-lg text-white font-bold tracking-wide border-b border-primary/30 pb-1 inline-block">
              Navigation
            </h4>
            <ul className="grid grid-cols-2 lg:grid-cols-1 gap-y-2.5 gap-x-4 justify-center items-center col-span-2 text-xs sm:text-sm text-muted-foreground-light">
              {' '}
              <li>
                <button
                  onClick={() => navigateTo('/')}
                  className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                >
                  Home
                </button>
              </li>
              {!hideServices && (
                <li>
                  <button
                    onClick={() => navigateTo('/services')}
                    className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                  >
                    Services
                  </button>
                </li>
              )}
              {!hideProducts && (
                <li>
                  <button
                    onClick={() => navigateTo('/products')}
                    className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                  >
                    Products
                  </button>
                </li>
              )}
              {!hideBarbers && (
                <li>
                  <button
                    onClick={() => navigateTo('/barbers')}
                    className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                  >
                    Team
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => navigateTo('/about')}
                  className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                >
                  Testimonials
                </button>
              </li>
              {!hideFaqs && (
                <li>
                  <button
                    onClick={() => navigateTo('/faq')}
                    className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                  >
                    FAQ
                  </button>
                </li>
              )}
              {!hideGallery && (
                <li>
                  <button
                    onClick={() => navigateTo('/gallery')}
                    className="hover:text-primary hover:translate-x-1 sm:hover:translate-x-1 transition-all duration-200 cursor-pointer block mx-auto sm:mx-0"
                  >
                    Gallery
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* COLUMN 3: Contact Info (Mobile Centered) */}
          <div className="lg:col-span-3 space-y-3.5 flex flex-col items-center sm:items-start">
            <h4 className="font-serif text-base sm:text-lg text-white font-bold tracking-wide border-b border-primary/30 pb-1 inline-block">
              Contact
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground-light">
              <li className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 text-primary shadow-sm">
                  <MapPin className="w-3 h-3" />
                </div>
                <a
                  href={businessInfo.address.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors leading-snug max-w-xs text-center sm:text-left"
                >
                  {businessInfo.address.suite}, {businessInfo.address.street},{' '}
                  {businessInfo.address.city}
                </a>
              </li>

              <li className="flex flex-col sm:flex-row items-center sm:items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 text-primary shadow-sm">
                  <Phone className="w-3 h-3" />
                </div>
                <a
                  href={`tel:${businessInfo.phone}`}
                  className="hover:text-white transition-colors font-medium"
                >
                  {businessInfo.phone}
                </a>
              </li>

              <li className="flex flex-col sm:flex-row items-center sm:items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 text-primary shadow-sm">
                  <Mail className="w-3 h-3" />
                </div>
                <a
                  href={`mailto:${businessInfo.email}`}
                  className="hover:text-white transition-colors truncate"
                >
                  {businessInfo.email}
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: Newsletter & Social Badges (Mobile Centered) */}
          <div className="lg:col-span-3 space-y-3.5 flex flex-col items-center sm:items-center w-full">
            <h4 className="font-serif text-base sm:text-lg text-white font-bold tracking-wide border-b border-primary/30 pb-1 inline-block">
              Newsletter
            </h4>

            {/* Newsletter Pill Box */}
            <form
              onSubmit={handleSubscribe}
              className="space-y-2.5 w-full max-w-sm mx-auto sm:mx-0"
            >
              <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-lg border border-white/30 focus-within:border-primary transition-all">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  required
                  className="w-full bg-transparent text-black placeholder:text-muted-foreground text-xs sm:text-sm px-3 py-1.5 focus:outline-none min-w-0 font-sans border-transparent focus:border-transparent focus:shadow-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="shrink-0 text-[10px] sm:text-xs uppercase tracking-wider rounded-lg shadow-md"
                >
                  {isSubscribed ? 'DONE' : 'SUBSCRIBE'}
                </Button>
              </div>

              {isSubscribed && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-500 font-medium animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Thank you for subscribing!</span>
                </div>
              )}
            </form>

            {/* 4 Circular Social Badges with Hover Glow & Subtle Bounce */}
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
              {/* Facebook / Primary Social (Gold filled circle) */}
              <a
                href={businessInfo.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-primary/50 hover:-translate-y-1 active:scale-90"
                title="Facebook / Sanctuary Channel"
                aria-label="Facebook"
              >
                <span className="font-serif leading-none">f</span>
              </a>

              {/* Twitter / X */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/40 hover:border-white text-white flex items-center justify-center transition-all duration-300 shadow-md hover:-translate-y-1 active:scale-90"
                title="Twitter"
                aria-label="Twitter"
              >
                <Twitter className="w-3.5 h-3.5 fill-current" />
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/40 hover:border-white text-white flex items-center justify-center transition-all duration-300 shadow-md hover:-translate-y-1 active:scale-90"
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>

              {/* Whatsapp */}
              {/*  <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/40 hover:border-white text-white flex items-center justify-center transition-all duration-300 shadow-md hover:-translate-y-1 active:scale-90"
                title="WhatsaApp"
                aria-label="WhatsApp"
              >
                <Linkedin className="w-3.5 h-3.5 fill-current" />
              </a>
              */}
            </div>
          </div>
        </div>

        {/* Bottom Sub-Footer with Glass Border Divider & Centered Alignment on Mobile */}
        <div className="pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground text-center sm:text-left">
          <div>
            Copyright © {new Date().getFullYear()} The Icons Barber & Spa. All
            Rights Reserved
          </div>

          <div className="flex items-center gap-4 sm:gap-5 flex-wrap justify-center">
            <button
              onClick={() => navigateTo('/terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => navigateTo('/privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => navigateTo('/admin')}
              className="hover:text-primary transition-colors cursor-pointer font-medium"
            >
              Staff Portal
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
};
