import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarNavProps {
  formattedTitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarNav({ formattedTitle, onPrev, onNext, onToday }: CalendarNavProps) {
  return (
    <div className="flex flex-row-reverse gap-3  justify-between w-full">
      {/* Date Display */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-base sm:text-base font-bold text-foreground tracking-tight truncate">
          {formattedTitle}
        </h2>
      </div>

      {/* Nav controls */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 self-start sm:self-auto shrink-0">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous date"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next date"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}