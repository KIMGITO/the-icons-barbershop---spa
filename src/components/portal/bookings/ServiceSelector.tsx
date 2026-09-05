import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Clock, Tag, ChevronDown, Check, Search } from 'lucide-react';
import { ServiceItem } from '../../../types';
import { Input } from '../../ui/Input';

export interface ServiceSelectorProps {
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectService: (service: ServiceItem) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  disabled = false,
  error,
  label = 'Selected Service'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedService = services.find(s => s.id === selectedServiceId) || services[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const filteredServices = services.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.shortDescription && s.shortDescription.toLowerCase().includes(q))
    );
  });

  const handlePick = (s: ServiceItem) => {
    onSelectService(s);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>

      {/* Main Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-muted/40 border-border' 
            : 'cursor-pointer bg-input text-foreground hover:border-primary/50'
        } ${
          isOpen ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border'
        } ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
      >
        {selectedService ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <div className="font-bold text-sm text-foreground truncate">
                {selectedService.name}
              </div>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-primary" />
                  <span>{selectedService.durationMinutes} min</span>
                </span>
                <span>•</span>
                <span className="font-semibold text-primary font-mono">
                  KSh {selectedService.priceKsh.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Select service...</span>
        )}

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 rounded-2xl border border-border bg-card shadow-2xl p-2 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          

          <div className="overflow-y-auto max-h-56 p-1 space-y-1">
            {filteredServices.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching service found
              </div>
            ) : (
              filteredServices.map(s => {
                const isSelected = s.id === selectedService?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {s.durationMinutes} min
                        </span>
                        <span>•</span>
                        <span className="capitalize">{s.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-xs text-primary">
                        KSh {s.priceKsh.toLocaleString()}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
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
    </div>
  );
};
