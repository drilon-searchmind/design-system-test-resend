"use client";

import { ReportPeriodPicker } from "@/components/crm/report-period-picker";
import { usePulseData } from "@/components/pulse/pulse-data-context";
import { usePulsePeriod } from "@/components/pulse/pulse-period-context";
import { cn } from "@/lib/utils";

export function PulsePageHeader() {
  const { agencyMetrics: m, period: bundlePeriod } = usePulseData();
  const { year, month, onChange, refreshing, subtitle } = usePulsePeriod();

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.08em] text-fg-soft">
          ◇ pulse
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
          Agency Pulse
        </h1>
        <p
          className={cn(
            "mt-2 max-w-prose text-sm leading-relaxed text-fg-muted transition-opacity",
            refreshing && "opacity-60",
          )}
        >
          <span className="capitalize">{subtitle}</span>
          {" · "}
          {m.activeClients} aktive kunder · {m.billableHoursMonth} billable timer
          {bundlePeriod.isCurrent ? " denne måned" : ` i ${bundlePeriod.label.toLowerCase()}`}
        </p>
      </div>

      <ReportPeriodPicker year={year} month={month} onChange={onChange} />
    </header>
  );
}
