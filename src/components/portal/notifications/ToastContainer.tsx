import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../../stores/uiStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-xl flex items-start gap-2.5 backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess 
                ? 'bg-card/95 border-success/40 text-foreground' 
                : isError 
                ? 'bg-card/95 border-destructive/40 text-foreground' 
                : isWarning
                ? 'bg-card/95 border-warning/40 text-foreground'
                : 'bg-card/95 border-primary/40 text-foreground'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
            {isWarning && <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0 space-y-0.5">
              {toast.title && (
                <div className="text-xs font-bold text-foreground leading-tight">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-muted-foreground leading-tight">
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
