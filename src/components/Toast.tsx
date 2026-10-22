import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slide-up ${
            t.type === 'success'
              ? 'bg-[#101916]/95 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40'
              : t.type === 'error'
              ? 'bg-[#1e1014]/95 border-rose-500/30 text-rose-100 shadow-rose-950/40'
              : 'bg-[#121624]/95 border-purple-500/30 text-purple-100 shadow-purple-950/40'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
            <div className="text-xs text-gray-300 leading-relaxed break-words">{t.message}</div>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-gray-400 hover:text-white transition-colors p-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
