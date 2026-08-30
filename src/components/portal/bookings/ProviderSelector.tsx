import React, { useState, useRef, useEffect } from 'react';
import { User, Check, ChevronDown, Sparkles, AlertCircle, Search } from 'lucide-react';
import { ServiceProvider } from '../../../types/staff';
import { Input } from '../../ui/Input';

export interface ProviderSelectorProps {
  providers: ServiceProvider[];
  selectedProviderId: string;
  onSelectProvider: (provider: ServiceProvider) => void;
  selectedServiceId?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProviderId,
  onSelectProvider,
  selectedServiceId,
  disabled = false,
  error,
  label = 'Service Provider'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProvider = providers.find(p => p.id === selectedProviderId) || providers[0];

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

  const filteredProviders = providers.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.providerType.toLowerCase().includes(q) ||
      (p.bio && p.bio.toLowerCase().includes(q))
    );
  });

  const handlePick = (p: ServiceProvider) => {
    onSelectProvider(p);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getProviderTypeLabel = (provider: ServiceProvider) => {
    if (provider.id === 'provider-admin') return 'Admin & Master Barber';
    switch (provider.providerType) {
      case 'barber':
        return 'Master Barber';
      case 'facial-specialist':
        return 'Facial Specialist';
      case 'spa-therapist':
        return 'Spa Therapist';
      case 'scalp-care':
        return 'Scalp Care Specialist';
      default:
        return 'Service Provider';
    }
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
        {selectedProvider ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={selectedProvider.avatarUrl}
              alt={selectedProvider.fullName}
              className="w-9 h-9 rounded-full object-cover border border-primary/30 shrink-0"
            />
            <div className="min-w-0 flex-1 truncate">
              <div className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                <span>{selectedProvider.fullName}</span>
                {selectedProvider.id === 'provider-admin' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {getProviderTypeLabel(selectedProvider)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Select provider...</span>
        )}

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 rounded-2xl border border-border bg-card shadow-2xl p-2 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1.5 border-b border-border mb-1 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search provider..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-transparent focus:border-transparent focus:shadow-none py-0 px-0"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-56 p-1 space-y-1">
            {filteredProviders.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching service provider found
              </div>
            ) : (
              filteredProviders.map(p => {
                const isSelected = p.id === selectedProvider?.id;
                const isQualified = 
                  !selectedServiceId || 
                  !p.servicesOfferedIds || 
                  p.servicesOfferedIds.length === 0 || 
                  p.servicesOfferedIds.includes(selectedServiceId);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={p.avatarUrl}
                        alt={p.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                      />
                      <div className="min-w-0 truncate">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span>{p.fullName}</span>
                          {p.id === 'provider-admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {getProviderTypeLabel(p)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isQualified && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Other Specialty
                        </span>
                      )}
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
