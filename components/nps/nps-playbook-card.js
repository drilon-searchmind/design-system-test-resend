export function NpsPlaybookCard() {
  return (
    <section className="tally-panel p-4 md:p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">
        Playbook (&quot;hvad nu?&quot;)
      </h2>
      <p className="mt-2 font-sans text-[11px] leading-snug text-fg-muted">
        Standardiserede flows i Agency OS når målinger falder eller promotorer skal aktiveres — fuld automations-UI kommer senere.
      </p>
      <ul className="mt-4 space-y-2.5 font-sans text-[12px] text-fg-muted">
        <li className="flex gap-2">
          <span className="text-[11px] text-agency-brand">1.</span>
          <span>
            <span className="font-semibold text-fg">Detraktor &lt; 40:</span> book QBR + root-cause dokument i Matter / Notion —
            automatisk Slack til account lead (kommer).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-[11px] text-agency-brand">2.</span>
          <span>
            <span className="font-semibold text-fg">Passive 40–49:</span> planlæg quick-win leverance på 10 dage + opfølgende CSAT mikroenkelt.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-[11px] text-agency-brand">3.</span>
          <span>
            <span className="font-semibold text-fg">Promoters ≥50:</span> luk referral-loop med personlig besked + målrette case study (
            Creative + Content backlog).
          </span>
        </li>
      </ul>
      <button
        type="button"
        disabled
        className="mt-5 w-full rounded-md border border-border bg-surface-muted py-2 font-sans text-[11px] font-medium text-fg-quiet opacity-70"
      >
        Automations-builder (Coming soon)
      </button>
    </section>
  );
}
