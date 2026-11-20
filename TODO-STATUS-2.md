b# Feedback implementation status (2)

Second feedback round, item by item. The first round is in `TODO-STATUS.md`.

**Legend:** ✅ done in code · 🟡 partly done / has a caveat · ⬜ still open · ❓ Qn = there was an open question; a decision has been made and implemented (see "Spørgsmål og beslutninger" at the bottom; please confirm or correct)

**How to check:** run `npm run dev` (restart it if it was already running — new database fields), log in, and use the page under **Where**. Most features work in both demo and database mode; inline editing and saving only works with the database data source.

> `npm run build` passes and ESLint shows no new errors. Nothing here has been checked visually in the browser yet. "Done" means it is in the code.

---

## Generelt

### ✅ Systemet hedder "1337 OS" / "Searchmind 1337 OS"
- **Where:** sidebar, browser tabs, login, marketing pages, `/status`, contract template default text
- **Files:** `config/site.js`, `components/crm/crm-sidebar.js`, `lib/crm/workspace-title.js`, page `metadata` in `app/**`, `components/layout/site-nav.js`, `components/marketing/*`
- Code comments and internal names still say "Agency OS"; only visible text is renamed.

### ✅ Timer: hedder "Timer" og bliver i toppen (rettet)
- **Correction:** the note meant "call it Timer and keep it at the top", not "remove the timer". The first implementation removed the stopwatch; that has been reverted to the earlier version.
- **Where:** top bar (timer chip with running time), `/time` ("Timer" button + "Ny registrering"), task detail ("Timer" button: click starts the timer, hover shows "Start timer" / "Manuel registrering")
- **Files:** restored from commit `0337840`: `components/crm/crm-timer-chip.js`, `crm-topbar.js`, `crm-timer-modal.js`, `timer-modal-context.js`, `lib/crm/timer-client.js`, `components/time/open-timer-button.js`, `time-track-runner.js`, `time-track-page-header.js`, `time-quick-log-panel.js`, `components/tasks/task-detail-timer-menu.js`
- Kept from this round: the admin person filter on `/time` and inline editing on tasks.

### ✅ "Timer i perioden" fjernet/skjult
- **Where:** `/clients` list (column removed), client view KPI is now "Tid brugt"
- **Files:** `components/clients/clients-directory.js`, `components/clients/clients-portfolio.js`
- The hours column is still on the Pulse "Alle kunder" table ("Timer denne md"). ❓ Q1

### ✅ Hover på KPI-bokse viser 12-måneders graf
- **Where:** `/pulse` (Retainer MRR, Udnyttelse, Overhead-tid, Gns. margin), client view KPI cards (tid, NPS, opgaver oprettet, MRR)
- **Files:** `components/crm/kpi-trend-hover.js`, `lib/crm/month-series.js`, `lib/server/pulse-data.js`, `lib/server/client-detail-data.js`
- Months without data are left empty. Margin only shows a chart once at least two months have snapshots. ❓ Q2

### ✅ Klik på personer / redigerbare tal for hurtig redigering
- **Where:** client view (ansvarlig, afdelingsfolk, kontakter, timebudget; MRR, health, status for admins), task detail (all fields inline)
- **Files:** `components/clients/client-quick-edit.js`, `components/tasks/task-detail-properties.js`

### ✅ Opgaveskabeloner og Belægning kun for admins
- **Where:** sidebar (hidden for non-admins); direct URLs redirect non-admins to `/pulse`
- **Files:** `lib/crm/nav-config.js`, `app/(dashboard)/templates/layout.js`, `app/(dashboard)/workload/layout.js`

### ✅ Toolbox: hub for bureauets interne værktøjer (admins vedligeholder)
- **Where:** sidebar → Organisation → Toolbox (`/toolbox`)
- Admins add, edit and remove tools (name, URL, short description, category, "kun synlig for admins"). Everyone else sees the cards. Cards show the tool's favicon, open in a new tab and are grouped by category, with search.
- **Files:** `app/(dashboard)/toolbox/page.js`, `components/toolbox/toolbox-hub.js`, `app/api/toolbox/**`, `lib/server/toolbox-data.js`, `lib/db/models/toolbox-tool.js`
- Replaces the first version (shortcut cards to the app's own pages). ✅ Q3

### ✅ MCP opdateret med de nye endpoints
- Brand Core can now be written through MCP without an analysis: new `tov_schema` (shape, enums, content standard, empty profile); `tov_update` takes `{ profilePatch }` (deep-merge a partial profile) or `{ profile }` (replace; creates the profile if the client has none) and returns `ignoredPaths`. **Files:** `lib/mcp/tools.js`, `lib/server/tov-data.js` (`saveProfileEdit`), `lib/tov/schema.js` (`mergeTovProfile`, `unknownTovPaths`), `app/api/tov/schema/route.js`, `app/api/clients/[clientId]/tov/route.js`
- Descriptions updated for this round: `tov_analyze` (template), `contracts_send` (required new-customer fields, title list), Brand Core briefing fields removed.
- New tools: `clients_directory_meta`, `client_notes_list/create/update/delete`, `contract_services_list/create/update/delete`, `kb_summary`, `toolbox_list/create/update/delete`
- Updated descriptions: `kb_create`/`kb_update` (fields + AI summary), `time_entries_list/update/delete` (admins see and edit everyone's entries)
- **Files:** `lib/mcp/tools.js`

---

## Pulse

### ✅ Top 10 sunde/usunde → pagination, og udregningen passer nu
- **Where:** `/pulse`, "Sunde kunder" and "Usunde kunder"
- **Files:** `components/pulse/pulse-client-ranking.js`, `lib/crm/client-metrics.js`, `lib/server/pulse-data.js`
- **The bug:** the list sorted on a field that doesn't exist, so the lists were really alphabetical (and some clients showed in both).
- Also fixed: missing Indeks/NPS/budget counted as a neutral 50 (now left out, weights spread over the rest); hours could come from a stale stored field; client groups counted ended brands' budgets.
- Sunde = score 70+, best first. Usunde = under 70, worst first. Each list has pages; page size is the setting "Kunder pr. side i sundhedslister".
- Hovering a score shows every part, its weight and the full sum.
- ❓ Q4, Q5, Q6

### ✅ "Opsalg pr. sælger" → "Top kunde opsalg"
- **Where:** `/pulse`
- **Files:** `components/pulse/pulse-upsell-leaderboard.js`
- Ranks clients (a client group counts as one). Admins get a "Kunder / Sælgere" toggle. ❓ Q7

### ✅ Opsalg og "Tid fordelt — 30 dage" i samme række
- **Where:** `/pulse` (side by side on desktop, stacked on mobile)
- **Files:** `components/pulse/pulse-dashboard.js`

---

## Kunder

### ✅ "Sidst aktiv" → "Seneste aktivitet"
- **Where:** `/clients`
- **Files:** `lib/server/client-activity-data.js`, `lib/crm/client-activity.js`, `app/api/clients/directory-meta/route.js`
- Looks across tasks, comments, time entries, notes, contracts, upsells, NPS answers, contacts and the commercial log. Hover shows what happened and when. ClickUp-sync changes are ignored.

### ✅ Kundelogo hentes dynamisk (favicon)
- **Where:** `/clients` list and grid, client view header
- **Files:** `components/clients/client-logo.js`, `lib/crm/client-domain.js`
- Uses the primary domain's favicon; falls back to initials if there is none or it is tiny.

---

## Kunde view

### ✅ "Tid brugt" viser kun tid brugt
- **Where:** client view KPI strip
- **Files:** `components/clients/client-detail-kpi-strip.js`

### ✅ Opgaver delt op pr. afdeling
- **Where:** client view → Opgaver (now the first and default tab)
- **Files:** `components/clients/client-detail-tasks-card.js`
- "Gruppér pr. afdeling" is on by default, plus a department filter with counts.

### ✅ "Seneste noter": hvor kommer de fra?
- **Where:** client view → Overblik → notes card; each note shows author, date, type and "Kilde:"
- **Files:** `lib/server/client-notes-data.js`, `components/clients/client-notes-list.js`, `lib/db/models/note.js`
- **Answer:** until now, notes in the database only came from the seed scripts (demo data). Nothing in the app could create them and the ClickUp import never did. Task comments are now shown in the feed too, linking to their task. ❓ Q8, Q9

### ✅ "Udnyttelse denne måned" → budget, estimeret, faktisk tid, % brugt
- **Where:** client view → Overblik
- **Files:** `components/clients/client-detail-delivery-card.js`
- Budget (editable), Estimeret (sum of open task estimates), Brugt, % of budget with a bar. ❓ Q10

### ✅ Fjern/redigér personer direkte
- **Where:** client view → ansvarlig, afdelingsfolk, primær/sekundær kontakt
- **Files:** `components/clients/client-quick-edit.js`, `components/clients/client-detail-contacts-card.js`, `components/clients/client-detail-meta-card.js`
- Database mode only; demo is read-only.

### ✅ "Vis alle" noter → egen side
- **Where:** `/clients/[kunde]/notes`
- **Files:** `app/(dashboard)/clients/[clientId]/notes/page.js`, `components/clients/client-notes-page-client.js`

### ✅ Tilføj egne noter direkte
- **Where:** notes card in Overblik and the notes page
- **Files:** `app/api/clients/[clientId]/notes/route.js`, `lib/server/client-notes-data.js`
- Stores the author. Disabled in demo and on client-group pages.

### ✅ Kundeinfo, Økonomi & aftale, NPS & kvalitet flyttet ind i Overblik
- **Where:** client view; tabs are now Opgaver · Overblik · Brands (groups only) · Brand Core
- **Files:** `components/clients/client-detail-tabbed-body.js`

### ✅ Overskredne deadlines fremhæves
- **Where:** client view → Opgaver, task detail
- **Files:** `components/clients/client-detail-tasks-card.js`, `components/tasks/task-detail-properties.js`
- Red styling, "Overskredet · N d" label and a count badge.

---

## Brand Core (tidligere TOV)

### ✅ Omdøbt til "Brand Core"
- **Where:** sidebar, `/tov`, client tab, MCP tool descriptions
- **Files:** `components/tov/*`, `lib/crm/nav-config.js`, `lib/crm/workspace-title.js`, `lib/mcp/tools.js`
- The URL is still `/tov`; "Tone of voice" is only the name of one section inside a profile.

### ✅ Domæne analyseres som standard
- **Where:** Brand Core → kunde → Materiale → "Kundens domæne"
- **Files:** `components/tov/tov-panels.js`, `lib/server/tov-data.js`
- Primary domain is pre-ticked; the server falls back to it when nothing else is given. ❓ Q11

### ✅ Standardmodel: Claude Opus 5.5 (high)
- **Files:** `lib/tov/anthropic.js`, `lib/server/tov-data.js`, `lib/db/models/tov-profile.js`
- Default in UI, server and MCP. Profiles on the old default switch too.

### ✅ Brief-felter fjernet igen (var lagt her ved en fejl)
- "Kundeansvarlig valgfri" og "Titel som dropdown" hørte til **kontrakter**, ikke Brand Core. Kontaktperson, Titel, Kundeansvarlig og kommentar-som-krav er fjernet fra "Brief & analyse"; kommentaren er valgfri igen.
- **Where:** Brand Core → kunde → "Brief & analyse" (nu kun kommentar og AI-model)
- **Files:** `components/tov/tov-workspace.js`, `lib/tov/briefing.js` (kun `tovHostKey` er tilbage), `lib/server/tov-data.js`, `lib/tov/prompts.js`, `lib/db/models/tov-profile.js`, `app/api/clients/[clientId]/tov/**`, `lib/mcp/tools.js`
- Gamle værdier i databasen (`contactName`, `contactTitle`, `accountOwnerKey`) ignoreres og påvirker ikke analysen.

### ✅ Fast skabelon for analysen (indholdsstandard)
- Formen (sektioner, felter, antal) var allerede låst af `TOV_PROFILE_SCHEMA`. Nyt: en indholdsstandard pr. sektion (længde, antal, hvor konkret, hvad der skal stå i Datagrundlag), udledt af Testkunde-analysen. Den sendes med i analyse-prompten.
- **Files:** `lib/tov/template.js` (reglerne), `lib/tov/prompts.js`, `docs/BRAND-CORE-TEMPLATE.md` (genereres med `node scripts/generate-brand-core-template-doc.mjs`)
- Gælder fra næste analyse; eksisterende profiler ændres ikke. Skemaet er uændret, så ingen ny schema-version.

### ✅ Brand guidelines som inspiration (Dilling & Maileg)
- **Where:** Brand Core → kunde → generér brand guidelines (existing profiles: click generate again to get the new sections)
- **Files:** `lib/tov/preview-html.js`, `lib/tov/prompts.js`, `lib/tov/schema.js` (`TOV_PREVIEW_SCHEMA`); reference PDFs in `docs/`
- The document is a multi-page brand book (cover, contents, essence, tone, language, colours, typography, messaging) in the client's colours and fonts, with "Download HTML" for printing to PDF.
- Added from the reference books:
  - **DILLING:** "Hvem vi er" pairs ("Vi er ydmyge. / Aldrig kæphøje."), a short reason per typeface, keywords on each example ("Nøgleord: Sæt scenen, Ærlighed"), and "Opdateret <dato>" in the page footer.
  - **Maileg:** "Tonen til hvem" (e.g. storyteller to consumers vs. business partner to retailers), "Ordvalg i praksis" (be concrete, describe instead of praising yourself, familiar metaphors), a "Fra udkast til brand" page with a before/after text and "Rettelser forklaret", and "Tegnsætning & emojis".
- Logo rules, stationery and packaging from DILLING are left out: there's no logo or print material on the client to build them from. ❓ Q12

---

## Kontrakter

### ✅ Admins kan tilføje services
- **Where:** `/contracts` → Opsætning → Services (admins only)
- **Files:** `lib/db/models/contract-service.js`, `lib/server/contract-services-data.js`, `app/api/contract-services/**`, `components/contracts/contracts-services-panel.js`, `lib/server/contract-apply-commercial.js`
- Each service: name, department, billing (monthly / one-off / annual), default amount, active, order. Until an admin saves, the old list is used. Sent contracts keep their own copy of each line. ❓ Q13, Q14

### ✅ Branche: dropdown med B2B / E-commerce
- **Where:** send-contract dialog, create client, edit client
- **Files:** `lib/crm/client-utils.js` (`INDUSTRY_OPTIONS`), `components/contracts/contracts-send-modal.js`, `components/clients/clients-create-form.js`, `components/clients/client-detail-edit-form.js`
- Old values are kept as an extra option.

### ✅ Kundeansvarlig er det eneste valgfrie felt (ny kunde)
- **Where:** send-contract dialog → "Ny kunde": Firmanavn, Domæne, CVR, Branche, Lead-kilde, Navn, Titel, E-mail og Telefon er påkrævede; Kundeansvarlig er valgfri (markeret "Valgfri"). Tjekkes i dialogen og på serveren.
- **Files:** `components/contracts/contracts-send-modal.js`, `lib/server/contract-new-client.js`
- Gælder blokken "Ny kunde". Ved en eksisterende kunde er der ingen af felterne; e-mail er stadig valgfri der (primær kontakt bruges). ❓ Q15

### ✅ Titel er en dropdown
- **Where:** send-contract dialog → Underskriver → Titel. Direktør / CEO, Ejer / Indehaver, Økonomichef / CFO, Marketingchef, E-commerce manager, Brand manager, Andet. Vælges "Andet", kan titlen skrives frit.
- **Files:** `lib/contracts/contract-roles.js` (`CONTRACT_SIGNER_TITLES`), `components/contracts/contracts-send-modal.js` ❓ Q16

### ✅ Kontraktdokument og PDF i Searchmind-design
- **Where:** kontrakt-preview i send-dialogen, "Gem som PDF" (HTML) og PDF-download på kontraktsiden
- **Files:** `lib/contracts/contract-document-html.js`, `lib/contracts/contract-document-pdf.js`
- Brandbar med lagdelt mærke, "Aftale"-overskrift, kundekort, statuschip (Underskrevet / Afventer underskrift), violette punkttegn, underskriftskort i to kolonner og sidefod med sidetal. Farverne er hentet fra designsystemets tokens; HTML bruger Geist, PDF'en Helvetica (Geist er ikke indlejret i PDF'en).
- HTML-versionen er tjekket i en browser. PDF-filen er genereret og talt, men ikke set visuelt (ingen PDF-visning i værktøjerne her); kig den gerne igennem.

### ✅ Optimér designet
- **Files:** `components/contracts/*`
- Send dialog with numbered steps, running total, mobile preview switch; list empty state; equal-height cards; Danish dates and status text on the detail page.

---

## Opgaver

### ✅ Fjern "Sub opgaver (0)"
- Only a small "+ Delopgave" button when there are none; a compact list when there are some.

### ✅ Fjern "Kunde & aftale" fra Arbejde
### ✅ Fjern "Ansvarlig" i bunden
- "Ansvarlige" is now the first field at the top.

### ✅ Ingen sektioner; aktivitet i Overblik
- One page: fields, description, delopgaver, tidslog, aktivitet. Comments stay in the sidebar.

### ✅ Knappen hedder "Timer"
- The old timer menu is back, with the button labelled "Timer": click starts the timer on the task; hover shows "Start timer" and "Manuel registrering" (opens the timer window with client and task filled in). ❓ Q17

### ✅ Ingen "Rediger"-knap; redigér direkte
- Each field saves on its own and shows "Gemt ✓"; reverts with an error message on failure. "Slet opgave" is a small red button at the bottom. ❓ Q18
- **Files (whole section):** `components/tasks/task-detail-*.js`, `components/tasks/use-task-field-save.js`

---

## Tidsregistrering

### ✅ Admins kan se andres registreringer
- **Where:** `/time` → person dropdown (Mine / Alle / one colleague), admins only
- **Files:** `app/api/time-entries/route.js`, `lib/server/time-entries-data.js`, `components/time/time-page-header.js`
- Checked on the server. Admins can open, edit and delete colleagues' entries. ❓ Q19

### ✅ Timer og "start timer" beholdes (rettet)
- Misread at first as "remove". The timer (start/stop and manual registration) is back as before. See "Timer: hedder Timer og bliver i toppen".

---

## NPS

### ✅ "Detaljerede målinger" øverst
- **Where:** `/nps`, open by default
- **Files:** `components/nps/nps-portfolio.js`

### 🟡 Kun på 2 måneders rul
- **Files:** `lib/crm/nps-cadence.js`, `lib/server/nps-scheduled-send.js`, `lib/server/nps-data.js`, client forms
- Read two ways and both are done: (1) new interval "Hver 2. måned" is the default, and the scheduler never sends to a client within 2 months of the last survey; (2) the headline numbers cover the last 2 months, compared with the 2 months before. ❓ Q20, Q21

### ✅ Kunder under 1 måned frasorteres
- **Where:** `/nps` client list shows "For ny (startet dd.mm.åååå)"; sending is blocked
- **Files:** `lib/server/nps-send-data.js`
- Uses start date, or created date if missing. Applies to cron, the "Send NPS" button and MCP.

---

## Knowledge base

### ✅ Fjern "Målgruppe"
### ✅ Fjern tags
- "Relaterede artikler" now uses same section, parent/child and same author. The MCP `kb_tags` tool still works.

### ✅ "Kort resume" udfyldes af AI
- **Where:** article form → "Generér med AI", and automatically on save when empty
- **Files:** `app/api/kb/summary/route.js`, `lib/server/kb-summary-data.js`
- Uses Claude Sonnet 5.5. If AI fails, the article still saves and shows a yellow notice. ❓ Q22

### 🟡 Knowledge base generelt
- Light layout tidy-up only (summary moved up, full-width sections, cleaner cards, "Nulstil filtre", empty-state CTA). ❓ Q23
- **Files (whole section):** `components/kb/*`, `app/(dashboard)/kb/**`, `app/api/kb/**`, `lib/server/knowledge-data.js`

### ✅ Artikler fra Pulse gav 404 (rettet)
- With "vis testdata" on, Pulse listed test articles, but the article page only looked up production articles. The list, article and edit pages now follow the same test-data setting as the rest of the app.
- **Files:** `lib/server/include-test.js` (`readIncludeTestCookie`), `app/(dashboard)/kb/page.js`, `app/(dashboard)/kb/[slug]/page.js`, `app/(dashboard)/kb/[slug]/edit/page.js`

---

## Team

### ✅ Fjern "Relateret i OS"
- **Files:** `components/team/team-portfolio.js`, `components/team/team-member-portfolio.js`, deleted `components/team/team-hub-links-card.js` and `team-member-quick-links-card.js`
- The similar "Hurtige links" card on profiles is removed too. ❓ Q24

### ✅ "Profiler med mindst belægning": skjul afdelinger (fx MarTech)
- **Where:** `/team` capacity card (Mindst/Højest toggle, default Mindst) → "Filtrér afdelinger" (admins); also Indstillinger → Beregninger
- **Files:** `components/team/team-capacity-watch-card.js`, `lib/db/models/agency-settings.js`, `lib/crm/agency-settings.js`
- ❓ Q25

### ✅ Team og Brugerstyring kun for admins
- **Where:** sidebar hidden for non-admins; `/team/**` and `/users/**` redirect non-admins to `/pulse`
- **Files:** `app/(dashboard)/team/layout.js`, `app/(dashboard)/users/layout.js`, `lib/auth/permissions.js`
- ❓ Q26

---

## Rapporter

### ✅ Skjult indtil videre
- Hidden from the sidebar (`hidden: true` in `lib/crm/nav-config.js`). Opening `/reports` by URL works for admins only (`app/(dashboard)/reports/layout.js`). ❓ Q27

---

## Spørgsmål og beslutninger

Each question has the solution that was picked and implemented. ✅ = changed in code, ➖ = decided to keep as is. Please confirm or correct.

**Generelt**
1. **Timer i perioden:** removed from the `/clients` list. Should the hours column on Pulse "Alle kunder" go too?
   - ➖ **Solution:** keep it on Pulse. Pulse is the utilisation overview, and that column is where you spot over/under-use.
2. **12-måneders grafer:** which other KPI boxes should have one (NPS page, contracts, time)?
   - ➖ **Solution:** Pulse and the client view only for now. NPS already has a 12-month trend chart and time registration has the week strip. Add more when someone misses one.
3. **Toolbox:** what should be on the page?
   - ✅ **Answered:** a hub where admins add the agency's other tools. Built as an admin-managed list with categories, favicons and search.

**Pulse**
4. Clients scoring 50–69 (yellow) land in "Usunde". Should they get their own list?
   - ➖ **Solution:** keep two lists split at 70. Yellow clients keep their yellow score colour inside "Usunde", so they're easy to tell from the red ones.
5. A client with only one data point still gets a score. Should they have no score?
   - ✅ **Solution:** a score needs at least 2 of the 3 parts (Indeks, NPS, timebudget). Others are left out of both lists and named in a note under "Usunde kunder" with what data they have. (`lib/crm/client-metrics.js` `MIN_HEALTH_PARTS`)
6. In the current month, hours so far are compared with the full month's budget. Should the budget be scaled to days passed?
   - ✅ **Solution:** yes, for the health score only, in the current month: budget × days passed ÷ days in month (Copenhagen date, counted as at least 5 days so day 1 doesn't look like overspend). Past months use the full budget. The hover shows "Budget pr. i dag". Budget bars elsewhere still show the full month.
7. Non-admins don't see seller names on Pulse, but still do under Kunde → Økonomi. Hide there too?
   - ✅ **Solution:** hidden for non-admins everywhere: removed on the server (client page and Pulse API) and in the UI (upsell card, retainer hover). (`lib/server/upsell-data.js`, `client-detail-data.js`, `pulse-data.js`)

**Kunde view**
8. Should ClickUp "Kundenoter" be imported as notes?
   - ✅ **Solution:** yes. The ClickUp import and the settings sync create one note per client with source "clickup" and author "ClickUp". Re-imports update it instead of duplicating. Caveat: an edit made in 1337 OS to that note is overwritten by the next import, and clearing the field in ClickUp doesn't delete the note. (`lib/clickup/import-customers.js`)
9. Should notes be editable/deletable, and by whom?
   - ✅ **Solution:** the author and admins can edit (text and type) and delete. Notes without an author (seed/ClickUp) are admin-only. Task comments in the feed are edited on the task, not here. (`app/api/clients/[clientId]/notes/[noteId]/route.js`, `components/clients/client-notes-list.js`)
10. "Estimeret" is the sum of open task estimates. Right figure, or include tasks done this period?
    - ➖ **Solution:** keep open tasks only: it answers "how much work is still coming" next to "Brugt".

**Brand Core**
11. Only the primary domain is pre-ticked. Should all the client's domains be?
    - ➖ **Solution:** primary only. Country domains are usually copies and would make the analysis slower; they can be ticked by hand.
12. Please add the Dilling & Maileg PDFs so the brand book can be matched to them.
    - ✅ **Solution:** PDFs added in `docs/`. The brand book now follows their structure: DILLING's identity pairs, typeface reasons and annotated examples, and Maileg's audience-specific tone, word-choice techniques, before/after rewrite with explained edits and punctuation/emoji rules. Logo, stationery and packaging pages are skipped (no logo or print data on clients). Existing profiles get the new sections when the guidelines are generated again.

**Kontrakter**
13. Annual service lines don't count toward MRR. Should they count as amount ÷ 12?
    - ✅ **Solution:** yes, annual lines count as 1/12 per month in the contract figures (summary MRR, list, cards, detail KPIs; info popovers explain it). It's added when contracts are read, so the signed document text and the stored contract value are unchanged. Note: Pulse client MRR doesn't include annual lines, so it can differ from the contracts MRR. (`lib/contracts/contract-services.js` `annualLinesMonthlyShare`, `lib/server/contracts-data.js`)
14. Non-web one-off services (e.g. SEO audit) become one-time upsells but not "one-off web" revenue. Right?
    - ➖ **Solution:** kept. "One-off web" only means web projects.
15. "Kundeansvarlig er det eneste valgfrie felt": skal det kun gælde "Ny kunde"-blokken i send-dialogen, eller også de andre felter (fx underskriver-e-mail ved eksisterende kunde, skabelon, datoer)?
    - ➖ **Solution:** kun "Ny kunde": der ligger Kundeansvarlig, og kunden oprettes ud fra de felter. Resten af dialogen er uændret.
16. Er de 7 titler rigtige til en underskriver?
    - ➖ **Solution:** Direktør / CEO, Ejer / Indehaver, Økonomichef / CFO, Marketingchef, E-commerce manager, Brand manager, Andet (fri tekst). Listen ligger i `lib/contracts/contract-roles.js` (`CONTRACT_SIGNER_TITLES`).

**Opgaver**
17. Should "Timer" work in demo mode?
    - ➖ **Solution:** stays disabled in demo, as it was before; there is nowhere to save the time.
18. Is the bottom of the page right for "Slet opgave"?
    - ➖ **Solution:** kept at the bottom: it's rare and destructive, so it shouldn't sit next to everyday actions.

**Tidsregistrering**
19. Should admins be able to edit/delete colleagues' entries, or only view them?
    - ✅ **Solution:** admins can edit and delete (server-enforced). The entry stays owned by the colleague, and the page shows "Du redigerer X's registrering". (`lib/server/time-entries-data.js`, `components/time/time-entry-detail-shell.js`)

**NPS**
20. "2 måneders rul": is it the send interval, the KPI window, or both?
    - ➖ **Solution:** both, as built: at most one survey per client every 2 months (default interval "Hver 2. måned", now also in the client forms, contract-created clients and ClickUp import), and headline numbers over the last 2 months.
21. Should the 2-month rule also block the manual "Send NPS" button?
    - ➖ **Solution:** no. A manual send is a deliberate choice; only the "under 1 month old" rule blocks it.

**Knowledge base**
22. Should existing articles have their summaries regenerated with AI in one go?
    - ➖ **Solution:** no batch job. Open the article, clear "Kort resume" or click "Generér med AI", and save. Avoids overwriting summaries people wrote by hand.
23. What did "Knowledge base generelt" mean?
    - ➖ **Solution:** treated as layout polish (done). Bigger content/structure changes need a concrete list.

**Team**
24. Should the "Hurtige links" card on a person's profile go as well?
    - ✅ **Solution:** yes, removed. The open-tasks card now uses the full width.
25. Keep the Mindst/Højest toggle, or only show "mindst belægning"? Should the department filter apply to both?
    - ➖ **Solution:** keep the toggle (default Mindst). The department filter applies to Mindst only: it's for departments that are never meant to be fully booked (e.g. MarTech), but if someone there is overloaded, that's still worth seeing.
26. Team profiles are admin-only now. Should non-admins see profiles, or should links be hidden?
    - ✅ **Solution:** profiles stay admin-only. All remaining profile links are on admin-only pages; the one card that linked from Knowledge base was unused and is deleted.

**Rapporter**
27. Should `/reports` also be blocked by URL?
    - ✅ **Solution:** yes, admins only by URL; hidden from the menu for everyone.
