/**
 * SINGLE SOURCE OF TRUTH for the AI Chat demo.
 * All content is fictional. No real client data or real metrics.
 *
 * Narrative coherence — each client has ONE consistent state:
 *   • Nordhavn Møbler  — strong client hit a recent dip → diagnose → fix
 *   • Frydenlund Sport — organic visibility falling → recover (incl. email cross-sell)
 *   • Bølgen Kaffe     — tracking issue → fix → forward 6-month plan
 *   • Kongelund H&B    — happy/healthy (NPS 9) → upsell
 *   • Lyngsø Cykler    — brand new → onboarding
 */

export const demoClients = [
  { id: "nordhavn", name: "Nordhavn Møbler", sector: "E-commerce" },
  { id: "frydenlund", name: "Frydenlund Sport", sector: "Retail" },
  { id: "bolgen", name: "Bølgen Kaffe", sector: "D2C / Abonnement" },
  { id: "kongelund", name: "Kongelund Have & Bolig", sector: "E-commerce" },
  { id: "lyngso", name: "Lyngsø Cykler", sector: "Retail" },
  { id: "vestkysten", name: "Vestkysten Outdoor", sector: "E-commerce" },
];

export const teamMembers = [
  { id: "astrid",   name: "Astrid",   role: "Client Lead",     avatar: "AS" },
  { id: "oliver",   name: "Oliver",   role: "Paid Media",      avatar: "OL" },
  { id: "maja",     name: "Maja",     role: "SEO",             avatar: "MJ" },
  { id: "frederik", name: "Frederik", role: "Tracking & Data", avatar: "FR" },
  { id: "sofie",    name: "Sofie",    role: "Account Manager", avatar: "SO" },
];

// ─── Slack-agtig kanalstruktur ──────────────────────────────────────────────
export const channelGroups = [
  {
    id: "clients",
    label: "Dine kunder",
    channels: [
      { id: "team-nordhavn",   name: "team-nordhavn-møbler",  clientId: "nordhavn",   unread: 2 },
      { id: "team-frydenlund", name: "team-frydenlund-sport", clientId: "frydenlund", unread: 1 },
      { id: "team-bolgen",     name: "team-bølgen-kaffe",     clientId: "bolgen",     unread: 1 },
      { id: "team-kongelund",  name: "team-kongelund",        clientId: "kongelund" },
      { id: "team-lyngso",     name: "team-lyngsø-cykler",    clientId: "lyngso" },
      { id: "team-vestkysten", name: "team-vestkysten",       clientId: "vestkysten", unread: 1 },
    ],
  },
  {
    id: "searchmind",
    label: "Searchmind",
    channels: [
      { id: "general",       name: "general" },
      { id: "announcements", name: "announcements" },
      { id: "wins",          name: "wins", unread: 1 },
      { id: "ppc",           name: "ppc" },
      { id: "seo",           name: "seo" },
      { id: "paid-social",   name: "paid-social" },
      { id: "tracking",      name: "tracking" },
      { id: "content",       name: "content" },
      { id: "random",        name: "random" },
    ],
  },
];

export const DEFAULT_CHANNEL = "team-nordhavn";

// ─── Feed entries ────────────────────────────────────────────────────────────
/** @type {any[]} */
export const feed = [

  // ════════════════ OVERBLIK ════════════════
  {
    id: "monday-summary",
    channel: "general",
    resident: true,
    type: "summary",
    author: "Searchmind AI",
    ts: "08:00",
    text: "**☀️ Mandagsoverblik — uge 24**\nGod morgen. Status for dine 5 kunder:",
    card: {
      kind: "metric-grid",
      data: {
        title: "Uge 24 · Portefølje",
        metrics: [
          { label: "Over mål",      value: "3 kunder", delta: null, tone: "ok" },
          { label: "Under mål",     value: "1 kunde",  delta: null, tone: "bad" },
          { label: "Aktive alerts", value: "2",        delta: null, tone: "warn" },
          { label: "Åbne opgaver",  value: "11",       delta: null, tone: "brand" },
        ],
      },
    },
    suggestedReplies: ["Vis aktive alerts", "Hvem er under mål?"],
  },

  // ════════════════ NORDHAVN — dip → diagnose → fix ════════════════
  {
    id: "perf-alert-nordhavn",
    channel: "team-nordhavn",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "08:14",
    text: "**⚠️ ROAS-alert · Nordhavn Møbler**\nROAS faldt 18 % de seneste 7 dage (4,2 → 3,4). Spend er uændret — så det er konverteringsraten, der er droppet. Skal jeg grave i årsagen?",
    card: {
      kind: "sparkline",
      data: {
        label: "ROAS · Nordhavn Møbler",
        metric: "3,4×",
        delta: -18,
        tone: "bad",
        sparkData: [4.1, 4.3, 4.2, 4.0, 3.8, 3.6, 3.4],
        footnote: "Seneste 7 dage vs. uge før",
      },
    },
    suggestedReplies: ["Uddyb årsagen", "Opret opgave til Oliver"],
  },
  {
    id: "perf-diagnosis-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:16",
    text: "**Årsag til ROAS-faldet · Nordhavn Møbler**\nKonverteringsraten på Google Shopping er faldet markant — isoleret til **sofa-kategorien**. Sammenfaldet med en feed-ændring 13. juni peger på fejl i produkttitler.",
    card: {
      kind: "metric-grid",
      data: {
        title: "Diagnose · Google Shopping",
        metrics: [
          { label: "Konv.rate (sofa)", value: "1,1 %", delta: -22, tone: "bad" },
          { label: "Shopping-impr.",   value: "−5 %",  delta: -5,  tone: "warn" },
          { label: "Feed-fejl",        value: "12 prod.", delta: null, tone: "bad" },
          { label: "Øvrige kategorier", value: "Stabil", delta: null, tone: "ok" },
        ],
      },
    },
    suggestedReplies: ["Vis ændringer sidste uge", "Opret opgave til Oliver"],
  },
  {
    id: "changes-paid-lastweek",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:19",
    text: "**Justeringer · Paid Social + Google Ads (sidste uge) · Nordhavn Møbler**",
    card: {
      kind: "table",
      data: {
        title: "Ændringslog",
        columns: ["Platform", "Ændring", "Af", "Dato"],
        rows: [
          ["Google Ads",  "Budstrategi → Target ROAS 400 %",        "Oliver", "10. jun"],
          ["Google Ads",  "Pausede 3 underperformende søgeord",     "Oliver", "11. jun"],
          ["Paid Social", "Ny creative-test (3 varianter)",          "Oliver", "12. jun"],
          ["Paid Social", "Skalerede lookalike 1 % → 2 %",           "Oliver", "13. jun"],
          ["Google Ads",  "Shopping-feed: opdaterede titler (sofa)", "Oliver", "13. jun"],
        ],
        caption: "Feed-ændringen 13. juni falder sammen med CR-dippet — sandsynlig årsag.",
      },
    },
    suggestedReplies: ["Opret opgave til Oliver", "Hvilke opgaver er udført sidste måned?"],
  },
  {
    id: "task-oliver-confirm",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:22",
    text: "Jeg opretter en opgave til **Oliver** om at rette Shopping-feedet:",
    card: {
      kind: "task-confirm",
      data: {
        title: "Ret Shopping-feed · sofa-kategori",
        client: "Nordhavn Møbler",
        assignee: "Oliver",
        deadline: "I morgen",
        budget: null,
        priority: "Høj",
        tasks: [
          "Gennemgå Shopping-feed for sofa-kategori",
          "Ret produkttitler og GTIN på 12 produkter",
          "Re-submit feed til Google Merchant Center",
          "Verificér konverteringsrate efter 48 timer",
        ],
        status: "pending",
        doneFeedId: "task-oliver-done",
      },
    },
  },
  {
    id: "task-oliver-done",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:22",
    text: "✅ **Opgave oprettet** i ClickUp til Oliver · Nordhavn Møbler. Prioritet: Høj. Jeg overvåger konverteringsraten og melder tilbage om 48 timer.",
    card: null,
  },
  {
    id: "tasks-completed-lastmonth",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:25",
    text: "**Udførte opgaver · Nordhavn Møbler (maj)**",
    card: {
      kind: "table",
      data: {
        title: "Leverancer maj",
        columns: ["Opgave", "Disciplin", "Ansvarlig", "Status"],
        rows: [
          ["Månedsrapport maj",               "Rapportering", "Astrid",   "✓ Udført"],
          ["Google Ads kontostruktur-optim.", "Paid Media",   "Oliver",   "✓ Udført"],
          ["Meta creatives Q2 (8 stk.)",      "Paid Media",   "Oliver",   "✓ Udført"],
          ["Teknisk SEO-audit",               "SEO",          "Maja",     "✓ Udført"],
          ["GA4 e-commerce tracking-review",  "Tracking",     "Frederik", "✓ Udført"],
          ["Kundemøde + referat",             "Client Lead",  "Astrid",   "✓ Udført"],
        ],
        caption: "6 opgaver udført i maj · 22,5 timer registreret.",
      },
    },
    suggestedReplies: ["Vis tidsforbrug", "Hvilke justeringer sidste uge?"],
  },
  {
    id: "time-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:28",
    text: "**Tidsforbrug juni · Nordhavn Møbler**\n22,5 af 30 budgetterede timer brugt (75 %). 7,5 timer i reserve.",
    card: {
      kind: "table",
      data: {
        title: "Timer pr. person / disciplin",
        columns: ["Person", "Disciplin", "Brugt", "Budget", "Forbrug"],
        rows: [
          ["Oliver",   "Paid Media",  "8,5 t", "10 t", "85 %"],
          ["Maja",     "SEO",         "6,0 t", "8 t",  "75 %"],
          ["Astrid",   "Client Lead", "4,0 t", "5 t",  "80 %"],
          ["Frederik", "Tracking",    "3,0 t", "4 t",  "75 %"],
          ["Sofie",    "AM",          "1,0 t", "3 t",  "33 %"],
        ],
        caption: "7,5 timer i reserve denne måned.",
      },
    },
    suggestedReplies: ["Hvilke opgaver er udført sidste måned?", "Lav Q2-rapport"],
  },
  {
    id: "report-q2-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:31",
    text: "**📊 Q2-rapport · Nordhavn Møbler** _(apr–jun 2025)_\nSamlet og klar til deling:",
    card: {
      kind: "report",
      data: {
        client: "Nordhavn Møbler",
        period: "Q2 2025 (apr–jun)",
        sections: [
          {
            title: "Performance",
            metrics: [
              { label: "Omsætning",  value: "1,02 mio.", delta: +11, tone: "ok" },
              { label: "ROAS",       value: "3,9×",      delta: -2,  tone: "warn" },
              { label: "Nye kunder", value: "912",       delta: +8,  tone: "ok" },
            ],
          },
          { title: "Leverancer", items: ["18 opgaver leveret", "Q2-creatives (24 stk.)", "Teknisk SEO-audit", "Shopping-feed optimeret"] },
          { title: "Næste skridt", items: ["Afslut Shopping-feed-fix", "Test ny budstrategi (uge 25)", "Skalér Meta-budget +10 %"] },
        ],
        sharedFeedId: "report-q2-nordhavn-done",
      },
    },
    suggestedReplies: ["Del med kunde", "Vis tidsforbrug"],
  },
  {
    id: "report-q2-nordhavn-done",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:32",
    text: "✅ **Q2-rapport delt** med Nordhavn Møbler (PDF + link). Logget på kundekortet.",
    card: null,
  },
  {
    id: "perf-pull-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:30",
    text: "**Performance · Nordhavn Møbler** _(seneste 30 dage)_\nPåvirket af Shopping-dippet på sofa-kategorien — handling er igangsat. Øvrige kategorier er stabile.",
    card: {
      kind: "metric-grid",
      data: {
        title: "Nordhavn Møbler · seneste 30 dage",
        metrics: [
          { label: "Ad Spend",   value: "84.200 kr",  delta: +9,  tone: "warn" },
          { label: "Omsætning",  value: "332.000 kr", delta: -6,  tone: "bad" },
          { label: "ROAS",       value: "3,6×",       delta: -14, tone: "bad" },
          { label: "Nye kunder", value: "286",        delta: -10, tone: "warn" },
        ],
      },
    },
    suggestedReplies: ["Uddyb årsagen", "Opret opgave til Oliver"],
  },
  {
    id: "team-comp-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:32",
    text: "**Team · Nordhavn Møbler**",
    card: {
      kind: "table",
      data: {
        title: "Teamsammensætning",
        columns: ["Navn", "Rolle", "Primær kanal"],
        rows: [
          ["Astrid",   "Client Lead",     "Overordnet ansvar"],
          ["Oliver",   "Paid Media",      "Meta + Google Ads"],
          ["Maja",     "SEO",             "Organisk + Content"],
          ["Frederik", "Tracking & Data", "GTM / GA4 / Server-side"],
          ["Sofie",    "Account Manager", "Kunderelation"],
        ],
      },
    },
    suggestedReplies: ["Book møde med teamet", "Vis tidsforbrug"],
  },
  {
    id: "meeting-summary-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:34",
    text: "**Seneste møde · Nordhavn Møbler** _(12. juni, 45 min)_\n\n**Resumé:** Gennemgang af Q2. Meta over target. Google Shopping kræver opmærksomhed på sofa-kategorien. Enighed om at teste ny budstrategi i uge 25.\n\n**Action items:**\n• Oliver retter Shopping-feed\n• Astrid sender opdateret contentkort\n• Næste møde: 26. juni kl. 10:00",
    card: null,
    suggestedReplies: ["Book møde med teamet", "Vis tidsforbrug"],
  },
  {
    id: "schedule-nordhavn",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:36",
    text: "**Mødeplan · Nordhavn Møbler-teamet**\nJeg har tjekket kalendere for uge 25. Oliver er optaget tirsdag formiddag. Tre ledige slots:",
    card: {
      kind: "schedule",
      data: {
        client: "Nordhavn Møbler",
        slots: [
          { day: "Mandag 23. juni",  time: "10:00–11:00", note: "Alle ledige" },
          { day: "Onsdag 25. juni",  time: "13:00–14:00", note: "Alle ledige" },
          { day: "Torsdag 26. juni", time: "09:00–10:00", note: "Alle ledige · Oliver remote" },
        ],
        warning: "Oliver er optaget tirsdag 24. juni 09:00–12:00.",
        bookedFeedId: "schedule-booked",
      },
    },
    suggestedReplies: ["Book mandag 10:00", "Send til kunden"],
  },
  {
    id: "schedule-booked",
    channel: "team-nordhavn",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:37",
    text: "✅ **Møde booket** — mandag 23. juni kl. 10:00 med Nordhavn-teamet. Kalenderinvitationer er sendt.",
    card: null,
  },

  // ════════════════ FRYDENLUND — organisk falder → genopretning ════════════════
  {
    id: "seo-alert-frydenlund",
    channel: "team-frydenlund",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "08:31",
    text: "**📉 Organisk synlighed · Frydenlund Sport**\nSynlighed faldt 11 % siden seneste crawl. 14 keywords mistet top-3 — primært kategori-termer. Frydenlund er din kunde under mål denne uge.",
    card: {
      kind: "metric-grid",
      data: {
        title: "SEO overblik · Frydenlund Sport",
        metrics: [
          { label: "Synlighed",      value: "38 %",  delta: -11, tone: "bad" },
          { label: "Top-3 keywords", value: "62",    delta: -14, tone: "bad" },
          { label: "Organiske klik", value: "4.280", delta: -8,  tone: "warn" },
          { label: "Crawl-fejl",     value: "3",     delta: null, tone: "warn" },
        ],
      },
    },
    suggestedReplies: ["Vis tabte keywords", "Opret SEO-opgave"],
  },
  {
    id: "seo-keywords-frydenlund",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:33",
    text: "**Tabte keywords · Frydenlund Sport**\nDe fire med højest søgevolumen:",
    card: {
      kind: "table",
      data: {
        title: "Mistet top-3 (sidste 14 dage)",
        columns: ["Keyword", "Før", "Nu", "Volumen/mdr"],
        rows: [
          ["løbesko herre", "3", "8",  "2.400"],
          ["løbesko dame",  "4", "9",  "1.900"],
          ["cykeljakke",    "2", "6",  "1.300"],
          ["mtb hjelm",     "5", "11", "880"],
        ],
        caption: "14 keywords tabt top-3 i alt. Konkurrent har opdateret kategori-sider.",
      },
    },
    suggestedReplies: ["Opret SEO-opgave", "Aktivér email for at fastholde omsætning"],
  },
  {
    id: "seo-task-frydenlund",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:35",
    text: "Jeg opretter en SEO-opgave til **Maja** om at genvinde positionerne:",
    card: {
      kind: "task-confirm",
      data: {
        title: "Genvind tabte kategori-keywords",
        client: "Frydenlund Sport",
        assignee: "Maja",
        deadline: "Denne uge",
        budget: null,
        priority: "Høj",
        tasks: [
          "Analysér SERP for de 14 tabte keywords",
          "Opdatér on-page for kategori-sider",
          "Intern linkbuilding til kategorier",
          "Genindsend sitemap",
        ],
        status: "pending",
        doneFeedId: "seo-task-done",
      },
    },
  },
  {
    id: "seo-task-done",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:35",
    text: "✅ **SEO-opgave oprettet** i ClickUp til Maja · Frydenlund Sport. Deadline: denne uge.",
    card: null,
    suggestedReplies: ["Hvornår har Maja tid til opgaven?"],
  },
  {
    id: "schedule-task-maja",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:37",
    text: "**Planlægning · Maja (SEO)**\nOpgaven er estimeret til **6 timer** (template 'SEO kategori-optimering'). Jeg har holdt det op mod Majas eksisterende opgaver i uge 25 — der er plads torsdag–fredag:",
    card: {
      kind: "heatmap",
      data: {
        specialist: "Maja",
        role: "SEO",
        estimate: "6 t",
        days: [
          { day: "Man", booked: 7.5, capacity: 7.5 },
          { day: "Tir", booked: 6.0, capacity: 7.5 },
          { day: "Ons", booked: 7.0, capacity: 7.5 },
          { day: "Tor", booked: 2.0, capacity: 7.5 },
          { day: "Fre", booked: 3.0, capacity: 7.5 },
        ],
        recommendation: "Planlæg opgaven torsdag (3 t) + fredag (3 t) — passer i den ledige kapacitet uden at flytte andet.",
        ctaLabel: "Planlæg torsdag–fredag",
        scheduledFeedId: "schedule-task-maja-done",
      },
    },
    suggestedReplies: ["Planlæg torsdag–fredag", "Vælg en anden uge"],
  },
  {
    id: "schedule-task-maja-done",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:38",
    text: "✅ **Opgave planlagt** på Majas liste: torsdag 3 t + fredag 3 t (uge 25). ClickUp er opdateret, og Maja er notificeret.",
    card: null,
  },
  {
    id: "krydssalg-frydenlund",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:38",
    text: "**🔁 Krydssalgs-mulighed · Frydenlund Sport**\nMens vi genvinder organiske positioner, kan email-marketing fastholde omsætningen via eksisterende kunder — en ny disciplin med høj ROI og lavt løbende timeforbrug pga. templates.",
    card: {
      kind: "opportunity",
      data: {
        title: "E-mail Marketing (flows + kampagner)",
        kind: "Krydssalg",
        rationale: "Trafikken konverterer fint — email øger livstidsværdi uden nyt medieforbrug og afbøder det organiske dip på kort sigt.",
        projections: [
          { label: "Est. meromsætning/mdr", value: "+28.000 kr", tone: "ok" },
          { label: "Setup (engang)",        value: "12 t",       tone: "warn" },
          { label: "Drift/mdr",             value: "4 t",        tone: "ok" },
        ],
        effort: "Mellem",
        impact: "Høj",
        acceptedFeedId: "krydssalg-accepted",
      },
    },
    suggestedReplies: ["Lav oplæg", "Vis email-templates"],
  },
  {
    id: "krydssalg-accepted",
    channel: "team-frydenlund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "08:39",
    text: "✅ **Oplæg oprettet** som opgave til Sofie — klar til kundepræsentation med ROI-estimat og eksempel-flows.",
    card: null,
  },

  // ════════════════ BØLGEN — tracking-fix → 6-mdr. plan ════════════════
  {
    id: "tracking-alert-bolgen",
    channel: "team-bolgen",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "09:02",
    text: "**🔴 Tracking-alert · Bølgen Kaffe**\nServer-side purchase-events er ikke modtaget de seneste 4 timer. Sandsynlig årsag: server-side tag timeout. Frederik bør tjekke GTM-containeren.",
    card: null,
    suggestedReplies: ["Opret opgave til Frederik", "Ignorer for nu"],
  },
  {
    id: "task-tracking-confirm",
    channel: "team-bolgen",
    type: "assistant",
    author: "Searchmind AI",
    ts: "09:04",
    text: "Jeg opretter en opgave til **Frederik** om tracking på **Bølgen Kaffe**:",
    card: {
      kind: "task-confirm",
      data: {
        title: "Tjek server-side tracking · Bølgen Kaffe",
        client: "Bølgen Kaffe",
        assignee: "Frederik",
        deadline: "I dag",
        budget: null,
        priority: "Høj",
        tasks: [
          "Verificér GTM server-container status",
          "Tjek purchase-event mod GA4 DebugView",
          "Rapportér fund til Astrid",
        ],
        status: "pending",
        doneFeedId: "task-tracking-done",
      },
    },
  },
  {
    id: "task-tracking-done",
    channel: "team-bolgen",
    type: "assistant",
    author: "Searchmind AI",
    ts: "09:05",
    text: "✅ **Opgave oprettet** i ClickUp til Frederik · Bølgen Kaffe. Prioritet: Høj. Jeg følger op om 2 timer.",
    card: null,
  },
  {
    id: "plan-bolgen",
    channel: "team-bolgen",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:05",
    text: "**🗺️ 6-måneders plan · Bølgen Kaffe**\nNår tracking er på plads, er her forslaget til vækst. Målsætning: fordoble aktive abonnenter og sænke CAC 20 %.",
    card: {
      kind: "plan",
      data: {
        client: "Bølgen Kaffe",
        goal: "2× aktive abonnenter · −20 % CAC",
        phases: [
          { period: "Måned 1–2", focus: "Fundament & tracking", items: ["Server-side tracking fix", "Baseline-rapportering", "Audience-opbygning"], budget: "40.000 kr/mdr", revenue: "110.000 kr/mdr" },
          { period: "Måned 3–4", focus: "Skalering",            items: ["Paid Social skalering", "Email welcome-flow", "A/B-test landing pages"], budget: "55.000 kr/mdr", revenue: "165.000 kr/mdr" },
          { period: "Måned 5–6", focus: "Retention & LTV",      items: ["Subscription win-back flow", "LTV-optimering", "Kvartalsrapport + næste plan"], budget: "55.000 kr/mdr", revenue: "210.000 kr/mdr" },
        ],
        approvedFeedId: "plan-approved",
      },
    },
    suggestedReplies: ["Godkend plan", "Juster budget"],
  },
  {
    id: "plan-approved",
    channel: "team-bolgen",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:06",
    text: "✅ **Plan godkendt** og delt med Bølgen Kaffe-teamet. Milestones og kvartals-checkpoints er oprettet i ClickUp.",
    card: null,
  },

  // ════════════════ KONGELUND — happy → upsell ════════════════
  {
    id: "nps-kongelund",
    channel: "wins",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "11:47",
    text: "**💬 Ny NPS-besvarelse · Kongelund Have & Bolig**\nScore: 9 / 10 — Promoter.",
    card: {
      kind: "nps",
      data: {
        client: "Kongelund Have & Bolig",
        score: 9,
        respondent: "Lene H., Marketing Manager",
        quote: "\"Vi oplever en tydelig forbedring i ROAS og synlighed de seneste to måneder. Teamet er proaktivt og reagerer hurtigt.\"",
        avgLast6: 7.8,
        tone: "ok",
      },
    },
    suggestedReplies: ["Send tak", "Se mersalgs-mulighed"],
  },
  {
    id: "nps-thanks-draft",
    channel: "wins",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:48",
    text: "Her er et udkast til en takkemail til Lene H. — vil du sende den?",
    card: {
      kind: "email-draft",
      data: {
        to: "Lene H. <lene@kongelund.dk>",
        subject: "Tak for din feedback 🙏",
        body: "Hej Lene,\n\nTusind tak for din feedback og for scoren på 9 — det betyder meget for hele teamet. Vi er glade for, at I oplever fremgang i både ROAS og synlighed.\n\nVi fortsætter den gode kurs og vender tilbage med næste optimeringsplan i denne uge.\n\nBedste hilsner,\nAstrid & Searchmind-teamet",
        sentFeedId: "nps-thanks-sent",
      },
    },
  },
  {
    id: "nps-thanks-sent",
    channel: "wins",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:49",
    text: "✅ **Takkemail sendt** til Lene H. (Kongelund Have & Bolig). Jeg har logget den på kundekortet.",
    card: null,
  },
  {
    id: "pacing-kongelund",
    channel: "team-kongelund",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "11:30",
    text: "**💸 Budget-pacing · Kongelund Have & Bolig**\n78 % af junis mediebudget er brugt på 18 dage. Ved nuværende tempo lander I på ~12 % overforbrug. Det skyldes stærk performance — men lad os styre pacingen.",
    card: {
      kind: "pacing",
      data: {
        budgetLabel: "Mediebudget · juni",
        spent: 39000,
        budget: 50000,
        daysElapsed: 18,
        daysTotal: 30,
        projection: "+12 % overforbrug",
        recommendation: "Sæt et dagsbudget-loft de næste 12 dage — eller hæv månedsbudgettet, da performance retfærdiggør mere spend (se mersalg).",
      },
    },
    suggestedReplies: ["Se mersalgs-mulighed", "Send tak"],
  },
  {
    id: "morebizz-kongelund",
    channel: "team-kongelund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:52",
    text: "**📈 Mersalgs-mulighed · Kongelund Have & Bolig**\nStærk, tilfreds kunde (NPS 9) med stabil ROAS. Der er grundlag for at skalere til nye kanaler.",
    card: {
      kind: "opportunity",
      data: {
        title: "Udvid med Performance Max + Paid Social",
        kind: "Mersalg",
        rationale: "Stabil ROAS og høj tilfredshed. Ledig kapacitet i mediebudgettet til at teste nye kanaler uden at sætte nuværende resultater over styr.",
        projections: [
          { label: "Est. meromsætning/mdr", value: "+38.000 kr", tone: "ok" },
          { label: "Ekstra timer/mdr",      value: "+2 t",       tone: "warn" },
          { label: "Forventet ROAS",        value: "4×+",        tone: "ok" },
        ],
        effort: "Lav",
        impact: "Høj",
        acceptedFeedId: "morebizz-accepted",
      },
    },
    suggestedReplies: ["Lav forslag til kunden", "Ikke nu"],
  },
  {
    id: "morebizz-accepted",
    channel: "team-kongelund",
    type: "assistant",
    author: "Searchmind AI",
    ts: "11:53",
    text: "✅ **Forslag oprettet.** Jeg har lavet et oplæg + budget-estimat klar til Astrids gennemgang før næste kundemøde.",
    card: null,
  },

  // ════════════════ LYNGSØ — onboarding ════════════════
  {
    id: "task-onboarding-ask",
    channel: "team-lyngso",
    type: "assistant",
    author: "Searchmind AI",
    ts: "10:35",
    text: "Jeg fandt task-template **\"Onboarding – Paid Media\"** (8 opgaver, ansvarlig: Oliver). For at oprette dem til Lyngsø Cykler mangler jeg:\n\n• **Deadline** for onboarding\n• **Budget** (kr./mdr.)",
    card: null,
    suggestedReplies: ["Deadline 1. aug, budget 15.000 kr/mdr"],
  },
  {
    id: "task-onboarding-confirm",
    channel: "team-lyngso",
    type: "assistant",
    author: "Searchmind AI",
    ts: "10:36",
    text: "Perfekt. Her er hvad jeg opretter i ClickUp — bekræft for at sende:",
    card: {
      kind: "task-confirm",
      data: {
        title: "Onboarding – Paid Media",
        client: "Lyngsø Cykler",
        assignee: "Oliver",
        deadline: "1. august 2025",
        budget: "15.000 kr/mdr",
        tasks: [
          "Opsæt Google Ads-konto og kampagnestruktur",
          "Konfigurer conversion-tracking (GTM)",
          "Opret Meta Business Manager",
          "Udarbejd annoncetekster og creatives",
          "Definér målgrupper og lookalikes",
          "Opsæt budget-pacing og alerts",
          "Gennemfør preview-check før go-live",
          "Onboarding-møde med kunden",
        ],
        status: "pending",
        doneFeedId: "task-onboarding-done",
      },
    },
  },
  {
    id: "task-onboarding-done",
    channel: "team-lyngso",
    type: "assistant",
    author: "Searchmind AI",
    ts: "10:36",
    text: "✅ **8 opgaver oprettet i ClickUp** under Lyngsø Cykler · Onboarding – Paid Media. Oliver er notificeret. Deadline: 1. august.",
    card: null,
    suggestedReplies: ["Gå til workload"],
  },

  // ════════════════ KAPACITET — Oliver overbooket ════════════════
  {
    id: "capacity-oliver",
    channel: "general",
    type: "alert",
    author: "Searchmind AI",
    ts: "10:40",
    text: "**⚠️ Kapacitets-advarsel · Oliver (Paid Media)**\nMed Shopping-fixet (Nordhavn) og Lyngsø-onboardingen er Oliver overbooket i uge 25 — 46 t planlagt mod 37,5 t kapacitet. Forslag: flyt onboarding-kickoff til uge 26.",
    card: {
      kind: "heatmap",
      data: {
        specialist: "Oliver",
        role: "Paid Media",
        estimate: null,
        overbooked: true,
        days: [
          { day: "Man", booked: 9,  capacity: 7.5 },
          { day: "Tir", booked: 10, capacity: 7.5 },
          { day: "Ons", booked: 9,  capacity: 7.5 },
          { day: "Tor", booked: 9,  capacity: 7.5 },
          { day: "Fre", booked: 9,  capacity: 7.5 },
        ],
        recommendation: "Flyt Lyngsø onboarding-kickoff (4 t) til uge 26 — så lander Oliver på 42 t, tæt på kapacitet.",
        ctaLabel: "Flyt kickoff til uge 26",
        scheduledFeedId: "capacity-oliver-done",
      },
    },
    suggestedReplies: ["Flyt kickoff til uge 26", "Del opgave med kollega"],
  },
  {
    id: "capacity-oliver-done",
    channel: "general",
    type: "assistant",
    author: "Searchmind AI",
    ts: "10:41",
    text: "✅ **Kickoff flyttet** til uge 26. Olivers uge 25 er nu inden for kapacitet (42 t). Lyngsø er orienteret om opstartsdatoen.",
    card: null,
  },

  // ════════════════ VESTKYSTEN — churn-risiko → genopretning → fornyelse ════════
  {
    id: "churn-vestkysten",
    channel: "team-vestkysten",
    resident: true,
    type: "alert",
    author: "Searchmind AI",
    ts: "12:10",
    text: "**🚨 Churn-risiko · Vestkysten Outdoor**\nKombineret risikoscore: **Høj**. Performance falder, NPS er lav (4/10), og vi har logget under halvdelen af de aftalte timer de seneste 2 måneder — kunden er under-serviceret.",
    card: {
      kind: "metric-grid",
      data: {
        title: "Risikofaktorer · Vestkysten Outdoor",
        metrics: [
          { label: "ROAS (90d)",    value: "2,1×",  delta: -24,  tone: "bad" },
          { label: "NPS",           value: "4",     delta: -3,   tone: "bad" },
          { label: "Timeforbrug",   value: "42 %",  delta: null, tone: "bad" },
          { label: "Risikoscore",   value: "Høj",   delta: null, tone: "bad" },
        ],
      },
    },
    suggestedReplies: ["Lav genopretningsplan", "Hvornår udløber aftalen?"],
  },
  {
    id: "plan-vestkysten",
    channel: "team-vestkysten",
    type: "assistant",
    author: "Searchmind AI",
    ts: "12:13",
    text: "**🛟 Genopretningsplan · Vestkysten Outdoor**\nMål: vend performance og tilfredshed inden aftalen skal fornyes om 30 dage.",
    card: {
      kind: "plan",
      data: {
        client: "Vestkysten Outdoor",
        goal: "ROAS 2,1× → 3,5× · NPS 4 → 7 inden fornyelse",
        phases: [
          { period: "Uge 1",   focus: "Stop blødningen", items: ["Pausér tabsgivende kampagner", "Genopret tracking", "Krisemøde med kunden"], budget: "—",            revenue: "—" },
          { period: "Uge 2–3", focus: "Genopbyg",        items: ["Ny kampagnestruktur", "Creative-refresh", "Ugentlig statusrapport"],         budget: "30.000 kr/mdr", revenue: "75.000 kr/mdr" },
          { period: "Uge 4",   focus: "Fornyelse",       items: ["Resultat-gennemgang", "Fornyelsesoplæg", "Justeret SLA"],                     budget: "30.000 kr/mdr", revenue: "95.000 kr/mdr" },
        ],
        approvedFeedId: "plan-vestkysten-approved",
      },
    },
    suggestedReplies: ["Hvornår udløber aftalen?"],
  },
  {
    id: "plan-vestkysten-approved",
    channel: "team-vestkysten",
    type: "assistant",
    author: "Searchmind AI",
    ts: "12:14",
    text: "✅ **Genopretningsplan godkendt.** Krisemøde + ugentlige checkpoints er oprettet i ClickUp. Astrid er sat som ansvarlig.",
    card: null,
  },
  {
    id: "renewal-vestkysten",
    channel: "team-vestkysten",
    type: "assistant",
    author: "Searchmind AI",
    ts: "12:18",
    text: "**📄 Kontrakt-fornyelse · Vestkysten Outdoor**\nAftalen udløber om **30 dage** (14. juli). Givet risikoen anbefaler jeg et fornyelsesoplæg, der binder genopretningsplanen sammen med justerede vilkår.",
    card: {
      kind: "renewal",
      data: {
        client: "Vestkysten Outdoor",
        value: "30.000 kr/mdr",
        term: "12 mdr.",
        expires: "Udløber 14. juli",
        terms: [
          { label: "Nuværende", value: "30.000 kr/mdr · 12 mdr." },
          { label: "Forslag",   value: "3 mdr. @ 24.000 + performance-bonus" },
          { label: "Mål",       value: "ROAS 3,5× · NPS 7" },
        ],
        recommendation: "Tilbyd 3 mdr. til reduceret retainer mod klare performance-mål — derefter normal pris. Knytter fornyelsen til genopretningen.",
        preparedFeedId: "renewal-vestkysten-done",
      },
    },
    suggestedReplies: ["Klargør oplæg", "Book fornyelsesmøde"],
  },
  {
    id: "renewal-vestkysten-done",
    channel: "team-vestkysten",
    type: "assistant",
    author: "Searchmind AI",
    ts: "12:19",
    text: "✅ **Fornyelsesoplæg klargjort** som dokument + opgave til Astrid. Oplægget er knyttet til genopretningsplanen og klar til fornyelsesmødet.",
    card: null,
  },

  // ════════════════ Flavor (Slack-liv) ════════════════
  {
    id: "wins-astrid",
    channel: "wins",
    resident: true,
    type: "note",
    author: "Astrid",
    ts: "11:50",
    text: "🎉 Kongelund gav os 9 i NPS! Godt arbejde, team 👏",
    card: null,
  },
];

// ─── Tutorial steps (coherent chronology, grouped by client) ──────────────────
export const tutorialSteps = [
  { feedId: "monday-summary",          channel: "general",         caption: "Mandag morgen — AI'en giver overblik på tværs af porteføljen." },

  // Nordhavn: dip → diagnose → ændringer → fix → historik → tid → rapport
  { feedId: "perf-alert-nordhavn",     channel: "team-nordhavn",   caption: "Push-alert: ROAS falder — AI'en fanger det før du åbner dashboardet." },
  { feedId: "perf-diagnosis-nordhavn", channel: "team-nordhavn",   userMessage: "Uddyb årsagen", caption: "Samtale: AI'en isolerer årsagen til faldet." },
  { feedId: "changes-paid-lastweek",   channel: "team-nordhavn",   userMessage: "Hvilke justeringer har vi lavet på Paid Social og Google Ads sidste uge?", caption: "Samtale: ændringsloggen afslører hvad der udløste dippet." },
  { feedId: "task-oliver-confirm",     channel: "team-nordhavn",   userMessage: "Opret en opgave til Oliver om at rette feedet", caption: "Samtale → handling: opgaven oprettes med ét klik." },
  { feedId: "tasks-completed-lastmonth", channel: "team-nordhavn", userMessage: "Hvilke opgaver er udført på Nordhavn sidste måned?", caption: "Samtale: fuld leverance-historik på sekunder." },
  { feedId: "time-nordhavn",           channel: "team-nordhavn",   userMessage: "Hvor meget tid har vi brugt på dem i juni?", caption: "Samtale: tidsforbrug pr. person — altid opdateret." },
  { feedId: "report-q2-nordhavn",      channel: "team-nordhavn",   userMessage: "Lav Q2-rapport til Nordhavn", caption: "Samtale: AI'en samler en delbar kvartalsrapport." },

  // Frydenlund: organisk falder → keywords → SEO-opgave → planlæg hos specialist → krydssalg
  { feedId: "seo-alert-frydenlund",    channel: "team-frydenlund", caption: "Push: organisk synlighed falder hos kunden under mål." },
  { feedId: "seo-keywords-frydenlund", channel: "team-frydenlund", userMessage: "Hvilke keywords har vi tabt?", caption: "Samtale: AI'en lister de tabte positioner." },
  { feedId: "seo-task-frydenlund",     channel: "team-frydenlund", userMessage: "Opret en SEO-opgave til Maja", caption: "Samtale → handling: opgaven oprettes hos specialisten." },
  { feedId: "schedule-task-maja",      channel: "team-frydenlund", userMessage: "Hvornår har Maja tid til opgaven?", caption: "Workload: AI'en finder ledig kapacitet ud fra estimat + Majas liste." },
  { feedId: "krydssalg-frydenlund",    channel: "team-frydenlund", caption: "Proaktiv: krydssalg af email for at fastholde omsætning under genopretning." },

  // Bølgen: tracking → plan
  { feedId: "tracking-alert-bolgen",   channel: "team-bolgen",     caption: "Push: tracking-fejl opdaget — AI'en foreslår handling og ansvarlig." },
  { feedId: "plan-bolgen",             channel: "team-bolgen",     userMessage: "Lav en 6-måneders plan for Bølgen Kaffe", caption: "Samtale: AI'en bygger en mål- og budgetplan på tværs af kanaler." },

  // Kongelund: win → pacing → upsell
  { feedId: "nps-kongelund",           channel: "wins",            caption: "Push: ny NPS-besvarelse — promoter med citat." },
  { feedId: "pacing-kongelund",        channel: "team-kongelund",  caption: "Push: budgettet pacer hurtigt — fordi det går godt. AI'en foreslår styring." },
  { feedId: "morebizz-kongelund",      channel: "team-kongelund",  caption: "Proaktiv: mersalg hos en stærk, tilfreds kunde med kapacitet." },

  // Lyngsø: onboarding → kapacitets-advarsel
  { feedId: "task-onboarding-ask",     channel: "team-lyngso",     userMessage: "Opret onboarding-opgaver til Lyngsø Cykler", caption: "Samtale: AI'en finder template og beder om manglende info." },
  { feedId: "task-onboarding-confirm", channel: "team-lyngso",     caption: "AI'en præsenterer opgaverne til godkendelse — bekræft med ét klik." },
  { feedId: "capacity-oliver",         channel: "general",         caption: "Proaktiv: AI'en opdager at Oliver bliver overbooket — og foreslår omfordeling." },

  // Vestkysten: churn-risiko → genopretning → fornyelse
  { feedId: "churn-vestkysten",        channel: "team-vestkysten", caption: "Push: AI'en samler churn-risiko ud fra performance, NPS og timeforbrug." },
  { feedId: "plan-vestkysten",         channel: "team-vestkysten", userMessage: "Lav en genopretningsplan", caption: "Samtale: AI'en bygger en konkret redningsplan før fornyelse." },
  { feedId: "renewal-vestkysten",      channel: "team-vestkysten", userMessage: "Hvornår udløber aftalen?", caption: "Samtale: AI'en klargør et fornyelsesoplæg knyttet til genopretningen." },
];

// ─── Prompt suggestions (chips) ───────────────────────────────────────────────
export const promptSuggestions = [
  { label: "Hvordan performer Nordhavn?",                       feedId: "perf-pull-nordhavn" },
  { label: "Hvilke opgaver er udført sidste måned?",            feedId: "tasks-completed-lastmonth" },
  { label: "Justeringer på Paid Social & Google Ads sidste uge?", feedId: "changes-paid-lastweek" },
  { label: "Hvor meget tid har vi brugt?",                      feedId: "time-nordhavn" },
  { label: "Lav Q2-rapport til Nordhavn",                       feedId: "report-q2-nordhavn" },
  { label: "Hvornår kan teamet mødes?",                         feedId: "schedule-nordhavn" },
  { label: "Vis tabte keywords (Frydenlund)",                   feedId: "seo-keywords-frydenlund" },
  { label: "Hvornår har Maja tid til opgaven?",                 feedId: "schedule-task-maja" },
  { label: "Lav en 6-måneders plan (Bølgen)",                   feedId: "plan-bolgen" },
  { label: "Budget-pacing (Kongelund)",                         feedId: "pacing-kongelund" },
  { label: "Mersalg for Kongelund",                             feedId: "morebizz-kongelund" },
  { label: "Er nogen specialister overbooket?",                 feedId: "capacity-oliver" },
  { label: "Churn-risiko?",                                     feedId: "churn-vestkysten" },
  { label: "Hvornår udløber Vestkysten-aftalen?",               feedId: "renewal-vestkysten" },
  { label: "Opret onboarding (Lyngsø)",                         feedId: "task-onboarding-ask" },
];

// ─── Canned responses (keyword-match, specifik før generisk) ──────────────────
export const cannedResponses = [
  { match: ["q2-rapport", "q2 rapport", "kvartalsrapport", "kvartal", "rapport til"], feedId: "report-q2-nordhavn" },
  { match: ["maja", "ledig tid", "hvornår har", "planlæg opgave", "kapacitet til opgaven"], feedId: "schedule-task-maja" },
  { match: ["overbooket", "overbelastet", "kapacitet", "specialist", "for travlt"], feedId: "capacity-oliver" },
  { match: ["churn", "risiko", "opsige", "utilfreds", "mister", "vestkysten"], feedId: "churn-vestkysten" },
  { match: ["fornyelse", "udløber", "kontrakt", "aftale slut", "renew", "genforhandl"], feedId: "renewal-vestkysten" },
  { match: ["pacing", "brænder", "overforbrug", "budget hurtigt", "for hurtigt"], feedId: "pacing-kongelund" },
  { match: ["udført", "udførte", "opgaver sidste måned", "leverance", "leveret"], feedId: "tasks-completed-lastmonth" },
  { match: ["justering", "ændring", "ændringer", "paid social", "google ads", "sidste uge"], feedId: "changes-paid-lastweek" },
  { match: ["tabte keywords", "tabt", "mistet", "hvilke keywords"],     feedId: "seo-keywords-frydenlund" },
  { match: ["årsag", "uddyb", "hvorfor", "skyldes", "diagnose"],        feedId: "perf-diagnosis-nordhavn" },
  { match: ["mandag", "overblik", "uge", "morgen", "status"],           feedId: "monday-summary" },
  { match: ["roas", "performance", "performer", "hvordan går"],         feedId: "perf-pull-nordhavn" },
  { match: ["team", "hvem er på", "bemanding", "roller"],               feedId: "team-comp-nordhavn" },
  { match: ["tid", "timer", "tidsforbrug", "forbrug"],                  feedId: "time-nordhavn" },
  { match: ["krydssalg", "cross", "email marketing", "fastholde"],      feedId: "krydssalg-frydenlund" },
  { match: ["mersalg", "morebizz", "skalér", "skalere", "vækst", "udvid"], feedId: "morebizz-kongelund" },
  { match: ["plan", "målsætning", "6-måned", "roadmap", "strategi"],    feedId: "plan-bolgen" },
  { match: ["møde", "kalender", "hvornår", "slot", "planlæg"],          feedId: "schedule-nordhavn" },
  { match: ["referat", "transskription", "opsummér", "seneste møde"],   feedId: "meeting-summary-nordhavn" },
  { match: ["nps", "score", "besvarelse", "feedback", "tilfredshed"],   feedId: "nps-kongelund" },
  { match: ["onboarding", "ny kunde", "template", "lyngsø"],            feedId: "task-onboarding-ask" },
  { match: ["tracking", "gtm", "events", "server-side", "bølgen"],     feedId: "tracking-alert-bolgen" },
  { match: ["seo", "synlighed", "organisk", "frydenlund"],             feedId: "seo-alert-frydenlund" },
  { match: ["alert", "alerts", "advarsler"],                           feedId: "perf-alert-nordhavn" },
];

// ─── Action responses (eksakt knap-label → feedId) ───────────────────────────
export const actionResponses = {
  "Vis aktive alerts":            "perf-alert-nordhavn",
  "Hvem er under mål?":           "seo-alert-frydenlund",
  "Uddyb årsagen":                "perf-diagnosis-nordhavn",
  "Vis ændringer sidste uge":     "changes-paid-lastweek",
  "Hvilke justeringer sidste uge?": "changes-paid-lastweek",
  "Opret opgave til Oliver":      "task-oliver-confirm",
  "Hvilke opgaver er udført sidste måned?": "tasks-completed-lastmonth",
  "Vis tidsforbrug":              "time-nordhavn",
  "Sammenlign med maj":           "perf-pull-nordhavn",
  "Lav Q2-rapport":               "report-q2-nordhavn",
  "Del med kunde":                "report-q2-nordhavn-done",
  "Book møde med teamet":         "schedule-nordhavn",
  "Vis tabte keywords":           "seo-keywords-frydenlund",
  "Opret SEO-opgave":             "seo-task-frydenlund",
  "Hvornår har Maja tid til opgaven?": "schedule-task-maja",
  "Planlæg torsdag–fredag":       "schedule-task-maja-done",
  "Aktivér email for at fastholde omsætning": "krydssalg-frydenlund",
  "Lav oplæg":                    "krydssalg-accepted",
  "Send tak":                     "nps-thanks-draft",
  "Se mersalgs-mulighed":         "morebizz-kongelund",
  "Lav forslag til kunden":       "morebizz-accepted",
  "Godkend plan":                 "plan-approved",
  "Opret opgave til Frederik":    "task-tracking-confirm",
  "Flyt kickoff til uge 26":      "capacity-oliver-done",
  "Lav genopretningsplan":        "plan-vestkysten",
  "Hvornår udløber aftalen?":     "renewal-vestkysten",
  "Klargør oplæg":                "renewal-vestkysten-done",
};

/** Resolve a free-text input or button label → feed entry id (or null). */
export function resolveResponseId(input) {
  const exact = actionResponses[input.trim()];
  if (exact) return exact;
  const lower = input.toLowerCase();
  for (const r of cannedResponses) {
    if (r.match.some((kw) => lower.includes(kw))) return r.feedId;
  }
  return null;
}

export function getFeedEntry(id) {
  return feed.find((f) => f.id === id) ?? null;
}
