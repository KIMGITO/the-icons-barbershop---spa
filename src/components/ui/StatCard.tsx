import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  valueClassName?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'glass';
}

export function StatCard({
  label,
  value,
  description,
  valueClassName = "text-foreground",
  className = "",
  variant = 'default',
}: StatCardProps) {
  const variants = {
    default: "bg-card border-border",
    outline: "bg-transparent border-border",
    glass: "bg-white/5 backdrop-blur-md border-white/10"
  };

  return (
    <div
      className={`p-3.5 rounded-xl border space-y-1 min-w-0 ${variants[variant]} ${className}`}
    >
      <span className="block text-[10px] sm:text-[11px] text-center font-bold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </span>
      <div className={`text-lg sm:text-2xl font-mono font-extrabold text-center truncate ${valueClassName}`}>
        {value}
      </div>
      {description && (
        <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground truncate">
          {description}
        </p>
      )}
    </div>
  );
}
