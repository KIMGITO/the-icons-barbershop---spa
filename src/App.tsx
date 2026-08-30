import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { ProductsSection } from './components/ProductsSection';
import { BarbersSection } from './components/BarbersSection';
import { AboutSection } from './components/AboutSection';
import { GallerySection } from './components/GallerySection';
import { LocationContactSection } from './components/LocationContactSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { ProductPurchaseModal } from './components/ProductPurchaseModal';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { BarberDetailPage } from './pages/BarberDetailPage';
import { ProductsCatalogPage } from './pages/ProductsCatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BarberPortal } from './pages/BarberPortal';
import { StaffPortalPage } from './pages/StaffPortalPage';
import { FAQPage } from './pages/FAQPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { updatePageSEO } from './utils/seo';

const MainContent: React.FC = () => {
  const { currentRoute, navigateTo, openBookingModal } = useApp();

  // Root SEO initialization on route change
  useEffect(() => {
    if (currentRoute === '/') {
      updatePageSEO({
        title: "The Icons Barber & Spa | Premium Men's Grooming & Spa in Nairobi",
        description: "Experience bespoke haircuts, luxury hot towel beard grooming, and rejuvenating scalp spa treatments at The Icons Barber & Spa. Located on Lenana Road, Kilimani, Nairobi. Book online."
      });
    } else if (currentRoute === '/services') {
      updatePageSEO({
        title: "Bespoke Services & Pricing | The Icons Barber & Spa Nairobi",
        description: "Explore our full catalog of precision haircuts, skin fades, royal hot towel beard sculpting, and Moroccan scalp detox treatments in Kilimani, Nairobi."
      });
    } else if (currentRoute === '/products') {
      updatePageSEO({
        title: "Executive Grooming Products & Trichology Apothecary | The Icons",
        description: "Shop curated shampoos, TR2 follicle therapy, organic Moroccan argan beard oils, and matte styling clays at The Icons Barber & Spa in Kilimani."
      });
    } else if (currentRoute === '/barbers') {
      updatePageSEO({
        title: "Master Barbers & Spa Specialists | The Icons Nairobi",
        description: "Meet our certified master barbers and facial wellness therapists at The Icons. Choose your artisan and book your appointment directly."
      });
    } else if (currentRoute === '/about') {
      updatePageSEO({
        title: "Our Heritage & Sanctuary | The Icons Barber & Spa",
        description: "Learn about the ethos, sterile implements standard, and private executive suites at The Icons Barber & Spa on Lenana Road, Kilimani."
      });
    } else if (currentRoute === '/gallery') {
      updatePageSEO({
        title: "Client Transformations & Studio Gallery | The Icons Nairobi",
        description: "Visual showcase of sharp fades, beard artistry, scalp treatments, and our luxury penthouse barber studio in Kilimani."
      });
    } else if (currentRoute === '/contact') {
      updatePageSEO({
        title: "Location, Hours & Contact | The Icons Barber & Spa Kilimani",
        description: "Visit Suite 4B, The Icon Heights on Lenana Road, Kilimani, Nairobi. Click to call +254 712 345 678, WhatsApp concierge, or get directions."
      });
    } else if (currentRoute === '/book') {
      openBookingModal();
    }
  }, [currentRoute]);

  // Route Dispatcher
  const renderCurrentView = () => {
    // Product Detail Route: /products/:slug
    if (currentRoute.startsWith('/products/')) {
      const slug = currentRoute.replace('/products/', '');
      return <ProductDetailPage slug={slug} />;
    }

    // Standalone Products Catalog Page: /products
    if (currentRoute === '/products') {
      return <ProductsCatalogPage />;
    }

    // Service Detail Route: /services/:slug
    if (currentRoute.startsWith('/services/')) {
      const slug = currentRoute.replace('/services/', '');
      return <ServiceDetailPage slug={slug} />;
    }

    // Barber Detail Route: /barbers/:slug
    if (currentRoute.startsWith('/barbers/')) {
      const slug = currentRoute.replace('/barbers/', '');
      return <BarberDetailPage slug={slug} />;
    }

    // Staff Portal & Management Routes: /portal, /staff, /admin, /barber
    if (
      (currentRoute === '/portal' || currentRoute.startsWith('/portal/')) ||
      (currentRoute === '/staff' || currentRoute.startsWith('/staff/')) ||
      (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) ||
      (currentRoute === '/barber' || currentRoute.startsWith('/barber/'))
    ) {
      return <StaffPortalPage onExitToPublicWebsite={() => navigateTo('/')} />;
    }

    // Standalone Services Page
    if (currentRoute === '/services') {
      return (
        <div>
          <ServicesSection isStandalonePage={true} />
        </div>
      );
    }

    // Standalone Barbers Page
    if (currentRoute === '/barbers') {
      return (
        <div>
          <BarbersSection isStandalonePage={true} />
        </div>
      );
    }

    // Standalone About Page
    if (currentRoute === '/about') {
      return (
        <div>
          <AboutSection isStandalonePage={true} />
        </div>
      );
    }

    // Standalone Gallery Page
    if (currentRoute === '/gallery') {
      return (
        <div>
          <GallerySection isStandalonePage={true} />
        </div>
      );
    }

    // Standalone FAQ Page
    if (currentRoute === '/faq') {
      return (
        <div>
          <FAQPage />
        </div>
      );
    }

    // Terms & Conditions Page
    if (currentRoute === '/terms') {
      return <TermsPage />;
    }

    // Privacy Policy Page
    if (currentRoute === '/privacy') {
      return <PrivacyPage />;
    }

    // Standalone Contact Page
    if (currentRoute === '/contact') {
      return (
        <div>
          <LocationContactSection isStandalonePage={true} />
        </div>
      );
    }

    // Default: Full Homepage Landing Experience:
    return (
      <main id="homepage-main">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Services (Immediately after Hero) */}
        <ServicesSection limit={8} />

        {/* 3. Products Showcase (Curated Must Have Items) */}
        <ProductsSection />

        {/* 4. Featured Barbers */}
        <BarbersSection />

        {/* 6. About */}
        <AboutSection />

        {/* 7. Gallery */}
        <GallerySection />

        {/* 8. Location / Contact */}
        <LocationContactSection />

        {/* 9. FAQ Section */}
        <FAQSection />
      </main>
    );
  };

  const isPortalRoute = 
    (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) || 
    (currentRoute === '/barber' || currentRoute.startsWith('/barber/')) ||
    (currentRoute === '/staff' || currentRoute.startsWith('/staff/')) ||
    (currentRoute === '/portal' || currentRoute.startsWith('/portal/'));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
      {/* Global Navigation - hidden in staff portal */}
      {!isPortalRoute && <Navigation />}

      {/* Main Routed View */}
      <div className="flex-1">
        {renderCurrentView()}
      </div>

      {/* Global Footer */}
      {!isPortalRoute && <Footer />}

      {/* Global Interactive Booking Engine Modal */}
      <BookingModal />

      {/* Global Product Purchase & Studio Reservation Modal */}
      <ProductPurchaseModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
