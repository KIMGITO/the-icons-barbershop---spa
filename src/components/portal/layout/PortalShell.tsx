import React, { useState } from 'react';
import { 
  LayoutDashboard, Calendar, Scissors, Users, Building2, 
  User, Clock, LogOut, ExternalLink, Menu, X, Sparkles, 
  ChevronRight, ArrowLeftRight, MessageSquare 
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { SEEDED_STAFF_ACCOUNTS } from '../../../services/authService';
import { Badge } from '../../ui/Badge';
import { ToastContainer } from '../notifications/ToastContainer';

interface PortalShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onExitToPublicWebsite: () => void;
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  currentTab,
  onSelectTab,
  onExitToPublicWebsite,
  children
}) => {
  const { user, role, logout, switchAccount } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  // Navigation Items per Role
  const adminNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'providers', label: 'Providers', icon: Users },
    { id: 'services', label: 'Services & Pricing', icon: Scissors },
    { id: 'messages', label: 'SMS Messages', icon: MessageSquare },
    { id: 'business', label: 'Business Profile', icon: Building2 },
  ];

  const providerNav = [
    { id: 'overview', label: 'Station Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'My Bookings', icon: Clock },
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const navItems = role === 'admin' ? adminNav : providerNav;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleSwitchAccount = async (email: string) => {
    await switchAccount(email);
    setRoleSwitcherOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Main Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/40 flex items-center justify-center text-primary font-serif font-bold text-sm shadow-inner">
              I
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm tracking-wide text-foreground">
                  THE ICONS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Staff Portal
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                Barber & Spa Operations
              </span>
            </div>
          </div>
        </div>

        {/* Right: Role Switcher, Current User & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Fast Role Switcher Dropdown (Essential for testing Admin vs Provider) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-input hover:bg-muted text-xs font-semibold text-foreground transition-colors"
              title="Switch between Admin and Service Provider"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
              <span className="capitalize hidden md:inline">{role === 'admin' ? 'Manager (Admin)' : 'Artisan'}</span>
              <Badge variant={role === 'admin' ? 'primary' : 'neutral'} className="text-[10px] py-0 px-1.5">
                {role === 'admin' ? 'Admin' : 'Provider'}
              </Badge>
            </button>

            {roleSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Switch Active Role
                </div>
                {SEEDED_STAFF_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSwitchAccount(acc.email)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      user?.email === acc.email
                        ? 'bg-primary/15 text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium text-foreground">{acc.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{acc.role}</div>
                    </div>
                    {user?.email === acc.email && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-8 h-8 rounded-full object-cover border border-border"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary font-bold text-xs">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-foreground block leading-tight">
                {user?.fullName}
              </span>
              <span className="text-[10px] text-muted-foreground block capitalize leading-tight">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Exit to Public Website */}
          <button
            type="button"
            onClick={onExitToPublicWebsite}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden sm:flex items-center gap-1 text-xs"
            title="Return to Public Website"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden xl:inline">Public Site</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => logout()}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Workspace Area: Sidebar + Main Content */}
      <div className="flex-1 flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card/60 p-4 space-y-6 shrink-0">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
              Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-black font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-muted-foreground'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-black" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick exit shortcut in sidebar bottom */}
          <div className="mt-auto pt-4 border-t border-border space-y-2">
            <button
              type="button"
              onClick={onExitToPublicWebsite}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Back to Public Website</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-Out Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-xs flex">
            <div className="w-4/5 max-w-xs bg-card border-r border-border h-full p-4 space-y-6 flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="font-serif font-bold text-sm text-foreground">
                  THE ICONS
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-primary text-black font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-border space-y-2">
                <button
                  type="button"
                  onClick={onExitToPublicWebsite}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public Website</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Touch targets >= 44px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around h-16 px-1">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className={`text-[10px] mt-1 truncate ${isActive ? 'font-bold' : 'font-normal'}`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Global Staff Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
