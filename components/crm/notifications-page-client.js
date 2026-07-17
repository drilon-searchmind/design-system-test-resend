"use client";

import { CrmNotificationsView } from "@/components/crm/crm-notifications-view";

export function NotificationsPageClient() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-4 md:mb-5">
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">
          Notifikationer
        </h1>
        <p className="mt-1 font-sans text-[13px] text-fg-muted">
          Alle dine nævnelser, tildelinger og opdateringer på ét sted.
        </p>
      </header>
      <CrmNotificationsView variant="page" />
    </div>
  );
}
