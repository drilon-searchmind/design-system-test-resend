import { cn } from "@/lib/utils";

/**
 * @param {{
 *   task: {
 *     hint?: string | null;
 *     description?: string | null;
 *     dept: string;
 *     title: string;
 *     status: string;
 *   };
 *   mode?: "demo" | "database";
 * }} props
 */
export function TaskDetailDescriptionCard({ task, mode = "demo" }) {
  const descriptionHtml = typeof task.description === "string" ? task.description.trim() : "";

  const titleChip = mode === "database" ? "Beskrivelse" : "Opgavespec";

  return (
    <div className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{titleChip}</h2>
      {descriptionHtml ?
        <div
          className="task-comment-body mt-3 font-sans text-[13px] leading-relaxed text-fg-muted"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      : (
        <p className="mt-3 font-sans text-[13px] leading-relaxed text-fg-quiet">
          Ingen beskrivelse endnu — tilføj en via redigering eller ved oprettelse.
        </p>
      )}
    </div>
  );
}
