/** Forklaringer (dansk) til de fire KPI-kort på Pulse. */
export const KPI_INFO = {
  mrr: {
    title: "Retainer MRR",
    body: (
      <>
        <p>
          <strong className="text-fg">Hvad er det?</strong> Den faste omsætning, vi har hver måned fra
          kunder med en løbende aftale (MRR = Monthly Recurring Revenue).
        </p>
        <p>
          <strong className="text-fg">Sådan regnes det:</strong> Alle aktive kunders månedlige retainer
          lægges sammen, inklusive underskrevne, aktive kontrakter.
        </p>
        <p>
          Tallet i parentes er engangssalg (opsalg) fra måneden. De er med for overblikket, men tæller
          ikke som fast omsætning. Pilen viser ændringen siden forrige måned.
        </p>
      </>
    ),
  },
  utilisation: {
    title: "Udnyttelse",
    body: (
      <>
        <p>
          <strong className="text-fg">Hvad er det?</strong> Hvor stor en del af teamets tid, der bliver
          brugt på arbejde, vi kan fakturere.
        </p>
        <p>
          <strong className="text-fg">Sådan regnes det:</strong> Fakturerbare timer i måneden ÷ teamets
          samlede kapacitet (hver medarbejders ugentlige timer × 4,33 uger).
        </p>
        <p>Højere betyder, at mere af tiden tjener penge. Over 100 % betyder overarbejde.</p>
      </>
    ),
  },
  overhead: {
    title: "Overhead-tid",
    body: (
      <>
        <p>
          <strong className="text-fg">Hvad er det?</strong> Den del af den registrerede tid, der ikke
          kan faktureres: interne møder, administration og andet internt arbejde.
        </p>
        <p>
          <strong className="text-fg">Sådan regnes det:</strong> Ikke-fakturerbare timer ÷ alle
          registrerede timer i måneden.
        </p>
        <p>Lavere er bedre. Pilen er grøn, når procenten falder.</p>
      </>
    ),
  },
  margin: {
    title: "Gns. margin",
    body: (
      <>
        <p>
          <strong className="text-fg">Hvad er det?</strong> Hvor stor en del af omsætningen vi i
          gennemsnit beholder som overskud på en kunde.
        </p>
        <p>
          <strong className="text-fg">Sådan regnes det:</strong> Gennemsnittet af den månedlige
          profitmargin, der er indtastet på hver aktiv kunde. Kunder uden margin eller med underskud
          indgår ikke. Er der ingen, vises 25 % som udgangspunkt.
        </p>
        <p>Marginen kommer fra kundens stamdata, så den er kun så præcis som tallene dér.</p>
      </>
    ),
  },
};
