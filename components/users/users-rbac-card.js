import Link from "next/link";

import { routes } from "@/config/routes";

export function UsersRbacCard() {
  return (
    <section className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Roller</h2>
      <ul className="mt-4 space-y-2 font-sans text-[12px] text-fg-muted">
        <li>
          <span className="font-semibold text-fg">Admin</span> — fuld workspace, brugerstyring og indstillinger.
        </li>
        <li>
          <span className="font-semibold text-fg">Standard</span> — intern bruger med fuld produktadgang.
        </li>
      </ul>
      <p className="mt-4 border-t border-border-soft pt-3 font-sans text-[11px] text-fg-muted">
        <Link href={routes.kb} className="font-medium text-agency-brand hover:underline">
          Knowledge base
        </Link>{" "}
        ·{" "}
        <Link href={routes.team} className="font-medium text-agency-brand hover:underline">
          Team-roster
        </Link>
      </p>
    </section>
  );
}
