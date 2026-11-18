import { CrmShell } from "@/components/crm/crm-shell";

/** Authenticated workspace — 1337 OS shell (sidebar + top bar). */
export default function DashboardRouteGroupLayout({ children }) {
  return <CrmShell>{children}</CrmShell>;
}
