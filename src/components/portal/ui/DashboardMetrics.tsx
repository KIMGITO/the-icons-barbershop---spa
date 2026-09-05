import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  valueClassName = "text-foreground",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`p-2 rounded-none bg-card border border-border space-y-1 min-w-0 ${className}`}
    >
      <span className="block text-[11px] text-center font-semibold uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </span>
      <div className={`text-lg sm:text-2xl  font-mono font-extrabold text-center truncate ${valueClassName}`}>
        {value}
      </div>
      {description && (
        <p className="text-[11px] text-center text-muted-foreground truncate">
          {description}
        </p>
      )}
    </div>
  );
}