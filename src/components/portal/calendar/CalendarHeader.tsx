import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Users,
  Filter,
  Clock,
} from 'lucide-react';
import { ServiceProvider } from '../../../types/staff';
import { CalendarViewMode } from '../../../stores/bookingStore';
import { CustomSelect, SelectOption } from '../ui/CustomSelect';
import { Button } from '../../ui/Button';
import { CalendarNav } from './CalendarNav';

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
  userProviderName,
}) => {
  const formattedTitle = React.useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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

  const providerOptions: SelectOption<string>[] = [
    {
      value: 'all',
      label: 'All Stations & Providers',
      sublabel: 'Entire floor schedule',
      badge: `${providers.length} Staff`,
    },
    ...providers.map((p) => ({
      value: p.id,
      label: p.fullName,
      sublabel: p.id === 'provider-admin' ? 'Admin & Master Stylist' : p.providerType.replace('-', ' '),
      badge: p.id === 'provider-admin' ? 'Admin' : undefined,
    })),
  ];

  return (
    <div className="p-2 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 shadow-xs">
      {/* Top row on mobile: view toggle + new booking. Left side on desktop. */}
      <div className="flex items-center justify-between gap-2 md:justify-start md:gap-4">
        <div className="flex items-center bg-input p-1 rounded-xl border border-border text-xs">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
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

        {/* New Booking sits next to the toggle on mobile so it doesn't get its own row */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onNewBookingClick}
          className="text-xs font-bold shrink-0 gap-2 md:hidden"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:block">New Booking</span>
        </Button>
      </div>

      {/* Nav row: tight gap on mobile, no forced full-width fight with siblings */}
      <div className="flex items-center justify-center md:justify-start">
        <CalendarNav
          formattedTitle={formattedTitle}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
        />
      </div>

     
    </div>
  );
};