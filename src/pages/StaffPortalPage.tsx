import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { PortalAuth } from '../components/portal/auth/PortalAuth';
import { PortalShell } from '../components/portal/layout/PortalShell';
import { PortalOverview } from '../components/portal/overview/PortalOverview';
import { BookingList } from '../components/portal/bookings/BookingList';
import { BookingCalendar } from '../components/portal/calendar/BookingCalendar';
import { ProvidersPage } from '../components/portal/providers/ProvidersPage';
import { ServicesManagementPage } from '../components/portal/services/ServicesManagementPage';
import { ProductsManagementPage } from '../components/portal/products/ProductsManagementPage';
import { BusinessManagementPage } from '../components/portal/business/BusinessManagementPage';
import { FAQManagementPage } from '../components/portal/business/FAQManagementPage';
import { GalleryManagementPage } from '../components/portal/gallery/GalleryManagementPage';
import { ReceiptLookup } from '../components/portal/receipts/ReceiptLookup';
import { StaffProfileView } from '../components/portal/staff/StaffProfileView';
import { StaffScheduleView } from '../components/portal/staff/StaffScheduleView';
import { MessagesDashboard } from '../components/portal/messages/MessagesDashboard';

interface StaffPortalPageProps {
  onExitToPublicWebsite: () => void;
}

export const StaffPortalPage: React.FC<StaffPortalPageProps> = ({ onExitToPublicWebsite }) => {
  const { isAuthenticated, role, init } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('overview');

  useEffect(() => {
    init();
  }, [init]);

  // Define restricted tabs for non-admin staff
  const adminOnlyTabs = ['providers', 'services', 'products', 'business', 'messages', 'gallery', 'faqs'];

  // If role changes, ensure current tab is valid for that role
  useEffect(() => {
    if (role === 'provider' && adminOnlyTabs.includes(currentTab)) {
      setCurrentTab('overview');
    }
  }, [role, currentTab]);

  // If not logged in, present staff login
  if (!isAuthenticated) {
    return (
      <PortalAuth
        onSuccess={() => setCurrentTab('overview')}
        onExitPortal={onExitToPublicWebsite}
      />
    );
  }

  // Render view corresponding to selected navigation tab
  const renderTabContent = () => {
    // RBAC check: if trying to access admin tab as provider, redirect to overview
    if (role === 'provider' && adminOnlyTabs.includes(currentTab)) {
      return <PortalOverview onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }

    switch (currentTab) {
      case 'overview':
        return <PortalOverview onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'bookings':
        return <BookingList />;
      case 'calendar':
        return <BookingCalendar />;
      case 'providers':
        return <ProvidersPage />;
      case 'profile':
        return <StaffProfileView />;
      case 'services':
        return <ServicesManagementPage />;
      case 'products':
        return <ProductsManagementPage />;
      case 'messages':
        return <MessagesDashboard />;
      case 'business':
        return <BusinessManagementPage />;
      case 'faqs':
        return <FAQManagementPage />;
      case 'gallery':
        return <GalleryManagementPage />;
      case 'schedule':
        return <StaffScheduleView />;
      case 'receipts':
        return <ReceiptLookup />;
      default:
        return <PortalOverview onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <PortalShell
      currentTab={currentTab}
      onSelectTab={(tab) => setCurrentTab(tab)}
      onExitToPublicWebsite={onExitToPublicWebsite}
    >
      {renderTabContent()}
    </PortalShell>
  );
};
