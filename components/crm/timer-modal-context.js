"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** @typedef {{ clientSlug?: string; taskKey?: string; trackMode?: "timer" | "manual"; billable?: boolean }} TimerLaunchOptions */

/** @typedef {{
 *   open: boolean;
 *   launchOptions: TimerLaunchOptions | null;
 *   openTimer: (options?: TimerLaunchOptions) => void;
 *   closeTimer: () => void;
 * }} TimerModalContextValue */

/** @type {React.Context<TimerModalContextValue | null>} */
const TimerModalContext = createContext(null);

/**
 * Holds timer modal open state for the authenticated CRM shell.
 * @param {{ children: import("react").ReactNode }} props
 */
export function TimerModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [launchOptions, setLaunchOptions] = useState(/** @type {TimerLaunchOptions | null} */ (null));

  const openTimer = useCallback((options /** @type {TimerLaunchOptions | void} */) => {
    setLaunchOptions(options && typeof options === "object" ? options : null);
    setOpen(true);
  }, []);

  const closeTimer = useCallback(() => {
    setOpen(false);
    setLaunchOptions(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      launchOptions,
      openTimer,
      closeTimer,
    }),
    [open, launchOptions, openTimer, closeTimer],
  );

  return <TimerModalContext.Provider value={value}>{children}</TimerModalContext.Provider>;
}

/** @returns {TimerModalContextValue} */
export function useTimerModal() {
  const ctx = useContext(TimerModalContext);
  if (!ctx) {
    throw new Error("useTimerModal must be used within TimerModalProvider");
  }
  return ctx;
}
