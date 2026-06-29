import { IconDoc } from "@/components/crm/icons";
import { PulseIconDownload } from "@/components/pulse/pulse-icons";
import { TASK_DEMO_USER_ID } from "@/lib/crm/task-utils";
import { TEAM } from "@/lib/crm/static-data";

export function KbPageHeader() {
  const meName = TEAM.find((m) => m.id === TASK_DEMO_USER_ID)?.name ?? "Medarbejder";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
            <IconDoc size={14} className="text-agency-brand" aria-hidden />
            Vidensbase · intern wiki
          </p>
          <h1 className="font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[22px]">Knowledge base</h1>
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-snug text-fg-muted">
            Playbooks, SOP, sikkerhed og værktøjer til dit team. Du arbejder som{" "}
            <span className="font-semibold text-fg">{meName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 font-sans text-[11px] font-medium text-fg-muted transition-colors hover:border-agency-brand-border hover:bg-agency-brand-soft hover:text-agency-brand"
          >
            <PulseIconDownload size={12} /> Eksport
          </button>
          <button
            type="button"
            className="inline-flex h-[26px] items-center rounded-md border border-agency-brand-border bg-agency-brand-soft px-3 font-sans text-[11px] font-medium text-agency-brand transition-colors hover:bg-agency-brand/15"
          >
            Ny artikel
          </button>
        </div>
      </header>
    </div>
  );
}
