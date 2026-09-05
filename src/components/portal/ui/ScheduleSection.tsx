import React from 'react';

interface ScheduleSectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyMessage: string;
  scrollable?: boolean;
  children: React.ReactNode;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  icon,
  title,
  count,
  emptyMessage,
  scrollable = false,
  children,
}) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2">
      {icon}
      <h3 className="text-xs sm:text-sm font-bold text-foreground">
        {title} ({count})
      </h3>
    </div>
    {count === 0 ? (
      <p className="p-5 text-center text-xs text-muted-foreground">{emptyMessage}</p>
    ) : (
      <div className={`divide-y divide-border/60 ${scrollable ? 'max-h-72 overflow-y-auto' : ''}`}>
        {children}
      </div>
    )}
  </div>
);