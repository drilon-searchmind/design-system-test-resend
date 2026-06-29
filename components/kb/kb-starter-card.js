import Link from "next/link";

import { IconDoc } from "@/components/crm/icons";
import { routes } from "@/config/routes";

export function KbStarterCard() {
  return (
    <div className="tally-panel p-4 md:p-[length:var(--ds-studio-pad-main)]">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-agency-brand-border bg-agency-brand-soft text-agency-brand">
          <IconDoc size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-sm font-semibold text-fg">Start med hubben</h2>
          <p className="mt-1 font-sans text-[12px] leading-snug text-fg-muted">
            Kort intro til navigation, roller og daglig rytme i Agency OS — god første læsning for nye specialister.
          </p>
          <Link
            href={`${routes.kb}/agency-os-hub`}
            className="mt-2 inline-flex font-sans text-[12px] font-medium text-agency-brand hover:underline"
          >
            Åbn artikel →
          </Link>
        </div>
      </div>
    </div>
  );
}
