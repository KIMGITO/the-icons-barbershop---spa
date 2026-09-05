import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  Clock,
  Trash2,
  Coffee,
  Plus,
} from 'lucide-react';
import { businessService } from '../../../services/businessService';
import { DaySchedule, DAYS_OF_WEEK, DayOfWeek } from '../../../types/staff';
import { Button } from '../../ui/Button';
import { ThemeSelect } from '../../ui/ThemeSelect';

interface ProviderScheduleProps {
  schedule: DaySchedule[];
  onChange?: (newSchedule: DaySchedule[]) => void;
  editable?: boolean;
}

const TIME_OPTIONS = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
];

export const ProviderSchedule: React.FC<ProviderScheduleProps> = ({
  schedule,
  onChange,
  editable = true,
}) => {
  const [loadingBusinessHours, setLoadingBusinessHours] = useState(false);
  // Accordion: only one day's config panel open at a time. null = all collapsed.
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);

  // Default state for any day not yet in the schedule: every day working, no breaks.
  const normalizedSchedule: DaySchedule[] = DAYS_OF_WEEK.map((d) => {
    const existing = schedule.find((s) => s.day === d.key);
    return (
      existing || {
        day: d.key,
        isWorking: true,
        startTime: '08:30',
        endTime: '18:30',
        breaks: [],
      }
    );
  });

  const handleToggleWorking = (dayKey: DayOfWeek) => {
    if (!editable || !onChange) return;
    const wasWorking = normalizedSchedule.find(
      (s) => s.day === dayKey,
    )?.isWorking;
    const updated = normalizedSchedule.map((s) =>
      s.day === dayKey ? { ...s, isWorking: !s.isWorking } : s,
    );
    onChange(updated);
    // Turning a day off collapses it; turning it on opens it so the person
    // can immediately set hours instead of hunting for a second tap.
    setExpandedDay((prev) => {
      if (!wasWorking) return dayKey;
      return prev === dayKey ? null : prev;
    });
  };

  const handleTimeChange = (
    dayKey: DayOfWeek,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map((s) =>
      s.day === dayKey ? { ...s, [field]: value } : s,
    );
    onChange(updated);
  };

  const handleAddBreak = (dayKey: DayOfWeek) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map((s) => {
      if (s.day === dayKey) {
        const breaks = s.breaks || [];
        return { ...s, breaks: [...breaks, { start: '13:00', end: '14:00' }] };
      }
      return s;
    });
    onChange(updated);
  };

  const handleRemoveBreak = (dayKey: DayOfWeek, breakIndex: number) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map((s) => {
      if (s.day === dayKey && s.breaks) {
        return {
          ...s,
          breaks: s.breaks.filter((_, idx) => idx !== breakIndex),
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
    value: string,
  ) => {
    if (!editable || !onChange) return;
    const updated = normalizedSchedule.map((s) => {
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
      const updated = DAYS_OF_WEEK.map((day) => {
        const weekday = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ].indexOf(day.key);
        const entry = hours?.raw.find((h) => h.weekday === weekday);
        if (entry) {
          return {
            day: day.key,
            isWorking: entry.is_open,
            startTime: entry.open_time.slice(0, 5),
            endTime: entry.close_time.slice(0, 5),
            breaks: [],
          };
        }
        const range =
          day.key === 'sunday'
            ? hours?.sunday
            : day.key === 'saturday'
              ? hours?.saturday
              : hours?.weekdays;
        return {
          day: day.key,
          isWorking: true,
          startTime: range?.start || '08:30',
          endTime: range?.end || '18:30',
          breaks: [],
        };
      });
      onChange(updated);
    } catch (err) {
      const updated = normalizedSchedule.map((s) => ({
        ...s,
        isWorking: true,
        startTime: '08:30',
        endTime: '18:30',
        breaks: [],
      }));
      onChange(updated);
    } finally {
      setLoadingBusinessHours(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border border-border/65 shadow-2xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyBusinessHours}
            disabled={loadingBusinessHours}
            className="text-xs font-semibold shrink-0 bg-card hover:bg-primary/10 hover:text-primary transition-colors border-border w-full sm:w-auto justify-center"
          >
            
            {loadingBusinessHours ? 'Syncing...' : 'Apply Business Hours'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {normalizedSchedule.map((dayItem) => {
          const dayMeta = DAYS_OF_WEEK.find((d) => d.key === dayItem.day)!;
          const isWorking = dayItem.isWorking;
          const isOpen = expandedDay === dayItem.day;
          const breakCount = dayItem.breaks?.length || 0;

          return (
            <div
              key={dayItem.day}
              className={`rounded-xl border overflow-hidden transition-colors ${
                isWorking
                  ? 'bg-card border-border'
                  : 'bg-muted/30 border-border/40'
              } ${isOpen ? 'ring-1 ring-primary/30' : ''}`}
            >
              {/* Row header — single line on every screen size, tap anywhere to expand */}
              <div
                role="button"
                tabIndex={isWorking ? 0 : -1}
                onClick={() =>
                  isWorking && setExpandedDay(isOpen ? null : dayItem.day)
                }
                onKeyDown={(e) => {
                  if (isWorking && (e.key === 'Enter' || e.key === ' ')) {
                    setExpandedDay(isOpen ? null : dayItem.day);
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 sm:p-3.5 text-left transition-colors ${
                  isWorking
                    ? 'cursor-pointer hover:bg-muted/30'
                    : 'cursor-default opacity-60'
                }`}
              >
                {editable ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWorking(dayItem.day);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleToggleWorking(dayItem.day);
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary ${
                      isWorking ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        isWorking ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </span>
                ) : null}

                <div className="min-w-[92px] shrink-0">
                  <span
                    className={`text-sm font-bold block truncate ${isWorking ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {dayMeta.label}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider ${isWorking ? 'text-success' : 'text-muted-foreground'}`}
                  >
                    {isWorking ? 'Available' : 'Day Off'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-end sm:justify-start gap-2 text-xs text-muted-foreground">
                  {isWorking ? (
                    <>
                      <span className="font-mono font-semibold text-foreground truncate">
                        {dayItem.startTime}–{dayItem.endTime}
                      </span>
                      {breakCount > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] shrink-0">
                          <Coffee className="w-3 h-3 text-warning" />
                          {breakCount} break{breakCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="italic truncate">
                      Rest day — no appointments
                    </span>
                  )}
                </div>

                {isWorking && (
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>

              {/* Expanded config panel — only rendered for the open day */}
              {isWorking && isOpen && (
                <div className="px-3 sm:px-3.5 pb-3.5 pt-1 border-t border-border/60 space-y-4">
                  {/* Working hours */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Working Hours
                    </span>
                    <div className="flex items-center gap-1.5 bg-input px-2.5 py-1.5 rounded-lg border border-border w-full sm:w-fit">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {editable ? (
                        <ThemeSelect
                          compact
                          value={dayItem.startTime}
                          onChange={(e) =>
                            handleTimeChange(
                              dayItem.day,
                              'startTime',
                              e.target.value,
                            )
                          }
                          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </ThemeSelect>
                      ) : (
                        <span className="text-xs font-semibold text-foreground">
                          {dayItem.startTime}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground px-1">
                        to
                      </span>

                      {editable ? (
                        <ThemeSelect
                          compact
                          value={dayItem.endTime}
                          onChange={(e) =>
                            handleTimeChange(
                              dayItem.day,
                              'endTime',
                              e.target.value,
                            )
                          }
                          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </ThemeSelect>
                      ) : (
                        <span className="text-xs font-semibold text-foreground">
                          {dayItem.endTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Breaks — header with Add Break aligned right, consistent for empty/populated states */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-warning" />
                        Breaks{breakCount > 0 ? ` (${breakCount})` : ''}
                      </span>

                      {editable && (
                        <button
                          type="button"
                          onClick={() => handleAddBreak(dayItem.day)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-semibold px-2 py-1 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Break</span>
                        </button>
                      )}
                    </div>

                    {breakCount > 0 ? (
                      <div className="space-y-1.5">
                        {dayItem.breaks!.map((b, bIdx) => (
                          <div
                            key={bIdx}
                            className="flex items-center gap-1.5 text-xs bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border text-foreground w-full sm:w-fit"
                          >
                            {editable ? (
                              <>
                                <ThemeSelect
                                  compact
                                  value={b.start}
                                  onChange={(e) =>
                                    handleBreakTimeChange(
                                      dayItem.day,
                                      bIdx,
                                      'start',
                                      e.target.value,
                                    )
                                  }
                                  className="bg-transparent text-[11px] text-foreground focus:outline-none cursor-pointer"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </ThemeSelect>
                                <span className="text-muted-foreground">-</span>
                                <ThemeSelect
                                  compact
                                  value={b.end}
                                  onChange={(e) =>
                                    handleBreakTimeChange(
                                      dayItem.day,
                                      bIdx,
                                      'end',
                                      e.target.value,
                                    )
                                  }
                                  className="bg-transparent text-[11px] text-foreground focus:outline-none cursor-pointer"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </ThemeSelect>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveBreak(dayItem.day, bIdx)
                                  }
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-auto sm:ml-1 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-mono">
                                {b.start} - {b.end}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        No breaks scheduled for this day.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
