import { agencyDeptColor } from "@/lib/crm/dept-tokens";
import { cn } from "@/lib/utils";

/**
 * @param {{ allocation: Record<string, number>; height?: number; className?: string }} props
 */
export function PulseAllocationBar({ allocation, height = 10, className }) {
  /** Allocation category — not a delivery department; excluded from dept capacity charts. */
  const entries = Object.entries(allocation).filter(([k, v]) => v > 0 && k !== "clientMgmt");
  if (entries.length === 0) return null;

  return (
    <div
      className={cn("flex w-full overflow-hidden rounded-full ring-1 ring-border/60", className)}
      style={{ height }}
    >
      {entries.map(([dept, pct]) => (
        <div
          key={dept}
          title={`${dept.toUpperCase()}: ${pct}%`}
          className="min-w-px shrink-0 transition-[flex-grow]"
          style={{
            width: `${pct}%`,
            backgroundColor: agencyDeptColor(dept),
          }}
        />
      ))}
    </div>
  );
}
