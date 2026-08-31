/** @typedef {'done' | 'partial' | 'missing' | 'wip'} FeatureStatusId */

/**
 * @typedef {object} ProductFeature
 * @property {string} id
 * @property {string} title
 * @property {'forretning' | 'arbejde' | 'kunde' | 'organisation'} area
 * @property {FeatureStatusId} status
 * @property {string} tagline — én linje under titlen
 * @property {string} description — hvad featuren er til (almindeligt sprog)
 * @property {string[]} worksToday
 * @property {string[]} [stillMissing]
 * @property {string} [note]
 * @property {string} [owner]
 */

/**
 * @typedef {object} PlanItem
 * @property {string} id
 * @property {string} title
 * @property {FeatureStatusId} status
 * @property {string} description
 * @property {string} [owner]
 * @property {string} [note]
 */

/**
 * @typedef {object} LaunchGoal
 * @property {string} id
 * @property {string} label
 * @property {'must' | 'should' | 'nice'} priority
 * @property {boolean} done
 */

export const FEATURE_STATUS_META = {
  title: "Hvor langt er vi?",
  subtitle: "Overblik over Agency OS — opdateret løbende af teamet.",
  updatedAt: "31. august 2026",
  overallPercent: 70,
  intro:
    "Agency OS er Searchminds interne CRM. De fleste hovedfunktioner kan bruges allerede. Nedenfor kan I se hvad der virker, hvad der er halvt på plads, og hvad vi bygger som næste.",
};

/** @type {{ id: FeatureStatusId; label: string; hint: string }[]} */
export const STATUS_LEGEND = [
  { id: "done", label: "Klar", hint: "Kan bruges som tiltænkt" },
  { id: "partial", label: "Delvist klar", hint: "Virker, men mangler dele" },
  { id: "wip", label: "Under arbejde", hint: "Bygges aktivt — kan ændre sig" },
  { id: "missing", label: "Ikke startet", hint: "Planlagt, men ikke bygget endnu" },
];

/** @type {{ id: ProductFeature['area']; label: string }[]} */
export const FEATURE_AREAS = [
  { id: "forretning", label: "Forretning" },
  { id: "arbejde", label: "Arbejde" },
  { id: "kunde", label: "Kunde" },
  { id: "organisation", label: "Organisation" },
];

/** @type {ProductFeature[]} */
export const PRODUCT_FEATURES = [
  {
    id: "pulse",
    title: "Agency Pulse",
    area: "forretning",
    status: "partial",
    tagline: "Overblik over bureauets nøgletal",
    description:
      "Pulse er startsiden i CRM'et. Her ser I omsætning, belægning, margin og hvordan det går med kunder og afdelinger — samlet ét sted.",
    worksToday: [
      "Dashboard med nøgletal for bureauet",
      "Liste over kunder med status og sundhed",
      "Overblik per afdeling",
      "Vælg hvilken periode I vil kigge på",
    ],
    stillMissing: ["Smart Alerts — automatiske advarsler når noget kræver handling"],
    note: "Alerts vises i UI'et, men er endnu ikke aktive.",
  },
  {
    id: "clients",
    title: "Kunder",
    area: "forretning",
    status: "partial",
    tagline: "Alle jeres kunder samlet",
    description:
      "Her administrerer I kunder: kontaktpersoner, domæner, MRR, CVR, NPS-indstillinger og meget mere. I kan oprette nye kunder og redigere eksisterende.",
    worksToday: [
      "Kundeliste med søgning og filtre",
      "Kundeside med overblik, kontakter og domæner",
      "Opret ny kunde direkte i CRM'et",
      "Rediger kundeoplysninger (CVR, MRR, kontakter m.m.)",
      "Data kan hentes ind fra ClickUp",
    ],
    stillMissing: [
      "Koncern-struktur: én hovedkunde med flere brands (fx FB Trading → Frigg + Littledeluxe)",
      "MRR samlet på hovedkunden i stedet for per brand",
    ],
    owner: "Christian (kunde-struktur)",
  },
  {
    id: "contracts",
    title: "Kontrakter",
    area: "forretning",
    status: "wip",
    tagline: "Send og underskriv aftaler",
    description:
      "Kontraktmodulet lader jer oprette aftaler, sende dem til kunden på e-mail, og få dem underskrevet digitalt med sporbar dokumentation.",
    worksToday: [
      "Oversigt over alle kontrakter",
      "Kontrakt-skabeloner I kan genbruge",
      "Send kontrakt til underskrift via e-mail",
      "Kunden underskriver via link + adgangskode",
      "Underskrift gemmes med navn, tidspunkt og teknisk bevis",
      "Pause, luk, forny og genaktiver kontrakter",
    ],
    stillMissing: ["Integration til GetAccept (planlagt som alternativ/supplement senere)"],
    note: "Vi har bygget egen underskriftsflow. Teamet skal beslutte om det er nok til v1, eller GetAccept skal ind før launch.",
  },
  {
    id: "tasks",
    title: "Opgaver",
    area: "arbejde",
    status: "partial",
    tagline: "Arbejdsopgaver på tværs af kunder",
    description:
      "Opgaver er jeres interne to-do-liste i CRM'et. I kan tildele opgaver, sætte deadline, dele dem op i delopgaver og kommentere.",
    worksToday: [
      "Opgaveliste med filtre",
      "Opgavedetalje med beskrivelse og status",
      "Delopgaver under en hovedopgave",
      "Kommentarer på opgaver",
      "Knyt opgave til kunde og medarbejder",
      "Planlæg opgaver i kalenderen",
    ],
    stillMissing: [
      "Import af opgaver fra ClickUp (Delivery → kunde → service line → opgave)",
    ],
  },
  {
    id: "calendar",
    title: "Min kalender",
    area: "arbejde",
    status: "partial",
    tagline: "Planlæg jeres uge",
    description:
      "Kalenderen viser hvornår I har planlagt at arbejde på opgaver. Hver medarbejder har sin egen kalender.",
    worksToday: [
      "Uge- og dagvisning",
      "Træk opgaver ind i kalenderen",
      "Flere tidsblokke per opgave",
    ],
    stillMissing: [
      "Fuld synkronisering med Google Calendar",
      "Se Google-møder direkte i kalenderen",
    ],
  },
  {
    id: "templates",
    title: "Opgaveskabeloner",
    area: "arbejde",
    status: "done",
    tagline: "Genbrugelige opgavepakker",
    description:
      "Skabeloner gør det hurtigt at oprette standardopgaver — fx onboarding eller månedlig SEO-rapport — uden at starte forfra hver gang.",
    worksToday: [
      "Oversigt over skabeloner",
      "Opret og rediger skabeloner",
      "Brug skabelon når I opretter opgaver",
    ],
  },
  {
    id: "time",
    title: "Tidsregistrering & timer",
    area: "arbejde",
    status: "done",
    tagline: "Registrer tid — også mens browseren er lukket",
    description:
      "Registrer tid manuelt eller start en timer. Timeren gemmes på serveren: lukker I browseren, tæller den videre indtil I stopper den.",
    worksToday: [
      "Start og stop timer fra topbjælken",
      "Vælg kunde og opgave på timeren",
      "Manuel tidsregistrering uden timer",
      "Timeren kører videre selvom I lukker browseren",
      "Tid gemmes som tidsregistrering når I stopper",
    ],
    note: "Timeren stopper ikke automatisk — husk at slukke den når I er færdige.",
  },
  {
    id: "workload",
    title: "Belægning",
    area: "arbejde",
    status: "done",
    tagline: "Hvem har for meget at lave?",
    description:
      "Belægning viser hvordan arbejdet er fordelt på teamet og afdelinger — og om nogen er overbooket.",
    worksToday: [
      "Overblik over hele teamet",
      "Detaljevisning per medarbejder",
      "Sammenligning af kapacitet og registreret tid",
    ],
  },
  {
    id: "nps",
    title: "NPS",
    area: "kunde",
    status: "partial",
    tagline: "Mål kundetilfredshed",
    description:
      "Send NPS-undersøgelser til kunder, indsam svar, og følg udviklingen over tid. Kunder svarer via et link i e-mail.",
    worksToday: [
      "NPS-dashboard med scores og trends",
      "Skabeloner til undersøgelser",
      "Send manuelt eller planlagt (automatisk)",
      "Kunder svarer via offentligt link",
      "Indstillinger per kunde (hvem modtager, hvor ofte)",
    ],
    stillMissing: [
      "Automations-builder — fx automatisk Slack-besked ved lav score",
      "Færdige playbook-flows (tekst findes, men kører ikke automatisk endnu)",
    ],
    owner: "Christian (automations-liste)",
  },
  {
    id: "kb",
    title: "Knowledge base",
    area: "organisation",
    status: "done",
    tagline: "Intern vidensbank",
    description:
      "Skriv og del intern viden — processer, guides og noter. Artikler kan også importeres fra ClickUp.",
    worksToday: [
      "Læs og søg i artikler",
      "Opret og rediger artikler",
      "Import fra ClickUp vidensbase",
    ],
  },
  {
    id: "team",
    title: "Team",
    area: "organisation",
    status: "done",
    tagline: "Medarbejdere og afdelinger",
    description:
      "Se hvem der arbejder i bureauet, hvilken afdeling de tilhører, og deres kapacitet.",
    worksToday: [
      "Teamliste med roller og afdelinger",
      "Profilside per medarbejder",
      "Import af brugere fra ClickUp",
    ],
  },
  {
    id: "users",
    title: "Brugerstyring",
    area: "organisation",
    status: "partial",
    tagline: "Hvem må logge ind — og hvad må de se?",
    description:
      "Administratorer kan se og redigere brugere der har adgang til CRM'et, inkl. admin-rettigheder.",
    worksToday: [
      "Liste over brugere",
      "Giv/fjern admin-rettigheder",
      "Vælg adgangsniveau (intern / ekstern)",
    ],
    stillMissing: [
      "Adgangsniveauer håndhæves endnu ikke i praksis",
      "Super admin der kan se WIP-funktioner andre ikke ser",
    ],
  },
  {
    id: "reports",
    title: "Rapporter",
    area: "organisation",
    status: "missing",
    tagline: "Eksport og faste rapporter",
    description:
      "Rapporter skal give jer mulighed for at trække data ud og få faste overblik — fx timer, NPS eller omsætning.",
    worksToday: [],
    stillMissing: ["Hele rapportmodulet — der er kun en placeholder-side i dag"],
  },
  {
    id: "settings",
    title: "Indstillinger",
    area: "organisation",
    status: "partial",
    tagline: "Personlige og system-indstillinger",
    description:
      "Skift tema, tæthed i UI'et, og (for admins) synkroniser data fra ClickUp.",
    worksToday: [
      "Lyst/mørkt tema",
      "Kompakt eller luftigt layout",
      "ClickUp-sync for kunder, brugere, vidensbase og disciplines",
    ],
    stillMissing: ["ClickUp-sync for opgaver"],
  },
  {
    id: "login",
    title: "Login & sikkerhed",
    area: "organisation",
    status: "partial",
    tagline: "Log ind med jeres Searchmind-konto",
    description:
      "I logger ind med Google via jeres @searchmind.dk-konto. Systemet skal sikre at kun de rette personer ser de rette ting.",
    worksToday: [
      "Login med Google (@searchmind.dk)",
      "Admin-menu skjules for ikke-admins",
    ],
    stillMissing: [
      "Fuldt låst CRM — nogle sider kan i princippet åbnes uden login i dag",
      "Forskellige adgangsniveauer der faktisk begrænser hvad man ser",
    ],
  },
];

/** @type {PlanItem[]} */
export const PLAN_ITEMS = [
  {
    id: "getaccept",
    title: "GetAccept til kontrakter",
    status: "missing",
    description: "Forbindelse til GetAccept så kontrakter kan håndteres dér i stedet for (eller sammen med) vores eget flow.",
    note: "Eget underskriftsflow er allerede bygget — teamet skal vælge vej.",
  },
  {
    id: "automations-list",
    title: "Liste over automations",
    status: "partial",
    owner: "Christian",
    description: "Kortlæg hvilke automatiske flows vi vil have — fx NPS → Slack, QBR-booking ved lav score.",
    note: "NPS kan sendes automatisk. Resten er beskrevet som tekst, men kører ikke endnu.",
  },
  {
    id: "automations-build",
    title: "Byg automations",
    status: "missing",
    owner: "Drilon",
    description: "Implementer de automations Christian har listet.",
    note: "Afventer listen fra Christian.",
  },
  {
    id: "clickup-tasks",
    title: "Importér opgaver fra ClickUp",
    status: "missing",
    description:
      "Hent opgaver fra ClickUp's Delivery-struktur: Delivery → kundens navn → service line → opgave.",
    note: "Kunder, brugere og vidensbase kan allerede importeres.",
  },
  {
    id: "client-structure",
    title: "Ny kunde-struktur (koncern + brands)",
    status: "partial",
    owner: "Christian",
    description:
      "Én hovedkunde (navn + CVR) med underliggende properties/brands. MRR og nøgletal skal samles på hovedkunden.",
    note: "I dag er hver kunde én flat profil.",
  },
  {
    id: "super-admin",
    title: "Super admin & adgangsniveauer",
    status: "partial",
    description:
      "En super admin skal kunne se alt — inkl. funktioner under udvikling. Andre roller skal have begrænset adgang.",
  },
  {
    id: "status-page",
    title: "Feature-overblik (denne side)",
    status: "done",
    owner: "Drilon",
    description: "Fælles side hvor hele teamet kan se status — uden at skulle logge ind.",
  },
];

/** @type {LaunchGoal[]} */
export const LAUNCH_GOALS = [
  { id: "auth", label: "Kun loggede brugere kan åbne CRM'et", priority: "must", done: false },
  { id: "prod-data", label: "Produktion bruger rigtige data — ikke demo-tilstand", priority: "must", done: false },
  { id: "nps-cron", label: "Automatiske NPS-udsendelser kører i produktion", priority: "must", done: false },
  { id: "contract-decision", label: "Beslutning taget: eget signing-flow eller GetAccept", priority: "must", done: false },
  { id: "clickup-clients", label: "Kunder importeret fra ClickUp og verificeret", priority: "must", done: false },
  { id: "clickup-users", label: "Brugere importeret fra ClickUp og verificeret", priority: "must", done: false },
  { id: "clickup-tasks", label: "Opgaver kan importeres fra ClickUp", priority: "should", done: false },
  { id: "client-parent", label: "Koncern-struktur for kunder er på plads", priority: "should", done: false },
  { id: "access-tiers", label: "Adgangsniveauer virker i praksis", priority: "should", done: false },
  { id: "automations", label: "Mindst 1–2 automatiske flows er live", priority: "should", done: false },
  { id: "reports-export", label: "Mindst én rapport kan eksporteres", priority: "should", done: false },
  { id: "smart-alerts", label: "Smart Alerts er aktive på Pulse", priority: "nice", done: false },
  { id: "google-cal", label: "Google Calendar fuldt synkroniseret", priority: "nice", done: false },
];

/** @type {Record<FeatureStatusId, string>} */
export const STATUS_LABEL = {
  done: "Klar",
  partial: "Delvist klar",
  wip: "Under arbejde",
  missing: "Ikke startet",
};

/** @type {Record<LaunchGoal['priority'], string>} */
export const PRIORITY_LABEL = {
  must: "Skal være klar",
  should: "Bør være klar",
  nice: "Nice to have",
};
