"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const value: ToastContextValue = {
    showToast,
    showError: (message: string) => showToast(message, "error"),
    showSuccess: (message: string) => showToast(message, "success"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg bg-white animate-[slideUp_0.2s_ease-out] ${
              t.kind === "error" ? "border-red-300" : "border-[#EDEAE0]"
            }`}
          >
            {t.kind === "error" ? (
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-[#B8952F] shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-[#4A4A3C] flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-[#8C8C78] hover:text-[#4A4A3C]">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
