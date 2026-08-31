import React, { useState, useRef, useEffect, useId, Children, isValidElement } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { Input } from './Input';

interface ParsedOption { value: string; label: string; disabled: boolean; }

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const out: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as React.ReactElement<any>;
    const t = el.type as any;
    if (t === 'option') {
      const p = el.props as any;
      out.push({ value: String(p.value ?? ''), label: String(p.children ?? p.label ?? ''), disabled: Boolean(p.disabled) });
    } else if (t === 'optgroup') {
      Children.forEach((el.props as any).children, (oc: any) => {
        if (isValidElement(oc) && (oc.type as any) === 'option') {
          const p = (oc as any).props;
          out.push({ value: String(p.value ?? ''), label: String(p.children ?? p.label ?? ''), disabled: Boolean(p.disabled) });
        }
      });
    }
  });
  return out;
}

interface Props extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'children'> {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  helperText?: string;
  error?: string;
  compact?: boolean;
  popoverClassName?: string;
}

export const ThemeSelect: React.FC<Props> = ({
  children, value, onChange, id, name, disabled, searchable, searchPlaceholder = 'Search...',
  clearable, helperText, error, className = '', compact = false, placeholder = 'Select an option...',
  onBlur, onFocus, popoverClassName = '', ...rest
}) => {
  const gid = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const all = React.useMemo(() => parseOptions(children), [children]);
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? all.filter(o => o.label.toLowerCase().includes(s)) : all;
  }, [all, q]);
  const sel = all.find(o => o.value === String(value ?? ''));

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
    if (open) { setHi(0); setQ(''); }
  }, [open, searchable]);

  const fire = (v: string) => {
    onChange?.({
      target: { value: v }, currentTarget: { value: v }, nativeEvent: {} as Event, type: 'change'
    } as any as React.ChangeEvent<HTMLSelectElement>);
  };

  const pick = (o: ParsedOption) => { if (o.disabled) return; fire(o.value); setOpen(false); setQ(''); };
  const clear = (e: React.MouseEvent) => { e.stopPropagation(); fire(''); setQ(''); };

  const key = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setQ(''); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(p => (p < filtered.length - 1 ? p + 1 : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(p => (p > 0 ? p - 1 : filtered.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = filtered[hi]; if (c) pick(c); }
    else if (e.key === 'Tab') { setOpen(false); setQ(''); }
  };

  const triggerPad = compact ? 'px-2 py-1 text-xs rounded-lg' : 'px-3 py-2.5 text-sm rounded-xl';

  return (
    <div className={`relative `} ref={ref}>
      <button type="button" id={id || gid} role="combobox" aria-expanded={open} aria-haspopup="listbox"
        disabled={disabled} onClick={() => !disabled && setOpen(p => !p)} onKeyDown={key} onBlur={onBlur as any} onFocus={onFocus as any}
        className={`w-full flex items-center justify-between gap-2 border text-left transition-all ${triggerPad} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-muted/40 border-border text-muted-foreground'
          : 'cursor-pointer bg-input text-foreground hover:border-primary/50'} ${
          open ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border'
        } ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}>
        <span className={`min-w-0 flex-1 truncate ${sel ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {sel ? sel.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {clearable && sel && !disabled && (
            <span role="button" tabIndex={0} onClick={clear} className="p-0.5 rounded hover:text-foreground hover:bg-muted" title="Clear selection">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`} />
        </span>
      </button>

      <select tabIndex={-1} aria-hidden="true" className="sr-only" value={sel?.value || ''} {...rest}
        onChange={e => { const o = all.find(x => x.value === e.target.value); if (o) pick(o); }}>
        {children}
      </select>

      {open && (
        <div className={`absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150 ${popoverClassName}`}>
          {searchable && (
            <div className="p-2 border-b border-border bg-input/40 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                ref={searchRef}
                type="text"
                value={q}
                onChange={e => { setQ(e.target.value); setHi(0); }}
                onKeyDown={key}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-transparent focus:border-transparent focus:shadow-none py-0 px-0"
              />
              {q && <button type="button" onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-3 h-3" /></button>}
            </div>
          )}
          <div className="overflow-y-auto max-h-56 p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No matching options found</div>
            ) : filtered.map((o, i) => {
              const isSel = o.value === String(value ?? '');
              return (
                <button key={`${o.value}-${i}`} type="button" disabled={o.disabled}
                  onClick={() => pick(o)} onMouseEnter={() => setHi(i)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg text-xs text-left transition-all ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} ${
                    o.disabled ? 'opacity-40 cursor-not-allowed text-muted-foreground' : 'cursor-pointer'} ${
                    isSel ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                    : i === hi ? 'bg-muted/70 text-foreground' : 'text-foreground hover:bg-muted/40'}`}>
                  <span className="truncate font-semibold">{o.label}</span>
                  {isSel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive font-medium mt-1">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-muted-foreground mt-1">{helperText}</p>}
    </div>
  );
};

export default ThemeSelect;
