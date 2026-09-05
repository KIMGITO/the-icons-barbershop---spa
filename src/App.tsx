import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { ProductsSection } from './components/ProductsSection';
import { BarbersSection } from './components/BarbersSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { AboutSection } from './components/AboutSection';
import { GallerySection } from './components/GallerySection';
import { LocationContactSection } from './components/LocationContactSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { ProductPurchaseModal } from './components/ProductPurchaseModal';
import { useServiceStore } from './stores/serviceStore';
import { useProductAdminStore } from './stores/productAdminStore';
import { useProviderStore } from './stores/providerStore';
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
import { SEO } from './components/SEO';

const MainContent: React.FC = () => {
  const { currentRoute, navigateTo, openBookingModal, refreshData, services, faqs, products, barbers, gallery, serviceCategories } = useApp();

  // Global Real-time Subscriptions are now handled in AppContext.tsx to ensure 
  // public UI is always in sync without redundant store subscriptions.

  // Route Dispatcher
  const renderCurrentView = () => {
    if (currentRoute.startsWith('/products/')) {
      const slug = currentRoute.replace('/products/', '');
      return <ProductDetailPage slug={slug} />;
    }

    if (currentRoute === '/products') {
      return (
        <div>
          <SEO 
            title="Executive Grooming Products & Trichology Apothecary | The Icons"
            description="Shop curated shampoos, TR2 follicle therapy, organic Moroccan argan beard oils, and matte styling clays at The Icons Barber & Spa in Kilimani."
            canonicalUrl="https://theiconsbarber.co.ke/products"
          />
          <ProductsCatalogPage />
        </div>
      );
    }

    if (currentRoute.startsWith('/services/')) {
      const slug = currentRoute.replace('/services/', '');
      return <ServiceDetailPage slug={slug} />;
    }

    if (currentRoute.startsWith('/barbers/')) {
      const slug = currentRoute.replace('/barbers/', '');
      return <BarberDetailPage slug={slug} />;
    }

    if (
      (currentRoute === '/portal' || currentRoute.startsWith('/portal/')) ||
      (currentRoute === '/staff' || currentRoute.startsWith('/staff/')) ||
      (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) ||
      (currentRoute === '/barber' || currentRoute.startsWith('/barber/'))
    ) {
      return <StaffPortalPage onExitToPublicWebsite={() => navigateTo('/')} />;
    }

    if (currentRoute === '/services') {
      if (!services || services.length === 0) {
        navigateTo('/');
        return null;
      }
      return (
        <div>
          <SEO 
            title="Bespoke Services & Pricing | The Icons Barber & Spa Nairobi"
            description="Explore our full catalog of precision haircuts, skin fades, royal hot towel beard sculpting, and Moroccan scalp detox treatments in Kilimani, Nairobi."
            canonicalUrl="https://theiconsbarber.co.ke/services"
            services={services}
          />
          <ServicesSection isStandalonePage={true} />
        </div>
      );
    }

    if (currentRoute === '/barbers') {
      if (!barbers || barbers.length === 0) {
        navigateTo('/');
        return null;
      }
      return (
        <div>
          <SEO 
            title="Master Barbers & Spa Specialists | The Icons Nairobi"
            description="Meet our certified master barbers and facial wellness therapists at The Icons. Choose your artisan and book your appointment directly."
            canonicalUrl="https://theiconsbarber.co.ke/barbers"
          />
          <BarbersSection isStandalonePage={true} />
        </div>
      );
    }

    if (currentRoute === '/about') {
      return (
        <div>
          <SEO 
            title="Our Heritage & Sanctuary | The Icons Barber & Spa"
            description="Learn about the ethos, sterile implements standard, and the sanctuary of modern masculinity at The Icons Barber & Spa in Nairobi."
            canonicalUrl="https://theiconsbarber.co.ke/about"
          />
          <AboutSection isStandalonePage={true} />
        </div>
      );
    }

    if (currentRoute === '/gallery') {
      if (!gallery || gallery.length === 0) {
        navigateTo('/');
        return null;
      }
      return (
        <div>
          <SEO 
            title="The Icons Gallery | Visual Story of Luxury Grooming"
            description="Browse through our gallery of precision cuts, executive spa treatments, and the luxury ambiance of The Icons Barber & Spa Nairobi."
            canonicalUrl="https://theiconsbarber.co.ke/gallery"
          />
          <GallerySection isStandalonePage={true} />
        </div>
      );
    }

    if (currentRoute === '/faq') {
      if (!faqs || !faqs.some(f => f.isActive !== false)) {
        navigateTo('/');
        return null;
      }
      return (
        <div>
          <SEO 
            title="Frequently Asked Questions | The Icons Barber & Spa"
            description="Got questions about our services, bookings, or grooming products? Find answers here or contact our concierge."
            canonicalUrl="https://theiconsbarber.co.ke/faq"
            schemaType="FAQPage"
            faqs={faqs.filter(f => f.isActive !== false)}
          />
          <FAQPage />
        </div>
      );
    }

    if (currentRoute === '/terms') {
      return (
        <>
          <SEO title="Terms of Service" canonicalUrl="https://theiconsbarber.co.ke/terms" />
          <TermsPage />
        </>
      );
    }

    if (currentRoute === '/privacy') {
      return (
        <>
          <SEO title="Privacy Policy" canonicalUrl="https://theiconsbarber.co.ke/privacy" />
          <PrivacyPage />
        </>
      );
    }

    if (currentRoute === '/contact') {
      return (
        <div>
          <SEO 
            title="Location, Hours & Contact | Visit The Icons in Kilimani"
            description="Visit Suite 4B, The Icon Heights on Lenana Road, Kilimani, Nairobi. Click to call +254 712 345 678, WhatsApp concierge, or get directions."
            canonicalUrl="https://theiconsbarber.co.ke/contact"
          />
          <LocationContactSection isStandalonePage={true} />
        </div>
      );
    }

    const hasServices = services && services.length > 0;
    const hasProducts = products && products.length > 0;
    const hasBarbers = barbers && barbers.length > 0;
    const hasGallery = gallery && gallery.length > 0;
    const hasFaqs = faqs && faqs.some(f => f.isActive !== false);

    return (
      <main id="homepage-main">
        <SEO 
          title="The Icons Barber & Spa | Premium Men's Grooming & Spa in Nairobi"
          description="Experience bespoke haircuts, luxury hot towel beard grooming, and rejuvenating scalp spa treatments at The Icons Barber & Spa. Located on Lenana Road, Kilimani, Nairobi. Book online."
          canonicalUrl="https://theiconsbarber.co.ke/"
          services={services}
        />
        <Hero />
        {hasServices && <ServicesSection limit={8} />}
        {hasProducts && <ProductsSection />}
        {hasBarbers && <BarbersSection />}
        <TestimonialsSection />
        <AboutSection />
        {hasGallery && <GallerySection />}
        <LocationContactSection />
        {hasFaqs && <FAQSection />}
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
      {!isPortalRoute && <Navigation />}
      <div className="flex-1">
        {renderCurrentView()}
      </div>
      {!isPortalRoute && (
        <Footer 
          hideServices={!services || services.length === 0}
          hideProducts={!products || products.length === 0}
          hideBarbers={!barbers || barbers.length === 0}
          hideFaqs={!faqs || !faqs.some(f => f.isActive !== false)}
          hideGallery={!gallery || gallery.length === 0}
        />
      )}
      <BookingModal />
      <ProductPurchaseModal />
    </div>
  );
};

export default function App() {
  return (
    <MainContent />
  );
}
