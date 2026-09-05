import React, { useState, useRef, useEffect } from 'react';
import { User, Phone, Search, Check, Plus, Sparkles } from 'lucide-react';
import { Input } from '../../ui/Input';
import { useCustomerStore } from '../../../stores/useCustomerStore';
import { CustomerProfile } from '../../../types';

export interface CustomerSelectorProps {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onSelectCustomer: (customer: { name: string; phone: string; email: string; vipStatus?: boolean }) => void;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onEmailChange?: (email: string) => void;
  error?: string;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customerName,
  customerPhone,
  customerEmail,
  onSelectCustomer,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  error
}) => {
  const { customers, loadCustomers } = useCustomerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load customers from the database when the lookup opens
  useEffect(() => {
    if (isOpen) loadCustomers();
  }, [isOpen, loadCustomers]);

  // Close outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const handlePickCustomer = (c: CustomerProfile) => {
    onSelectCustomer({
      name: c.name,
      phone: c.phone,
      email: c.email,
      vipStatus: c.vipStatus
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Client Information
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Search className="w-3 h-3" />
          <span>{isOpen ? 'Close client lookup' : 'Lookup existing client'}</span>
        </button>
      </div>

      {/* Existing Client Search Popover */}
      {isOpen && (
        <div className="rounded-xl  p-2.5 shadow-xl space-y-2 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2 bg-input px-2.5 py-1.5 ">
            {/* <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> */}
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by client name or phone..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-transparent focus:border-transparent focus:shadow-none py-0 px-0"
              autoFocus
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching registered client found. Type details below to create a new client booking.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = c.name === customerName && c.phone === customerPhone;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickCustomer(c)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.vipStatus && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {c.phone} • {c.email}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Manual / autofilled client input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <Input
            type="text"
            required
            value={customerName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Full Name (e.g. John Kamau)"
            className="text-xs rounded-xl py-2.5"
          />
        </div>
        <div className="relative">
          <Input
            type="tel"
            required
            value={customerPhone}
            onChange={e => onPhoneChange(e.target.value)}
            placeholder="Phone Number (e.g. 0722 000 000)"
            className="text-xs rounded-xl py-2.5 font-mono"
          />
        </div>
      </div>

      {onEmailChange && (
        <div>
          <Input
            type="email"
            value={customerEmail}
            onChange={e => onEmailChange(e.target.value)}
            placeholder="Client Email (optional for receipt notification)"
            className="text-xs rounded-xl py-2"
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive font-medium">{error}</p>
      )}
    </div>
  );
};
