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

## 3. Hover med 12 måneders historik — DONE

- **Retainer**, **Margin** og **NPS** (ikke Indeks)
- Lazy hover via `MetricHistoryHover` + `GET /api/clients/[clientId]/trends`
- Margin: estimeret pr. måned ud fra MRR vs. timer (kalibreret til nuværende margin)

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

## 8. Mere fokus på «Generér fra website» (Brand Core / ToV) — DONE

Én samlet trin-1-oplevelse (bekræftet god nok — ikke to separate steps):

1. Anbefalet: vælg kundens domæne («Generér fra website»)
2. Valgfrit: upload ekstra materiale
3. Primær CTA: **Generér fra website** / **Generér fra materiale**

**ToV:** dækkes af samme Brand Core-flow (ingen separat «generér ToV»-side).

## 9. Resultat non-clickable indtil kørt; default når kørt — DONE

- Fanen **2. Resultat** er `disabled` uden profil (`title` forklarer hvorfor)
- Med eksisterende profil lander man stadig på **Resultat** som default
- Efter færdig analyse hoppes der til Resultat

- Filer: `tov-workspace.js`, `pulse-segmented-control.js` (understøtter `disabled` + `title` på tabs)

---

## Besvarede spørgsmål

| # | Svar | Handling |
| --- | --- | --- |
| **#2** | Kun «Kræver handling» + «Usunde» admin-only | Allerede sådan — ingen ændring |
| **#6** | Ikke-admins må ændre servicefordeling | Allerede sådan (`canEditClient`, ikke admin-låst) |
| **#8** | Nuværende én Generér-flow er fint | Ingen ændring |
| **ToV** | Brand Core dækker begge | Ingen separat ToV-generering |
| **#3** | Historik-hover Retainer + Margin + NPS | Indeks uden hover |

## Åbne spørgsmål (stadig)

1. **#4:** Er det OK at progressbaren er **timer** mens «Budget» er retainer-beløb?
2. **#5 Bryggeriet Sort:** Var «Kunden findes ikke» på en **kundegruppe**-side? Bekræft gerne efter deploy.
