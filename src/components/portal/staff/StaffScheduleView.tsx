import React, { useState, useEffect } from 'react';
import { Calendar, Save } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useProviderStore } from '../../../stores/providerStore';
import { useUIStore } from '../../../stores/uiStore';
import { DaySchedule } from '../../../types/staff';
import { ProviderSchedule } from '../providers/ProviderSchedule';
import { Button } from '../../ui/Button';

export const StaffScheduleView: React.FC = () => {
  const { user } = useAuthStore();
  const { providers, loadProviders, updateSchedule } = useProviderStore();
  const { addToast } = useUIStore();

  const currentProvider = providers.find(p => p.id === user?.providerId) || providers[0];
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (currentProvider && currentProvider.schedule) {
      setSchedule(currentProvider.schedule);
      setIsDirty(false);
    }
  }, [currentProvider]);

  if (!currentProvider) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading your schedule...</div>;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSchedule(currentProvider.id, schedule);
      setIsSaving(false);
      setIsDirty(false);
      addToast({
        type: 'success',
        title: 'Schedule Saved',
        message: 'Your weekly working hours and breaks have been updated.'
      });
    } catch (err: any) {
      setIsSaving(false);
      addToast({
        type: 'error',
        title: 'Error Saving Schedule',
        message: err.message || 'Could not save schedule changes.'
      });
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Sticky header: title + save stay visible while scrolling the schedule below */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pb-3 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 bg-card p-3.5 sm:p-5 rounded-2xl border border-border">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">My Weekly Schedule</span>
            </h1>
            <p className="hidden sm:block text-xs text-muted-foreground mt-1">
              Set your working shifts, rest days, and lunch breaks. Client bookings will automatically align with these hours.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-bold shrink-0"
          >
            <Save className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Availability'}</span>
          </Button>
        </div>
      </div>

      {/* Schedule content: bottom padding on mobile clears the fixed bar below */}
      <div className=" pb-20 sm:pb-5">
        <ProviderSchedule
          schedule={schedule}
          onChange={(newSched) => {
            setSchedule(newSched);
            setIsDirty(true);
          }}
          editable={true}
        />
      </div>

    </div>
  );
};