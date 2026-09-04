import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { PortalAuth } from '../components/portal/auth/PortalAuth';
import { PortalShell } from '../components/portal/layout/PortalShell';
import { PortalOverview } from '../components/portal/overview/PortalOverview';
import { BusinessManagementPage } from '../components/portal/business/BusinessManagementPage';
import { MessagesDashboard } from '../components/portal/messages/MessagesDashboard';
import { OperationsHub } from '../components/portal/layout/OperationsHub';
import { CatalogHub } from '../components/portal/layout/CatalogHub';
import { TeamHub } from '../components/portal/layout/TeamHub';

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
  const adminOnlyTabs = ['catalog', 'team', 'business', 'messages'];

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
      case 'operations':
        return <OperationsHub />;
      case 'catalog':
        return <CatalogHub />;
      case 'team':
        return <TeamHub />;
      case 'messages':
        return <MessagesDashboard />;
      case 'business':
        return <BusinessManagementPage />;
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
