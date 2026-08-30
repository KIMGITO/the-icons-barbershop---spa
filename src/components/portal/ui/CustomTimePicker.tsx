import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, Search } from 'lucide-react';
import { generateTimeSlots } from '../../../utils/timeUtils';
import { Input } from '../../ui/Input';

export interface CustomTimePickerProps {
  id?: string;
  label?: string;
  value: string; // e.g. "10:30 AM"
  onChange: (time: string) => void;
  intervalMinutes?: number; // default 15
  startHour?: number; // default 8 (08:00 AM)
  endHour?: number; // default 20 (08:00 PM)
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  id,
  label,
  value,
  onChange,
  intervalMinutes = 15,
  startHour = 8,
  endHour = 20,
  disabled = false,
  error,
  helperText,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const allSlots = React.useMemo(() => {
    return generateTimeSlots(startHour, endHour, intervalMinutes);
  }, [startHour, endHour, intervalMinutes]);

  const filteredSlots = React.useMemo(() => {
    if (!searchQuery.trim()) return allSlots;
    const q = searchQuery.toLowerCase().replace(/\s+/g, '');
    return allSlots.filter(slot => slot.toLowerCase().replace(/\s+/g, '').includes(q));
  }, [allSlots, searchQuery]);

  // Handle outside click
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

  // Scroll to selected item when opened
  useEffect(() => {
    if (isOpen && selectedItemRef.current && listContainerRef.current) {
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
    setSearchQuery('');
  };

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

      {/* Trigger Button */}
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground font-mono">
            {value || 'Select time...'}
          </span>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
          Time
        </span>
      </button>

      {/* Popover Time List */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-2xl border border-border bg-card shadow-2xl p-2 flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150">
          {/* Search/Filter header */}
          <div className="p-1.5 border-b border-border mb-1 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter time (e.g. 10:30, 2 PM)..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-transparent focus:border-transparent focus:shadow-none py-0 px-0"
              autoFocus
            />
          </div>

          <div 
            ref={listContainerRef} 
            className="overflow-y-auto max-h-56 p-1 space-y-0.5"
          >
            {filteredSlots.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching time slot
              </div>
            ) : (
              filteredSlots.map(slot => {
                const isSelected = slot === value;
                return (
                  <button
                    key={slot}
                    ref={isSelected ? selectedItemRef : undefined}
                    type="button"
                    onClick={() => handleSelect(slot)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{slot}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
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
