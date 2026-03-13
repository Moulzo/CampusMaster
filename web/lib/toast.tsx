"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastCtx = {
  push: (type: ToastType, message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = timersRef.current;
    const t = timers[id];
    if (t) {
      window.clearTimeout(t);
      delete timers[id];
    }
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    setToasts((prev) => [{ id, type, message }, ...prev].slice(0, 3));

    const t = window.setTimeout(() => remove(id), 3500);
    timersRef.current[id] = t;
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => {
          const cls =
            t.type === "success"
              ? "bg-emerald-600"
              : t.type === "error"
              ? "bg-red-600"
                : t.type === "warning"
              ? "bg-amber-600"
              : "bg-slate-900";
          return (
            <div key={t.id} className={`${cls} text-white shadow-lg rounded-lg px-4 py-3 max-w-sm`}>
              <div className="flex items-start gap-3">
                <div className="text-sm font-medium flex-1 break-words">{t.message}</div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="text-white/80 hover:text-white text-sm font-bold leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
