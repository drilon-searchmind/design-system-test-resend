/**
 * @param {{ title: string; sub?: string }} props
 */
export function PulseCardHeader({ title, sub }) {
  return (
    <header>
      <h3 className="text-base font-semibold tracking-[-0.02em] text-fg">{title}</h3>
      {sub ? (
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-muted">{sub}</p>
      ) : null}
    </header>
  );
}
