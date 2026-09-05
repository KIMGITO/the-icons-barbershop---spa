import React, { useState } from 'react';
import { List, Calendar as CalendarIcon } from 'lucide-react';
import { BookingList } from '../bookings/BookingList';
import { BookingCalendar } from '../calendar/BookingCalendar';

export const OperationsHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'calendar'>('list');

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center gap-2 border-b  justify-between lg:justify-start border-border mb-4 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveSubTab('list')}
          
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Booking List</span>
        </button>
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'calendar'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendar & Planning</span>
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === 'list' && <BookingList />}
        {activeSubTab === 'calendar' && <BookingCalendar />}
      </div>
    </div>
  );
};
