import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X, Loader2 } from 'lucide-react';
import { Input } from '../../ui/Input';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'outline' | 'success';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string> {
  id?: string;
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export function CustomSelect<T = string>({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  clearable = false,
  error,
  helperText,
  className = ''
}: CustomSelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current && !current.disabled) {
        onChange(current.value);
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('' as unknown as T);
    setSearchQuery('');
  };

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id={selectId}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-muted/40 border-border text-muted-foreground' 
            : 'cursor-pointer bg-input text-foreground hover:border-primary/50'
        } ${
          isOpen ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border'
        } ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading options...</span>
            </div>
          ) : selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 text-primary">{selectedOption.icon}</span>
              )}
              <span className="font-semibold text-foreground truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  • {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded hover:text-foreground hover:bg-muted"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </button>

      {/* Floating Dropdown Listbox */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {searchable && (
            <div className="p-2 border-b border-border bg-input/40 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-transparent focus:border-transparent focus:shadow-none py-0 px-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div ref={listRef} className="overflow-y-auto max-h-56 p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${
                      opt.disabled 
                        ? 'opacity-40 cursor-not-allowed text-muted-foreground' 
                        : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                        : isHighlighted
                        ? 'bg-muted/70 text-foreground'
                        : 'text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <span className={`shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {opt.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="font-semibold truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[11px] text-muted-foreground truncate">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  );
}
