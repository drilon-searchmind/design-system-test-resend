import Link from "next/link";

import { routes } from "@/config/routes";

export function KbPageActions() {
  return (
    <Link
      href={routes.kbNew}
      className="inline-flex h-[26px] items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[11px] font-medium text-agency-brand transition-colors hover:bg-agency-brand/15"
    >
      Ny artikel
    </Link>
  );
}
