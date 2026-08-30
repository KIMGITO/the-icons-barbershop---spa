import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

export interface CustomDatePickerProps {
  id?: string;
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  error,
  helperText,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current viewing month/year inside picker
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Outside click listener
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    onChange(dateStr);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Build days grid
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOffset = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday ... We want Monday as 0
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  };

  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOffset(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDayClick = (dayNumber: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNumber).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    
    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    onChange(dateStr);
    setIsOpen(false);
  };

  const formattedDisplay = value ? (() => {
    const d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  })() : 'Select date...';

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-muted/40 border-border text-muted-foreground' 
            : 'cursor-pointer bg-input text-foreground hover:border-primary/50'
        } ${
          isOpen ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border'
        } ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground truncate">
            {formattedDisplay}
          </span>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
          Pick
        </span>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-2xl border border-border bg-card shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Navigation */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xs font-bold text-foreground">
              {monthNames[viewMonth]} {viewYear}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground mb-1">
            {daysOfWeek.map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Offset days from previous month */}
            {Array.from({ length: firstDayOffset }).map((_, i) => {
              const prevDay = prevMonthDays - firstDayOffset + i + 1;
              return (
                <div 
                  key={`prev-${i}`} 
                  className="p-1.5 text-center text-[11px] text-muted-foreground/30 select-none"
                >
                  {prevDay}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${viewYear}-${mm}-${dd}`;

              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              const isDisabled = 
                (minDate && dateStr < minDate) || 
                (maxDate && dateStr > maxDate);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(day)}
                  className={`p-1.5 rounded-lg text-center font-semibold text-xs transition-all ${
                    isDisabled 
                      ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
                      : 'cursor-pointer hover:bg-primary/20'
                  } ${
                    isSelected 
                      ? 'bg-primary text-black font-extrabold shadow-sm' 
                      : isToday 
                      ? 'border border-primary text-primary font-bold bg-primary/5' 
                      : 'text-foreground'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive font-medium mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  );
};
