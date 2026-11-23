/** Forklaringer til kolonneoverskrifter i kundelisten (hover/title). */
export const DIRECTORY_COLUMN_HINTS = {
  kunde: "Kundenavn. Brands med samme CVR vises som én kundegruppe.",
  ejer: "Kundeansvarlig (account manager) på kunden.",
  status: "Aktiv, pause eller inaktiv — kundens aftalestatus i CRM.",
  retainer: "Månedlig retainer (MRR) i kundens valuta. Opslag tælles med i parentesen.",
  margin: "Estimeret profitmargin for perioden (indtægt minus leveranceomkostninger).",
  nps: "Seneste NPS-svar fra kunden (1–10, vist som score).",
  indeks: "Apex YoY Indeks for seneste 30 dage. 100 = uændret, over 100 = vækst.",
  aktivitet: "Seneste registrerede aktivitet (opgave, note, tid el.l.).",
  timer: "Registrerede timer i den valgte periode ift. timebudget.",
};

/**
 * @param {{ label: string; hint: string; as?: 'span' | 'button'; className?: string; onClick?: () => void; children?: import('react').ReactNode }} props
 */
export function DirectoryColumnLabel({ label, hint, as = "span", className, onClick, children }) {
  const content = children ?? label;
  if (as === "button") {
    return (
      <button type="button" title={hint} className={className} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <span title={hint} className={className}>
      {content}
    </span>
  );
}
