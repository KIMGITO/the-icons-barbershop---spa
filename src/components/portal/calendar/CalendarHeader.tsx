import React from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Users, Filter, Clock 
} from 'lucide-react';
import { ServiceProvider } from '../../../types/staff';
import { CalendarViewMode } from '../../../stores/bookingStore';
import { CustomSelect, SelectOption } from '../ui/CustomSelect';
import { Button } from '../../ui/Button';

export interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  providers: ServiceProvider[];
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  onNewBookingClick: () => void;
  userRole: 'admin' | 'provider';
  userProviderName?: string;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  providers,
  selectedProviderId,
  onProviderChange,
  onNewBookingClick,
  userRole,
  userProviderName
}) => {
  // Compute formatted label depending on view
  const formattedTitle = React.useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });

      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        return `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }, [currentDate, viewMode]);

  // Provider options for custom select
  const providerOptions: SelectOption<string>[] = [
    {
      value: 'all',
      label: 'All Stations & Providers',
      sublabel: 'Entire floor schedule',
      badge: `${providers.length} Staff`
    },
    ...providers.map(p => ({
      value: p.id,
      label: p.fullName,
      sublabel: p.id === 'provider-admin' ? 'Admin & Master Stylist' : p.providerType.replace('-', ' '),
      badge: p.id === 'provider-admin' ? 'Admin' : undefined
    }))
  ];

  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
      {/* Left: Navigation & Date Title */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-1 bg-input rounded-xl p-1 border border-border">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous date"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-bold text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next date"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            {formattedTitle}
          </h2>
        </div>
      </div>

      {/* Right: Provider Filter, View Toggle, New Booking */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Provider Selector (Admin: All or specific; Provider: locked to self with badge) */}
        {userRole === 'admin' ? (
          <div className="w-48 sm:w-56">
            <CustomSelect
              options={providerOptions}
              value={selectedProviderId}
              onChange={onProviderChange}
              placeholder="Filter Provider..."
              className="text-xs"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-input px-3 py-2 rounded-xl border border-border text-xs">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground truncate max-w-[140px]">
              {userProviderName || 'My Station'}
            </span>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center bg-input p-1 rounded-xl border border-border text-xs">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-primary text-black shadow-xs font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* New Booking CTA */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onNewBookingClick}
          className="text-xs font-bold shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>New Booking</span>
        </Button>
      </div>
    </div>
  );
};
