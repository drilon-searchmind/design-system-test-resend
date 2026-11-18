import Link from "next/link";

import { auth } from "@/auth";
import { WorkspacePlaceholder } from "@/components/crm/workspace-placeholder";
import { routes } from "@/config/routes";
import { sessionUserIsAdmin } from "@/lib/auth/session-admin";

export const metadata = { title: "Toolbox · Searchmind 1337 OS" };

/** @typedef {{ href: string; title: string; description: string; adminOnly?: boolean }} ToolboxLink */

/** @type {{ title: string; links: ToolboxLink[] }[]} */
const TOOLBOX_GROUPS = [
  {
    title: "Kunder og brand",
    links: [
      { href: routes.tov, title: "Brand Core", description: "Analysér en kundes brand og tone, og hent brand guidelines." },
      { href: routes.nps, title: "NPS", description: "Send målinger og følg kundetilfredshed." },
      { href: routes.contracts, title: "Kontrakter", description: "Send kontrakter til underskrift og se aftaler." },
    ],
  },
  {
    title: "Viden og skabeloner",
    links: [
      { href: routes.kb, title: "Knowledge base", description: "Interne procedurer, guides og how-tos." },
      { href: routes.kbNew, title: "Ny artikel", description: "Skriv en ny artikel til Knowledge base." },
      { href: routes.templates, title: "Opgaveskabeloner", description: "Standardopgaver til nye kunder og forløb.", adminOnly: true },
    ],
  },
  {
    title: "AI og integrationer",
    links: [
      { href: routes.chat, title: "AI Chat", description: "Spørg ind til kunder, opgaver og tal via Slack og Claude." },
      { href: routes.settings, title: "Indstillinger", description: "Integrationer, ClickUp-import og beregninger." },
      { href: routes.featureStatus, title: "Status på 1337 OS", description: "Hvad virker, og hvad er på vej. Kan deles uden login." },
    ],
  },
];

export default async function ToolboxPage() {
  const session = await auth();
  const isAdmin = await sessionUserIsAdmin(session);
  const groups = TOOLBOX_GROUPS.map((g) => ({
    ...g,
    links: g.links.filter((l) => !l.adminOnly || isAdmin),
  })).filter((g) => g.links.length > 0);

  return (
    <WorkspacePlaceholder
      title="Toolbox"
      description="Genveje til interne værktøjer og skabeloner for hele bureauet."
    >
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
              {group.title}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tally-panel flex h-full flex-col gap-1 p-4 transition-colors hover:border-agency-brand-border hover:bg-surface-muted/50"
                  >
                    <span className="font-sans text-[13px] font-semibold text-fg">{link.title}</span>
                    <span className="font-sans text-[12px] leading-snug text-fg-muted">{link.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </WorkspacePlaceholder>
  );
}
