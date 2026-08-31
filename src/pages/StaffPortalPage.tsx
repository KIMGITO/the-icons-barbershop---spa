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

  // If role changes, ensure current tab is valid for that role
  useEffect(() => {
    if (role === 'provider' && (currentTab === 'providers' || currentTab === 'services' || currentTab === 'products' || currentTab === 'business' || currentTab === 'messages')) {
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
    switch (currentTab) {
      case 'overview':
        return <PortalOverview onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'bookings':
        return <BookingList />;
      case 'calendar':
        return <BookingCalendar />;
      case 'providers':
        return role === 'admin' ? <ProvidersPage /> : <StaffProfileView />;
      case 'services':
        return role === 'admin' ? <ServicesManagementPage /> : <PortalOverview onNavigateTab={(t) => setCurrentTab(t)} />;
      case 'products':
        return role === 'admin' ? <ProductsManagementPage /> : <PortalOverview onNavigateTab={(t) => setCurrentTab(t)} />;
      case 'messages':
        return role === 'admin' ? <MessagesDashboard /> : <PortalOverview onNavigateTab={(t) => setCurrentTab(t)} />;
      case 'business':
        return role === 'admin' ? <BusinessManagementPage /> : <PortalOverview onNavigateTab={(t) => setCurrentTab(t)} />;
      case 'schedule':
        return <StaffScheduleView />;
      case 'profile':
        return <StaffProfileView />;
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
