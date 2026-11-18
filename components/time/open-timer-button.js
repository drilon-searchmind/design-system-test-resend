"use client";

import { useTimerModal } from "@/components/crm/timer-modal-context";

/**
 * @param {{
 *   className?: string;
 *   children: import("react").ReactNode;
 *   type?: import("react").ButtonHTMLAttributes<HTMLButtonElement>["type"];
 * }} props
 */
export function OpenTimerButton({ className, children, type = "button" }) {
  const { openTimer } = useTimerModal();
  return (
    <button type={type} className={className} onClick={openTimer}>
      {children}
    </button>
  );
}
