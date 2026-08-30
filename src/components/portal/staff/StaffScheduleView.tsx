import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle2, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (currentProvider && currentProvider.schedule) {
      setSchedule(currentProvider.schedule);
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
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>My Weekly Working Schedule</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Set your working shifts, rest days, and lunch breaks. Client bookings will automatically align with these hours.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs font-bold"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? 'Saving...' : 'Save Availability'}</span>
        </Button>
      </div>

      <div className="bg-card p-5 rounded-2xl border border-border">
        <ProviderSchedule
          schedule={schedule}
          onChange={(newSched) => setSchedule(newSched)}
          editable={true}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs font-bold px-6"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? 'Saving...' : 'Save Availability'}</span>
        </Button>
      </div>
    </div>
  );
};
