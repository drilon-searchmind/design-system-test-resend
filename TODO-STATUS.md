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
- 🟡 Sold MRR per department is mostly 0 in the real data, so the chart looks empty.

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
- 🟡 For an upsell the recommended route is a new contract (see Kontrakter).
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
- ⬜ **Sold MRR per department:** the profitability chart uses allocation % of each retainer. In the real database most allocations are empty, so the chart looks empty. Needs real sold-MRR data per department (or a decision to use service budgets instead).
- ⬜ **Real database:** the new demo data is only in the demo data source. Loading it into the database needs `npm run reset-demo`, which wipes everything except users, so it has not been run.
- ⬜ **Postmark:** a real contract send (e-mail with signing link) has not been tested end to end.

### Decisions needed
- ⬜ **180.000 per employee:** (now adjustable in Indstillinger → Beregninger) confirm with the colleague whether it is per month or per year, whether it is the same for every department, and which way the ratio should read (target / sold MRR, as written, or the reverse). See `lib/crm/dept-profitability.js`.
- ⬜ **"Web (engangs)" on recurring contracts:** it is currently added into the monthly total. Decide whether to keep it separate.
- ⬜ **Upsell route:** we recommend a new contract for existing customers. Confirm that is what the colleague wants instead of an amendment.

### Features not done
- ⬜ **Real PDF files:** the "PDF" is a printable HTML page (save as PDF in the browser). No generated PDF file.
- ⬜ **Signing an upsell contract:** it does not update the existing client's service budgets or web / service-agreement amounts. Only the contract value counts.
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