"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, message, type, title, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep at most 4 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Overlay */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto p-3.5 rounded shadow-lg border flex items-start gap-3 transition-all duration-300 transform translate-y-0 animate-fadeIn ${
                isSuccess
                  ? "bg-emerald-900 text-white border-emerald-700"
                  : isError
                  ? "bg-rose-900 text-white border-rose-700"
                  : isWarning
                  ? "bg-amber-900 text-white border-amber-700"
                  : "bg-[#0B2545] text-white border-slate-700"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-300" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-300" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-sky-300" />}
              </div>

              <div className="flex-1 text-xs">
                {toast.title && <p className="font-bold text-sm tracking-tight">{toast.title}</p>}
                <p className="font-medium text-slate-100">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-300 hover:text-white p-1 rounded transition"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
