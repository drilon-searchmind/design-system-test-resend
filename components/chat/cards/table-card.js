import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  ok:   "text-agency-ok",
  warn: "text-agency-warn",
  bad:  "text-agency-bad",
};
const STATUS_DOT = {
  ok:   "bg-agency-ok",
  warn: "bg-agency-warn",
  bad:  "bg-agency-bad",
};

/** @param {{ data: import('@/lib/demo/chat-scenarios').TableCardData }} props */
export function TableCard({ data }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface-card shadow-inset-card">
      {data.title ? (
        <div className="border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-soft">{data.title}</p>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-left">
          <thead>
            <tr className="border-b border-border">
              {data.columns.map((col, i) => (
                <th key={i} className="px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri} className={cn("border-b border-border last:border-0", ri % 2 === 1 && "bg-surface-muted/30")}>
                {row.map((cell, ci) => {
                  const isStatus = data.statusCol != null && ci === data.statusCol;
                  if (isStatus) {
                    return (
                      <td key={ci} className="px-4 py-2">
                        <span className={cn("inline-flex items-center gap-1.5 font-sans text-[12px]", STATUS_STYLE[cell] ?? "text-fg-muted")}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[cell] ?? "bg-fg-muted")} />
                          {cell === "ok" ? "OK" : cell === "warn" ? "Lav" : "Over"}
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={ci} className="px-4 py-2 font-sans text-[12.5px] text-fg">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.caption ? (
        <div className="border-t border-border bg-surface-muted/30 px-4 py-2.5">
          <p className="font-sans text-[11.5px] leading-relaxed text-fg-muted">{data.caption}</p>
        </div>
      ) : null}
    </div>
  );
}
