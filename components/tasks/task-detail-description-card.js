import { cn } from "@/lib/utils";

/**
 * @param {{
 *   task: {
 *     hint?: string | null;
 *     dept: string;
 *     title: string;
 *     status: string;
 *   };
 *   mode?: "demo" | "database";
 * }} props
 */
export function TaskDetailDescriptionCard({ task, mode = "demo" }) {
  const hint =
    task.hint?.trim() ||
    "Kort beskrivelse ikke sat — fyld CRM-feltet `hint` eller brug aktivitetsloggen til nuancerede noter.";

  const titleChip = mode === "database" ? "Opgavenote (CRM)" : "Opgavespec";

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{titleChip}</h2>
      <p className={cn("mt-3 font-sans text-[13px] leading-relaxed text-fg-muted")}>{hint}</p>
    </div>
  );
}
