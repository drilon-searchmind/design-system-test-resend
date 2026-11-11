"use client";

import { useSession } from "next-auth/react";

import { ADMIN_CAPABILITIES, STANDARD_USER_CAPABILITIES } from "@/lib/auth/permissions";

/** Oversigt: hvad administratorer kan, som almindelige brugere ikke kan. */
export function SettingsPermissionsPanel() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  return (
    <section className="tally-panel p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-sans text-base font-semibold text-fg">Roller og rettigheder</h2>
        <span
          className={`inline-flex h-[22px] items-center rounded-full border px-2.5 text-[11px] font-semibold ${
            isAdmin ?
              "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
            : "border-border bg-surface-muted text-fg-muted"
          }`}
        >
          Din rolle: {isAdmin ? "Administrator" : "Standard"}
        </span>
      </div>
      <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
        Administratorer har adgang til nedenstående, som almindelige brugere ikke har. Rettighederne
        håndhæves på serveren, så de også gælder hvis en knap ikke er skjult. Admins udpeges under{" "}
        <span className="font-medium text-fg">Brugere</span> (rolle på den enkelte bruger).
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {ADMIN_CAPABILITIES.map((group) => (
          <div key={group.area} className="rounded-xl border border-border-soft bg-surface-muted/35 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {group.area}
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {group.items.map((item) => (
                <li key={item.title} className="font-sans text-[12px] leading-snug text-fg-muted">
                  <span className="font-semibold text-fg">{item.title}</span> — {item.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border-soft p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
          Det kan alle brugere
        </h3>
        <ul className="mt-3 list-inside list-disc space-y-1.5 font-sans text-[12px] text-fg-muted">
          {STANDARD_USER_CAPABILITIES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
