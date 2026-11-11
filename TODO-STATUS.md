# Feedback implementation status

Mirrors the colleague's list, item by item.

**Legend:** ✅ done in code · 🟡 partly done / has a caveat · ⬜ still open

**How to check:** run `npm run dev`, log in, and use the page under **Where**. Contract features need the database data source (not demo). Paths are relative to the repo root.

> Nothing here has been checked visually in the browser yet. "Done" means it is in the code.

---

## Agency Pulse

### ✅ Rentabilitet pr. afdeling = (medarbejdere × 180.000) / solgt MRR
- **Where:** `/pulse`, the profitability chart
- **Files:** `components/pulse/pulse-profitability-chart.js`, `lib/crm/dept-profitability.js`
- ✅ Sold MRR per department now uses the client's service budgets first (allocation % only as fallback), plus period upsells.

### ✅ "Alle kunder": "Seneste NPS" column added
- **Where:** `/pulse`, the "Alle kunder" table
- **Files:** `components/pulse/pulse-dashboard.js`, `lib/crm/client-metrics.js`, `lib/server/pulse-data.js`

### ✅ "Alle kunder": "Allokering" replaced by "Indeks"
- **Where:** `/pulse`, the "Alle kunder" table
- **Files:** same as above, plus `components/clients/client-metric-cells.js`
- ✅ Indeks is synced from Apex and working (env vars set, sync run). Demo data still uses mock values.
- ✅ Apex Indeks sync built (`lib/server/apex-indeks-sync.js`, button in Indstillinger → Beregninger, cron via `/api/cron`).

### ✅ "Top 10 sunde kunder" + "Top 10 usunde kunder", chart pushed down
- **Where:** `/pulse`, the boxes above the chart
- **Files:** `components/pulse/pulse-client-ranking.js`, `lib/crm/client-metrics.js`
- Based on Indeks, NPS and time spent vs. MRR retainer (weights 0.35 / 0.35 / 0.3).

---

## Kunder

### ✅ Same columns as Pulse (Seneste NPS, Indeks instead of Allokering)
- **Where:** `/clients`
- **Files:** `components/clients/clients-directory.js`, `client-grid-card.js`, `client-metric-cells.js`

### ✅ Warning dots removed from the overview
- **Where:** `/clients`
- **Files:** `components/clients/clients-directory.js`, `client-grid-card.js`

---

## Under en kunde

**Where (all items below):** `/clients/<clientId>`. Open any client from `/clients`. Main files are in `components/clients/`.

### ✅ "Timer denne md" renamed "Tid brugt"
- **Files:** `client-detail-kpi-strip.js`, `client-detail-shell.js`

### ✅ NPS KPI card added
- **Files:** `client-detail-kpi-strip.js`

### ✅ "Fornyelse" is empty unless the contract actually renews
- **Files:** `client-detail-contract-card.js`, `client-detail-commercial-card.js`

### ✅ "Opgaver" is the first tab and the default
- **Where:** tab bar at the top of the client page
- **Files:** `client-detail-tabbed-body.js`

### 🟡 Changing the amount under "Økonomi & aftale" (e.g. upsell)
- **Where:** "Økonomi & aftale" card on the Overblik tab
- **Files:** `client-detail-commercial-card.js`, `client-detail-commercial-editor.js`, `lib/server/client-update-data.js`
- ✅ Retainer + web one-off + service agreement can sit side by side.
- ✅ Upsell route confirmed by the colleague: both a new add-on contract (tillæg) and a new combined contract are legally OK. Upsells are also registered in the new "Opsalg" card (see below).
- ⬜ Koncern pages (`/clients/koncern/<cvr>`) cannot edit amounts or services.

### ✅ "Kvalitet & risiko" renamed "NPS & kvalitet"
- **Files:** `client-detail-tabbed-body.js`

### ✅ Add a service under "Aktive services & kapacitetsfordeling", with budget out of the total
- **Files:** `client-detail-service-mix-card.js`, `client-detail-edit-form.js`

### ✅ "Allokering pr. disciplin" box removed
- **Where:** it should no longer appear on the Overblik tab.

### ✅ "Kontakter" KPI moved under "Kundeinfo"
- **Where:** Kundeinfo tab
- **Files:** `client-detail-kundeinfo-panel.js`

### ✅ "Seneste noter" placed where "Allokering pr. disciplin" was
- **Files:** `client-detail-notes-card.js`, `client-detail-tabbed-body.js`

### ✅ "Åbne & kommende opgaver" removed
- **Where:** it should no longer appear on Overblik; tasks live in the Opgaver tab.

### ✅ "Åbne opgaver" KPI under "Overblik"
- **Files:** `client-detail-kpi-strip.js`

### ✅ "Kundeinfo" tab completed, with the contract as PDF incl. signature info
- **Where:** Kundeinfo tab; the PDF page is `/api/contracts/<contractId>/document`
- **Files:** `client-detail-kundeinfo-panel.js`, `lib/contracts/contract-document-html.js`
- 🟡 The "PDF" is a printable HTML page (save as PDF in the browser), not a generated PDF file.

---

## Kontrakter

**Where (modal items below):** `/contracts` → open the send dialog → choose "Ny kunde" or "Eksisterende kunde". Main file: `components/contracts/contracts-send-modal.js`.

### ✅ "Lead-kilde" is a dropdown with 8 predefined options
- **Where:** send dialog, "Ny kunde" tab
- **Files:** `lib/crm/client-utils.js` (`LEAD_SOURCES`)

### ✅ Service lines can be filled in, summed under "Månedlig værdi"
- **Where:** send dialog, "Aftale" section, then the total under "Økonomi og varighed"
- **Files:** `contracts-send-modal.js`, `lib/server/contract-send-data.js`, `lib/contracts/contract-vars.js`, `lib/db/models/contract.js`
- 🟡 "Web (engangs)" is included in the monthly total on recurring contracts. Decide whether to separate it.

### ✅ One-off sale contract (web and service lines) for customers not yet in the system
- **Where:** send dialog, "Ny kunde" tab, with a one-off template/type
- **Files:** `contracts-send-modal.js`, `lib/server/contract-new-client.js`
- The customer is created when the contract is signed (signing page `/contracts/s/<token>`).

### ✅ Templates for new and existing customers
- **Where:** `/templates`, and the template dropdown in the send dialog
- **Files:** `lib/crm/contract-template-defaults.js`, `scripts/seed-contract-templates.js`
- Four starter templates are in the database. Re-create them with `npm run seed-contract-templates`.

### ✅ Existing customers get a new contract that recomputes the total (not an amendment)
- **Where:** send dialog, "Eksisterende kunde" tab (a hint is shown under the service lines)
- 🟡 Signing does not update the client's service budgets, only the contract value counts.

### ✅ Live preview of the customer e-mail and the PDF while filling in
- **Where:** right-hand panel of the send dialog, tabs "E-mail" and "Kontrakt (PDF)"
- **Files:** `contracts-send-modal.js`, `lib/contracts/contract-document-html.js`, `lib/email/contract-template-render.js`
- ⬜ A real send (Postmark) has not been tested end to end.

---

## Still missing / to do

### Data and integrations
- ✅ **Apex Indeks:** connected and working (sync, storage, display, stale warning, manual sync button).`n- ⬜ **Apex Indeks follow-ups:** schedule `/api/cron` daily after 06:00 Copenhagen with `Authorization: Bearer <CRON_SECRET>`, set `APEX_BASE_URL` + `CRM_INDEKS_API_KEY` in production, and fix the Apex customers with GA4 access errors (they show "–").
- ✅ **Sold MRR per department:** decision made — use service budgets (`serviceBudgets`, kr/md per department) per client; clients without budgets fall back to retainer × allocation %. Temporary upsells with a department are added for the selected month. One-off upsells are not counted (not MRR). Hover on the % in Pulse shows the split. **Still needed in the real data:** fill in service budgets per client (Kunde → Økonomi, or via signed contracts with service lines).
- ⬜ **Real database:** the new demo data is only in the demo data source. Loading it into the database needs `npm run reset-demo`, which wipes everything except users, so it has not been run.
- ⬜ **Postmark:** a real contract send (e-mail with signing link) has not been tested end to end.

### Decisions needed
- ⬜ **180.000 per employee:** (now adjustable in Indstillinger → Beregninger) confirm with the colleague whether it is per month or per year, whether it is the same for every department, and which way the ratio should read (target / sold MRR, as written, or the reverse). See `lib/crm/dept-profitability.js`.
- ⬜ **"Web (engangs)" on recurring contracts:** it is currently added into the monthly total. Decide whether to keep it separate.
- ✅ **Upsell route:** colleague: "Pt. laver vi en ny, som enten er gældende for opsalget og dermed som tillæg, eller også laves der en ny, hvor ændring tilføjes i den samlede. Begge dele fungerer juridisk OK."

### Features not done
- ✅ **Real PDF files:** `/api/contracts/<id>/document?format=pdf` returns a generated A4 PDF (pdfkit; contract text + signature block). The HTML view still exists (`/document`, `?print=1`). Buttons: "Download PDF" on client detail (contract card) and contract detail (Vilkår). Not attached to the e-mail yet.
- ✅ **Signing an upsell contract:** signing a contract for an existing client now adds its lines to the client: recurring lines → `serviceBudgets`, "Web (engangs)" → `oneOffWebAmount`, a "Serviceaftale (årlig)" template → `serviceAgreementAnnual` (+ contract value). `retainerAmount` is untouched (contract value already counts in MRR), a `commercialLog` entry is written, applied once (`commercialAppliedAt`).

**How to test (PDF + signing):**
1. Restart `npm run dev` (new schema field + `pdfkit` in `serverExternalPackages`).
2. PDF: open a client with a contract with text → Kundeinfo → "Download PDF" (or `/api/contracts/<id>/document?format=pdf`). Check æøå, headings, lists and the signature block.
3. Signing: Kontrakter → send a new contract to an EXISTING client with e.g. SEO 5.000 + Web (engangs) 20.000 → sign via the link. On the client: Økonomi shows higher SEO budget and web amount, the change history lists "Underskrevet kontrakt: …", MRR is raised only by the contract value (not doubled).
Note: contracts signed before this change are not back-filled.
- ⬜ **Koncern pages:** group pages (`/clients/koncern/<cvr>`) cannot edit amounts or services.

### Checks and cleanup
- ⬜ **Visual check in the browser:** Pulse, Kunder list, client detail and the contract dialog have not been looked at.
- ⬜ **Lint errors in other files:** `components/templates` has existing `set-state-in-effect` lint errors that were not part of this work.
- ⬜ **Drilon:** two `owner: "Drilon"` entries remain in `feature-status-data.js`.
- ⬜ **Stray file:** `scripts/_tail.txt` is a leftover and can be deleted.

## Adjustable calculation settings (Indstillinger → Beregninger)

Admin only. Saved in the database (`AgencySettings` collection, one document). Defaults live in `lib/crm/agency-settings.js`. Demo data always uses the defaults.

| Setting | Default | Used for |
| --- | --- | --- |
| Krav pr. medarbejder | 180.000 kr/md | Rentabilitet pr. afdeling (Pulse) |
| Vægt: Indeks / NPS / Tid brugt | 35 / 35 / 30 | Kundesundhed score (Top sunde/usunde) |
| Indeks-følsomhed | 1,25 | Scorepoint pr. Indeks-point |
| Straf for overforbrug | 150 | Scorepoint pr. 100 % over timebudget |
| Grænse: sund / advarsel | 70 / 50 | Farve på score i Top-listerne |
| Antal i Top-lister | 10 | Top N sunde / usunde kunder |

Check: `/settings`, tab "Beregninger" (admin). Files: `components/settings/settings-agency-section.js`, `app/api/settings/agency/route.js`, `lib/server/agency-settings-data.js`, `lib/db/models/agency-settings.js`.

Still fixed in code (not adjustable): the mock Indeks values (`mockIndeks`, demo data only), default annual price adjustment (3 %), default notice days (90), NPS "at risk" limit (40).
---

## Opsalg (upsells) — new

MRR and upsell are kept apart but shown together: `20 t kr. (+5 t kr. (i))`. Hover the (i) to see exactly what was sold.

**Types** (`lib/crm/upsell-utils.js`)

| Type | Meaning | Counts as |
|---|---|---|
| Engangsbeløb | one amount in one month (e.g. video, 15.000) | "+" in that month |
| Tillæg i periode | amount per month from–to (e.g. +8.000/md until January) | "+" in each month of the period |
| Fast MRR-stigning | permanent (e.g. +7.000 Meta) | added directly to the client's MRR (and the department budget if set) and logged in the change history — not shown as "+" |

**Fields per upsell:** client, who sold it, sold date, month(s) it is contracted for, amount, short description (max 200 words), plus type and department (department feeds the profitability chart).

**Where it shows:** Kunder list and cards (MRR column), Kunde → Økonomi (amount line + "Opsalg" card with history, add and delete), Pulse → "Retainer MRR" card (`fast MRR (+opsalg i perioden)`), and Pulse → "Opsalg pr. sælger" leaderboard (`components/pulse/pulse-upsell-leaderboard.js`: sold in the selected month by sold date, hover a seller for the individual upsells).

**Files:** `lib/db/models/upsell.js`, `lib/server/upsell-data.js`, `app/api/clients/[clientId]/upsells/**`, `components/clients/client-detail-upsells-card.js`, `components/clients/retainer-with-upsell.js`, demo data `UPSELLS` in `lib/crm/static-data.js`.

### How to test

1. **Demo data** (data source = Eksempeldata): open Kunder. Nordvig & Partners shows `72 t kr. (+5 t kr. (i))`, Værftet Hotels `(+15 t kr.)`, Bryggeriet Sort `(+27,5 t kr.)`. Hover the (i) for who/when/period/amount/description. Open Nordvig → Økonomi: the "Opsalg" card lists them (read-only in demo). Kystlinjen Rejser has a "Fast MRR-stigning" (shown as "Indgår i MRR"). Helio Solar has an old one-off that is not active.
2. **Pulse (demo):** "Retainer MRR" shows `1,09 mio. kr. (+77,5 t kr.)`. Scroll to "Opsalg pr. sælger": Louise Madsen 29 t, Jonas Lindberg 27,5 t, Rasmus Nielsen 15 t, Mikkel Kragh 6 t — hover a name for the upsells. Change the report period to another month to see it change. **Pulse → Rentabilitet per afdeling:** hover a % — the popover shows budgets / allocation / period upsells. SEO and PPC include the demo temporary upsells.
3. **Database:** switch to Database, run `reset-demo` (**wipes everything except users — ask before doing it**), or just use a real client. Open a client → Økonomi → "Tilføj opsalg". Try each type; the list updates and the MRR column shows `(+…)`. For a temporary upsell choose a "til og med" month and step the report period in Pulse to see it appear/disappear per month.
4. **Fast MRR-stigning:** add one — "MRR retainer" under Aftalebeløb rises and a line appears in Ændringshistorik.
5. Description over 200 words is rejected.

### Not done / notes
- Deleting a "Fast MRR-stigning" does not roll the MRR back (fix the amount under Aftalebeløb).
- Koncern pages show the combined "+" but cannot add upsells (open a brand).
- Upsells are not yet linked to a contract document.
- The Pulse MRR card adds all upsells active in the period (one-off and temporary) after the fixed MRR; the leaderboard counts by sold date, including fixed MRR increases.

---

## Pulse KPI cards — real visuals (new)

The four static sparkline images were replaced (`components/pulse/pulse-kpi-visuals.js`):

| Card | Now shows |
|---|---|
| Retainer MRR | MRR bridge pills: Nye / Opsalg (fast MRR-stigning) / Churn (+ Justeringer), "fra X ved periodens start". Hover a pill for the clients. |
| Udnyttelse | Real daily sparkline of billable hours in the period (+ total and peak day). |
| Overhead-tid | Stacked bar billable vs overhead hours. |
| Gns. margin | Histogram of active clients per margin band (<0, 0–15, 15–30, >30 %). Hover a bar for the clients. |

**Real "previous month" values:** the delta chips used made-up numbers (`MRR × 0.96`, `margin − 2 pp`). Now:
- MRR prev = stored monthly snapshot (`PulseSnapshot`, saved whenever Pulse is opened on the current month) or, without a snapshot, derived from new/churn/upsell changes.
- Margin prev = snapshot only; no chip until a snapshot for last month exists (so the margin chip appears from next month).
- Demo: one new client (Matr. Arkitekter), one churn (Blaa Planet) and one fixed MRR increase (Kystlinjen) in the current month.

**Notes:** the bridge relies on `startedAt` / `terminatedAt` on clients. "Churn" = non-active clients terminated in the period (uses their retainer). Utilisation/overhead deltas were already real (previous-month hours).
