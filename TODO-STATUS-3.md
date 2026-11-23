# TODO-STATUS-3 — UI-rettelser (23. nov 2026)

Status efter implementering af de 9 punkter fra feedback-screenshots.

## MCP service token (uden for Claude) — DONE (database)

Langtids-token til `/api/mcp` via `Authorization: Bearer …`.

- **Primært i MongoDB** (`McpServiceToken` — kun hash gemmes)
- Admin API: `GET/POST /api/mcp-service-tokens`, `DELETE /api/mcp-service-tokens/:id`
- Script: `node scripts/generate-mcp-service-token.mjs email@searchmind.dk [label]`
- Valgfri Railway-fallback: `MCP_SERVICE_TOKEN` + `MCP_SERVICE_TOKEN_EMAIL` (ikke nødvendig hvis DB-token bruges)
- Email skal være på `MCP_ALLOWED_EMAILS`

## Brand Core upload-limit — DONE

- Max **40 MB** pr. fil (før 8 MB), billeder 15 MB, samlet 120 MB
- Binære filer gemmes i **GridFS** (`tov_source_files`) pga. Mongo’s 16 MB BSON-grænse

## 1. Tooltips på kolonneoverskrifter — DONE

Hover/title på overskrifterne i **Alle kunder** (Ejer, Status, Retainer, Margin, Seneste NPS, Indeks, Seneste aktivitet, Timer).

- Fil: `components/clients/directory-column-hint.js`, brugt i `clients-directory.js`

## 2. Kun synlig for admins (Kræver handling / Usunde) — DONE

- KPI **Kræver handling** i summary-strippen er kun synlig for `isAdmin`
- Filterfanen **Usunde** er kun synlig for admins
- Filer: `clients-summary-strip.js`, `clients-directory.js`

## 3. Hover med 12 måneders historik (Retainer / Margin / NPS / Indeks) — DELVIS

- Lazy hover via `MetricHistoryHover` + nyt endpoint `GET /api/clients/[clientId]/trends`
- **Retainer** og **NPS** har rigtig historik (samme kilde som kundekortets KPI-trends)
- **Margin** og **Indeks** har endnu ikke månedlig historik i CRM → hover viser ikke graf før data findes

Se spørgsmål nederst.

## 4. Budget skal være beløb, ikke timer — DONE

På kundekort → Overblik → **Budget & tidsforbrug**:

- **Budget** = retainer (beløb / md)
- Estimeret / Brugt forbliver timer
- Progressbar er omdøbt til **Timebudget brugt** (stadig timer)

- Fil: `client-detail-delivery-card.js`

## 5. Generér Brand Core når den mangler — DONE (med forbehold)

- Hvis kunden er en **kundegruppe** (`koncern-…`), fejlede Brand Core med «Kunden findes ikke». Nu vises i stedet vejledning + links til brands.
- Bedre fejl-UI med «Prøv igen» på enkeltbrands.
- Tom profil: eksisterende flow under «Generér / materiale» (trin 1)

- Filer: `client-detail-tabbed-body.js`, `tov-workspace.js`

## 6. Kan ikke ændre retainer / fordeling — FORKLARET + UI-hint

**Ja — delvist fordi det er styret af kontrakter og admin-rettigheder:**

| Felt | Hvem kan ændre | Note |
| --- | --- | --- |
| Fast MRR retainer | Kun **admin** (database) | Knap «Ændr beløb / opsalg» |
| Fra signerede kontrakter | Via kontrakter | Lægges automatisk oveni |
| Servicefordeling | Alle med redigeringsret (ikke gruppe) | «Tilføj / redigér services» |

- Synlige hints når man kun har view-adgang
- Filer: `client-detail-commercial-editor.js`, `client-detail-service-mix-card.js`

## 7. Fjern dobbelt «Timer»-knap — DONE

Fjernet den blå **Timer**-knap fra tidsregistreringens sideheader (den findes allerede i global topbar). Medlemsfilteret («Mine / Alle / …») er beholdt.

- Fil: `time-page-header.js`

## 8. Mere fokus på «Generér fra website» (Brand Core / ToV) — DONE (første iteration)

Én samlet trin-1-oplevelse (ikke to separate produkter endnu):

1. Anbefalet: vælg kundens domæne («Generér fra website»)
2. Valgfrit: upload ekstra materiale
3. Primær CTA: **Generér fra website** / **Generér fra materiale**

Se spørgsmål om 1 vs 2 steps.

## 9. Resultat non-clickable indtil kørt; default når kørt — DONE

- Fanen **2. Resultat** er `disabled` uden profil (`title` forklarer hvorfor)
- Med eksisterende profil lander man stadig på **Resultat** som default
- Efter færdig analyse hoppes der til Resultat

- Filer: `tov-workspace.js`, `pulse-segmented-control.js` (understøtter `disabled` + `title` på tabs)

---

## Spørgsmål / usikkerheder (brug for din guide)

1. **#2:** Er det kun «Kræver handling» + «Usunde», eller skulle flere KPI’er/filtre også være admin-only?
2. **#3 historik:**
   - Skal Margin have 12 mdr. historik? Vi gemmer i dag kun aktuelle margin — kræver snapshots eller genberegning.
   - Indeks: Apex giver kun aktuelt tal. Skal vi logge Indeks dagligt i CRM, eller er hover kun meningsfuldt for Retainer/NPS?
3. **#4:** Er det OK at progressbaren stadig er **timer** (timebudget), mens «Budget»-tallet er retainer-beløb? Ellers: hvordan skal «% budget brugt» beregnes i kroner?
4. **#5 Bryggeriet Sort:** Var det en **kundegruppe**-side der viste «Kunden findes ikke»? Bekræft gerne efter deploy. Hvis det var et enkelt brand, send slug/URL så vi kan debugge `findClient`.
5. **#6:** Skal **ikke-admins** kunne ændre servicefordeling (ja i dag hvis de må redigere kunden), eller skal det også være admin-only som retainer?
6. **#8:** Vil I have **to tydelige steps** (A: kun website-generering → B: tilføj eget materiale → samlet resultat), eller er den nuværende «anbefalet website + valgfrit materiale → én Generér-knap» god nok?
7. **ToV vs Brand Core:** Skal Tone of Voice have samme «generér fra site»-fokus et andet sted, eller dækker Brand Core-flowet begge?
