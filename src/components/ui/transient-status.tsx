"use client";

import * as React from "react";

type StatusTone = "success" | "info";
type StatusNotice = Readonly<{ message: string; tone: StatusTone }>;
type TransientStatusContextValue = Readonly<{
  announce: (message: string, tone?: StatusTone) => void;
}>;

const TransientStatusContext = React.createContext<TransientStatusContextValue | null>(null);

export function TransientStatusProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [notice, setNotice] = React.useState<StatusNotice | null>(null);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = React.useCallback((message: string, tone: StatusTone = "success") => {
    if (timeout.current) clearTimeout(timeout.current);
    setNotice({ message, tone });
    timeout.current = setTimeout(() => setNotice(null), 4_000);
  }, []);

  React.useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  return (
    <TransientStatusContext.Provider value={{ announce }}>
      {children}
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-md border px-4 py-3 text-sm shadow-md sm:left-auto sm:right-6 sm:mx-0 ${notice.tone === "success" ? "border-success/30 bg-success-bg text-success" : "border-info/30 bg-info-bg text-info"}`}
        >
          {notice.message}
        </div>
      ) : null}
    </TransientStatusContext.Provider>
  );
}

export function useTransientStatus(): TransientStatusContextValue {
  const context = React.useContext(TransientStatusContext);
  if (!context) throw new Error("useTransientStatus must be used within TransientStatusProvider.");
  return context;
}
