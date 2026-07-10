import Link from "next/link";

import { routes } from "@/config/routes";

export function TeamHubLinksCard() {
  return (
    <section className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Relateret i OS</h2>
      <p className="mt-2 font-sans text-[12px] leading-snug text-fg-muted">
        Capacity, backlog og bureau‑rytme finder du hurtigt herfra.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: routes.workload, label: "Belægning", hint: "Matrix & kapacitet" },
          { href: routes.time, label: "Tidsregistrering", hint: "Forbrug" },
          { href: routes.users, label: "Brugerstyring", hint: "Auth & roller" },
          { href: routes.kb, label: "Knowledge base", hint: "SOP / playbooks" },
        ].map((x) => (
          <li key={x.href}>
            <Link
              href={x.href}
              className="flex flex-col rounded-lg border border-border-soft bg-surface-muted/30 px-3 py-2 transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft/20"
            >
              <span className="font-sans text-[12px] font-semibold text-fg">{x.label}</span>
              <span className="mt-0.5 text-[10px] text-fg-quiet">{x.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
