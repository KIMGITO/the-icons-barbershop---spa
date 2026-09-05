import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { businessService } from '../../../services/businessService';
import { Clock, Plus, Trash2, CheckCircle2, Coffee } from 'lucide-react';
import { DaySchedule, DAYS_OF_WEEK, DayOfWeek } from '../../../types/staff';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { ThemeSelect } from '../../ui/ThemeSelect';

interface ProviderScheduleProps {
  schedule: DaySchedule[];
  onChange?: (newSchedule: DaySchedule[]) => void;
  editable?: boolean;
}

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

export const ProviderSchedule: React.FC<ProviderScheduleProps> = ({
  schedule,
  onChange,
  editable = true
}) => {
  const [loadingBusinessHours, setLoadingBusinessHours] = useState(false);
  const normalizedSchedule: DaySchedule[] = DAYS_OF_WEEK.map(d => {
    const existing = schedule.find(s => s.day === d.key);
    return existing || {
      day: d.key,
      isWorking: d.key !== 'sunday',
      startTime: '08:30',
      endTime: '18:30',
      breaks: [{ start: '13:00', end: '14:00' }]
    };
  });

  const handleToggleWorking = (dayKey: DayOfWeek) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map(s => 
      s.day === dayKey ? { ...s, isWorking: !s.isWorking } : s
    );
    onChange(updated);
  };

  const handleTimeChange = (dayKey: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map(s => 
      s.day === dayKey ? { ...s, [field]: value } : s
    );
    onChange(updated);
  };

  const handleAddBreak = (dayKey: DayOfWeek) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map(s => {
      if (s.day === dayKey) {
        const breaks = s.breaks || [];
        return {
          ...s,
          breaks: [...breaks, { start: '13:00', end: '14:00' }]
        };
      }
      return s;
    });
    onChange(updated);
  };

  const handleRemoveBreak = (dayKey: DayOfWeek, breakIndex: number) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map(s => {
      if (s.day === dayKey && s.breaks) {
        return {
          ...s,
          breaks: s.breaks.filter((_, idx) => idx !== breakIndex)
        };
      }
      return s;
    });
    onChange(updated);
  };

  const handleBreakTimeChange = (
    dayKey: DayOfWeek, 
    breakIndex: number, 
    field: 'start' | 'end', 
    value: string
  ) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map(s => {
      if (s.day === dayKey && s.breaks) {
        const nextBreaks = [...s.breaks];
        nextBreaks[breakIndex] = { ...nextBreaks[breakIndex], [field]: value };
        return { ...s, breaks: nextBreaks };
      }
      return s;
    });
    onChange(updated);
  };

  const handleApplyBusinessHours = async () => {
    if (!editable || !onChange) return;
    try {
      setLoadingBusinessHours(true);
      const hours = await businessService.getBusinessHours();
      const updated = DAYS_OF_WEEK.map(day => {
        const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day.key);
        const entry = hours?.raw.find(h => h.weekday === weekday);
        if (entry) {
          return {
            day: day.key,
            isWorking: entry.is_open,
            startTime: entry.open_time.slice(0, 5),
            endTime: entry.close_time.slice(0, 5),
            breaks: entry.is_open ? [{ start: '13:00', end: '14:00' }] : []
          };
        }
        const range =
          day.key === 'sunday' ? hours?.sunday :
          day.key === 'saturday' ? hours?.saturday :
          hours?.weekdays;
        const isSun = day.key === 'sunday';
        return {
          day: day.key,
          isWorking: !isSun,
          startTime: range?.start || '08:30',
          endTime: range?.end || '18:30',
          breaks: !isSun ? [{ start: '13:00', end: '14:00' }] : []
        };
      });
      onChange(updated);
    } catch (err) {
      const updated = normalizedSchedule.map(s => {
        if (s.day === 'sunday') {
          return { ...s, isWorking: false, breaks: [] };
        }
        return {
          ...s,
          isWorking: true,
          startTime: '08:30',
          endTime: '18:30',
          breaks: [{ start: '13:00', end: '14:00' }]
        };
      });
      onChange(updated);
    } finally {
      setLoadingBusinessHours(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border border-border/65 shadow-2xs">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Schedule Presets
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Quickly sync working shifts, availability, and meal/rest breaks with shop business hours.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyBusinessHours}
            disabled={loadingBusinessHours}
            className="text-xs font-semibold shrink-0 bg-card hover:bg-primary/10 hover:text-primary transition-colors border-border"
          >
            {loadingBusinessHours ? 'Syncing...' : 'Apply Business Hours'}
          </Button>
        </div>
      )}

      <div className="space-y-2.5">
        {normalizedSchedule.map((dayItem) => {

          const dayMeta = DAYS_OF_WEEK.find(d => d.key === dayItem.day)!;
          const isWorking = dayItem.isWorking;

          return (
            <div
              key={dayItem.day}
              className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                isWorking 
                  ? 'bg-card border-border' 
                  : 'bg-muted/30 border-border/40 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Day Name & Toggle */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleWorking(dayItem.day)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary ${
                        isWorking ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isWorking ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : null}

                  <div>
                    <span className="text-sm font-bold text-foreground block">
                      {dayMeta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {isWorking ? 'Available' : 'Day Off'}
                    </span>
                  </div>
                </div>

                {/* Working Hours Time Selectors */}
                {isWorking ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 sm:justify-end">
                    <div className="flex items-center gap-1.5 bg-input px-2.5 py-1 rounded-lg border border-border">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {editable ? (
                        <ThemeSelect compact
                          value={dayItem.startTime}
                          onChange={(e) => handleTimeChange(dayItem.day, 'startTime', e.target.value)}
                          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time} >
                              {time}
                            </option>
                          ))}
                        </ThemeSelect>
                      ) : (
                        <span className="text-xs font-semibold text-foreground">{dayItem.startTime}</span>
                      )}

                      <span className="text-xs text-muted-foreground px-1">to</span>

                      {editable ? (
                        <ThemeSelect compact
                          value={dayItem.endTime}
                          onChange={(e) => handleTimeChange(dayItem.day, 'endTime', e.target.value)}
                          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time} >
                              {time}
                            </option>
                          ))}
                        </ThemeSelect>
                      ) : (
                        <span className="text-xs font-semibold text-foreground">{dayItem.endTime}</span>
                      )}
                    </div>

                    {/* Add Break Button */}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleAddBreak(dayItem.day)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-semibold px-2 py-1 rounded border border-border/60 hover:border-primary/50 transition-colors"
                      >
                        <Coffee className="w-3 h-3" />
                        <span>Add Break</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic sm:text-right">
                    Rest day — no appointments scheduled
                  </div>
                )}
              </div>

              {/* Scheduled Breaks */}
              {isWorking && dayItem.breaks && dayItem.breaks.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-warning" /> Breaks:
                  </span>
                  {dayItem.breaks.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted/60 px-2 py-0.5 rounded-md border border-border text-foreground"
                    >
                      {editable ? (
                        <>
                          <ThemeSelect compact
                            value={b.start}
                            onChange={(e) => handleBreakTimeChange(dayItem.day, bIdx, 'start', e.target.value)}
                            className="bg-transparent text-[11px] text-foreground focus:outline-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map(t => (
                              <option key={t} value={t} >{t}</option>
                            ))}
                          </ThemeSelect>
                          <span className="text-muted-foreground">-</span>
                          <ThemeSelect compact
                            value={b.end}
                            onChange={(e) => handleBreakTimeChange(dayItem.day, bIdx, 'end', e.target.value)}
                            className="bg-transparent text-[11px] text-foreground focus:outline-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map(t => (
                              <option key={t} value={t} >{t}</option>
                            ))}
                          </ThemeSelect>
                          <button
                            type="button"
                            onClick={() => handleRemoveBreak(dayItem.day, bIdx)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-mono">{b.start} - {b.end}</span>
                      )}
                    </div>

                  ))}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
