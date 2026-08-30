import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Scissors,
  Phone,
  Menu,
  X,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/Button';
import Logo from './bland/logo';

export const Navigation: React.FC = () => {
  const { currentRoute, navigateTo, openBookingModal, businessInfo } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/', desc: 'Welcome & Signature Atmosphere' },
    {
      label: 'Services & Pricing',
      path: '/services',
      desc: 'Precision Fades, Hot Shaves & Spa',
    },
    {
      label: 'Grooming Products',
      path: '/products',
      desc: 'Must-Have Tonics, Shampoos & Oils',
    },
    {
      label: 'Master Barbers',
      path: '/barbers',
      desc: 'Certified Grooming Artisans',
    },
    {
      label: 'About The Sanctuary',
      path: '/about',
      desc: 'Our Philosophy & Standards',
    },
    {
      label: 'Grooming Gallery',
      path: '/gallery',
      desc: 'Executive Portfolio & Showcase',
    },
    { label: 'FAQ', path: '/faq', desc: 'Appointments, Policies & Questions' },
    {
      label: 'Location & Contact',
      path: '/contact',
      desc: 'Visit our penthouse studio in Nairobi',
    },
  ];

  const handleNavClick = (path: string) => {
    setIsMenuOpen(false);
    if (path.startsWith('/#')) {
      const sectionId = path.replace('/#', '');
      if (currentRoute !== '/') {
        navigateTo('/');
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigateTo(path);
    }
  };

  return (
    <>
      <header
        id="main-navigation"
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-md py-3 border-b border-white/10 shadow-2xl'
            : 'bg-background/60 backdrop-blur-sm py-4 border-b border-white/15'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Left: Hamburger Menu Button in subtle rounded rectangle box */}
            <div className="flex items-center">
              <button
                id="main-menu-toggle-btn"
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center justify-center p-2.5 sm:px-3 sm:py-2.5 rounded-lg border border-white/20 bg-black/40 hover:bg-white/10 hover:border-white/40 text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Open Navigation Menu"
                aria-expanded={isMenuOpen}
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>

            <Logo />

            {/* Right: Staff Portal & Contact Us Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                id="header-contact-btn"
                variant="primary"
                size="sm"
                onClick={() => handleNavClick('/contact')}
                className="px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-semibold shadow-md"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Full-Screen / Side Drawer Luxury Navigation Overlay */}
      {isMenuOpen && (
        <div
          id="luxury-nav-drawer"
          className="fixed inset-0 z-50 flex justify-start bg-black/80 backdrop-blur-md transition-all duration-300 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMenuOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-card border-r border-border h-full overflow-y-auto flex flex-col justify-between p-6 sm:p-8 shadow-2xl">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-secondary border border-primary/40 flex items-center justify-center text-primary">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-white font-heading text-sm font-bold tracking-wider">
                      THE ICONS
                    </h2>
                    <p className="text-[10px] text-primary tracking-widest uppercase">
                      Barber & Spa • Nairobi
                    </p>
                  </div>
                </div>

                <Button
                  id="close-nav-drawer-btn"
                  variant="secondary"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation Links */}
              <nav className="py-6 space-y-2" aria-label="Expanded Navigation">
                {navLinks.map((link) => {
                  const isActive =
                    currentRoute === link.path ||
                    (link.path !== '/' && currentRoute.startsWith(link.path));
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.path)}
                      className={`w-full text-left p-3.5 rounded-lg transition-all flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'nav-item-drawer-active'
                          : 'text-foreground hover:bg-secondary hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold tracking-wide flex items-center gap-2">
                          {link.label}
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-light mt-0.5">
                          {link.desc}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-6 border-t border-border space-y-4">
              <Button
                id="drawer-book-appointment-btn"
                variant="primary"
                size="md"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBookingModal();
                }}
                className="w-full py-3.5 text-xs uppercase tracking-wider shadow-lg"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment Online</span>
              </Button>

              <div className="space-y-2 text-xs text-muted-foreground-light">
                <a
                  href={`tel:${businessInfo.phone}`}
                  className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Call Concierge:{' '}
                    <strong className="text-white">
                      {businessInfo.phoneDisplay}
                    </strong>
                  </span>
                </a>

                <div className="flex items-center gap-2.5 p-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {businessInfo?.address?.suite},{' '}
                    {businessInfo?.address?.street}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Mon – Sun: 7:30 AM – 8:30 PM</span>
                </div>
              </div>

              {/* Administrative Portals */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted-foreground">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo('/barber');
                  }}
                  className="hover:text-primary underline"
                >
                  Staff Portal
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigateTo('/admin');
                  }}
                  className="hover:text-primary underline"
                >
                  Management Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
