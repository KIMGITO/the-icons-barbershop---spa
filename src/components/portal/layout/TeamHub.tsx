import React, { useState } from 'react';
import { Users, User, Calendar as CalendarIcon, ReceiptText } from 'lucide-react';
import { ProvidersPage } from '../providers/ProvidersPage';
import { StaffProfileView } from '../staff/StaffProfileView';
import { StaffScheduleView } from '../staff/StaffScheduleView';
import { ReceiptLookup } from '../receipts/ReceiptLookup';

export const TeamHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'profile' | 'schedule' | 'receipts'>('providers');

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center gap-2 border-b border-border mb-4 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveSubTab('providers')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'providers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Providers Management</span>
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>My Schedule</span>
        </button>
        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeSubTab === 'receipts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Receipt Lookup</span>
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === 'providers' && <ProvidersPage />}
        {activeSubTab === 'profile' && <StaffProfileView />}
        {activeSubTab === 'schedule' && <StaffScheduleView />}
        {activeSubTab === 'receipts' && <ReceiptLookup />}
      </div>
    </div>
  );
};
