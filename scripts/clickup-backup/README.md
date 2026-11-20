# ClickUp → BigQuery backup

Tager et fuldt snapshot af hele ClickUp-workspacet og lægger det i BigQuery. Hver kørsel er et nyt snapshot
(append, aldrig overskrivning), og en afbrudt kørsel kan genoptages.

Kode: `clickup-api.mjs` (klient, rate limiter, retry), `bq-sink.mjs` (skemaer, batching, load jobs, views),
`backup.mjs` (faser og CLI), `test-connection.mjs` (forbindelsestest), `cleanup-test.mjs` (rydder test-tabeller).

## Forudsætninger (.env)

`CLICKUP_API_TOKEN`, `CLICKUP_TEAM_ID` (valgfri), `CLICKUP_RPM` (standard 90), `BQ_PROJECT_ID`, `BQ_DATASET`,
`BQ_LOCATION` (EU), `BQ_SERVICE_ACCOUNT_JSON` (én linje), `BQ_ATTACHMENT_MAX_BYTES` (standard 10485760).
Hemmeligheder skrives aldrig til log eller filer.

## Kørsel

```powershell
npm run backup:clickup:dry         # tør kørsel: kun læsning, skriver intet til BigQuery, gemmer rapport i .out/
npm run backup:clickup             # rigtig backup (nyt snapshot)
node --env-file=.env scripts/clickup-backup/test-connection.mjs   # tjek ClickUp-token og BigQuery
```

Snapshot-id (UTC, fx `20261120T115623Z`) printes i starten af loggen. **Noter det.**

### Genoptag efter afbrydelse

```powershell
node --env-file=.env scripts/clickup-backup/backup.mjs --run --resume=20261120T115623Z
```

Færdige faser og tasks springes over. Struktur og task-liste læses fra cache i `.state/`. Rækker skrives til
BigQuery, før en task regnes som færdig.

### Anbefalet første gang (lille test)

```powershell
node --env-file=.env scripts/clickup-backup/backup.mjs --run --prefix=test_ --limit-folders=2 --limit-lists=2
node --env-file=.env scripts/clickup-backup/cleanup-test.mjs          # viser hvad der slettes
node --env-file=.env scripts/clickup-backup/cleanup-test.mjs --yes    # sletter test_-tabeller og views
```

Kørslen afsluttes med en automatisk kontrol, der sammenligner antal rækker skrevet med antal rækker i BigQuery
for snapshottet (felt `verification` i outputtet). Afvigelse giver en fejl og exit-kode 2.
Tjek også selv: `SELECT COUNT(*) FROM test_tasks` skal være lig `counts.tasks` i outputtet.

## Flag

| Flag | Betydning |
| --- | --- |
| `--run` | Skriv til BigQuery. Uden: tør kørsel |
| `--only=a,b` | Kun disse faser: `workspace,hierarchy,tasks,time,docs,goals,attachments` |
| `--resume=ID` | Fortsæt en afbrudt kørsel |
| `--prefix=test_` | Præfiks på tabelnavne (til test) |
| `--views` | Hent også views (team, space, mappe, liste). Dyrt: tusindvis af kald |
| `--tasks-by-list` | Hent tasks liste for liste i stedet for via workspace-endpointet (langsommere, mest nøjagtigt) |
| `--no-archived-tasks` | Spring pas over for arkiverede tasks (sparer ca. 5.800 kald) |
| `--no-archived-lists` | Spring arkiverede lister i mapper over |
| `--no-task-details` | Spring `GET /task/{id}` over (mister checklists, dependencies, vedhæftninger) |
| `--no-comments` | Spring kommentarer over |
| `--no-attachments` | Hent ikke filer (metadata gemmes) |
| `--limit-folders=N` / `--limit-lists=N` | Til test. Tasks hentes da pr. liste |

## Forventet varighed

Ved 90 kald/minut (rate limit er ca. 100):

- Struktur: ca. 800 kald (ca. 9 min)
- Arkiverede tasks: ca. 5.800 kald (ca. 65 min)
- Tasks via workspace-endpointet: 1 kald pr. 100 tasks
- Pr. task: ca. 2 kald (detaljer + kommentarer), flere ved mange kommentarer eller svar

Eksempel: 30.000 tasks giver ca. 60.000 kald, altså ca. 11 timer. Den tørre kørsel giver et skøn for jeres tal
(`estimate` i rapporten). Skærer man `--no-task-details` eller `--no-comments` fra, halveres tiden. Loggen viser løbende ETA.
Brug `--resume`, hvis den afbrydes.

## Tabeller

Alle har kolonnerne `snapshot_id, snapshot_at, id, parent_id, name, data (JSON, fuldt råt objekt)`.

`workspaces, members, user_groups, custom_task_types, custom_fields, spaces, tags, folders, lists, tasks, comments,
time_entries, docs, doc_pages, goals, views, guests`, samt `attachments` og `backup_runs`.

Ekstra kolonner: `tasks` (list_id, status, archived, parent_task_id, date_created, date_updated, date_closed),
`comments` (task_id, comment_date, author; svar har `parent_id` = kommentarens id), `time_entries` (task_id, user_id,
started_at, duration_ms). `attachments` har bl.a. `status` (stored, too_large, download_failed, skipped, metadata),
`sha256`, `content` (BYTES).

Til hver entitet (undtagen attachments og backup_runs) oprettes viewet `<tabel>_latest` med seneste snapshot.
Tabeller udløber aldrig.

## Eksempler

```sql
-- Åbne tasks pr. status
SELECT status, COUNT(*) AS antal FROM `projekt.datasæt.tasks_latest` WHERE date_closed IS NULL GROUP BY status ORDER BY antal DESC;

-- Felt fra JSON
SELECT id, name, JSON_VALUE(data, '$.creator.username') AS oprettet_af FROM `projekt.datasæt.tasks_latest` LIMIT 20;

-- Kommentarer på en task
SELECT comment_date, author, JSON_VALUE(data, '$.comment_text') AS tekst FROM `projekt.datasæt.comments_latest` WHERE task_id = 'abc123' ORDER BY comment_date;

-- Hvordan gik kørslerne
SELECT run_id, started_at, finished_at, row_counts FROM `projekt.datasæt.backup_runs` ORDER BY started_at DESC;

-- Filer der ikke kunne hentes
SELECT status, COUNT(*) FROM `projekt.datasæt.attachments` GROUP BY status;
```

## Begrænsninger

- **Tidsregistreringer** kræver, at tokenets bruger er Owner/Admin. Ellers 403 `TIMEENTRY_059`. Fasen stoppes med én advarsel.
- **Doc-sider**: mange dokumenter svarer 403 (adgang nægtet). Selve dokumenterne (metadata) gemmes, sider mangler.
  Log viser de første 3 og en samlet advarsel.
- **Gæster** (`/guest`) giver 405 på denne plan og springes over (ikke en fejl).
- **Vedhæftede filer**: metadata og URL gemmes altid. Download er best effort (se nedenfor). Filer over
  `BQ_ATTACHMENT_MAX_BYTES` gemmes kun som metadata (`too_large`). Id'er gemt med `stored` i tidligere snapshots hentes ikke igen.
  Bemærk: gemte URL'er indeholder et signeret `authz_token`. Behandl tabellen som følsom.
- **Arkiverede tasks** findes ikke i workspace-endpointet og kræver ét kald pr. liste.
- **Workspace-endpointet** kan mangle tasks. Kørslen tjekker en stikprøve på 10 lister og advarer. Brug så `--tasks-by-list`.
- **Licens**: API-adgangen kan blive begrænset, når licensen udløber. Kør backuppen **før** da.
- Exit-kode 0 = ok, 2 = advarsler eller fejl (se `errors` i outputtet). En fase der fejler stopper ikke de andre.

## Vedhæftede filer: kendt problem og undersøgelse

I tidligere tests gav de signerede URL'er (`*.p.clickup-attachments.com/...?authz_token=...`) først 404 og derefter 403
AccessDenied (XML), både med og uden Authorization-header, også når de var hentet frisk fra task-svaret.
Der er ikke brugt omgåelser (ingen falske browser-headere).

Mulige årsager, som kan undersøges med lovlige midler:

1. Tokenets bruger har ikke adgang til filen eller listen. Test i ClickUp-appen som samme bruger, om filen kan åbnes.
2. Den signerede URL udløber hurtigt. Hent og download derfor i samme tur (vi henter allerede tasks og filer efter hinanden, men over timer).
   Hvis det er årsagen, kan download flyttes ind i task-løkken, så filen hentes lige efter task-svaret.
3. Kun personlige API-tokens fra en bruger med fuld adgang virker. Kontrollér at tokenet ikke er et begrænset OAuth-token.
4. Planen eller workspace-indstillinger kan begrænse download via API. Spørg ClickUp support.

Efter en rigtig kørsel: `SELECT status, error, COUNT(*) FROM attachments GROUP BY 1, 2` viser, hvor mange der fejlede og hvorfor.
Dokumentér resultatet her.

## Railway (kør backuppen i skyen)

Mappen er en selvstændig pakke (`package.json`, `Dockerfile`, `railway.json`), så Railway ikke bygger hele Next.js-appen.

### Opsætning (én gang)

1. Push repoet til GitHub. I Railway: **New Project → Deploy from GitHub repo**.
2. Service **Settings → Source → Root Directory**: `/scripts/clickup-backup`.
3. **Settings → Config-as-code → Railway Config File**: `/scripts/clickup-backup/railway.json`
   (stien er fra repoets rod, uanset Root Directory).
4. **Volume**: højreklik på servicen (eller Cmd/Ctrl+K → "volume") og tilføj en volume med mount path `/data`. Uden volume mistes
   state ved hver genstart/deploy, og en afbrudt kørsel kan ikke genoptages.
5. **Variables**:

| Variabel | Værdi |
| --- | --- |
| `CLICKUP_API_TOKEN`, `CLICKUP_TEAM_ID`, `CLICKUP_RPM` | som i .env |
| `BQ_PROJECT_ID`, `BQ_DATASET`, `BQ_LOCATION` | som i .env |
| `BQ_SERVICE_ACCOUNT_JSON` | JSON på én linje |
| `BQ_ATTACHMENT_MAX_BYTES` | valgfri |
| `STATE_DIR` | `/data/state` |
| `OUT_DIR` | `/data/out` |
| `MAX_RUNTIME_HOURS` | `20` |
| `NOTIFY_WEBHOOK_URL` | valgfri Slack/Discord incoming webhook |
| `BACKUP_ARGS` | styrer tilstand, se nedenfor |

### Kør

`BACKUP_ARGS` bestemmer hvad containeren gør ved start (efterfølges altid af `--auto-resume`):

| Mål | `BACKUP_ARGS` |
| --- | --- |
| Tør kørsel (kun læsning, rapport i loggen) | sat til tom streng |
| Lille test | `--run --prefix=test_ --limit-folders=2 --limit-lists=2` |
| Rigtig backup | ikke sat (= `--run`) |

Anbefalet rækkefølge: 1) tør kørsel, 2) lille test (kør derefter `cleanup-test.mjs --yes` lokalt, eller slet `test_`-tabeller i BigQuery),
3) fjern `BACKUP_ARGS` og deploy for den rigtige backup. Hver ændring af en variabel udløser en ny deploy, som starter kørslen.
Tjek, at `STATE_DIR` er sat, før du starter en test: ellers ligger state i containeren.

### Tidsgrænse (maks. 20 timer)

`MAX_RUNTIME_HOURS=20` måles fra snapshottets **første** start og tælles videre efter genstart. Når grænsen nås, gøres den igangværende task færdig,
alt flushes til BigQuery, state gemmes, og processen afslutter med kode 0 (Railway genstarter ikke). `_latest`-views opdateres **ikke**
(et ufærdigt snapshot må ikke blive "seneste"). Slutter kørslen med "STOPPET": hæv `MAX_RUNTIME_HOURS` (fx til 40) og redeploy/restart.
Så tager `--auto-resume` snapshottet op, hvor det slap. Er snapshottet over 7 dage gammelt, starter et nyt.

### Genstart og nedbrud

- Nedbrud (exit 1, fx netværksfejl) → Railway genstarter op til 5 gange, og auto-resume fortsætter samme snapshot.
- Ny deploy sender SIGTERM → scriptet stopper pænt og gemmer. Railway giver dog kun kort frist (kan forlænges med variablen
  `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`). Efter en deploy genoptages automatisk fra seneste gemte tilstand (kun få hundrede tasks genhentes).
- Færdig kørsel afslutter med kode 0, også ved advarsler (se `errors` i loggen). En færdig kørsel genstartes ikke.
- Starter servicen igen efter en færdig kørsel (redeploy), laves et **nyt** snapshot. Brug **Remove deployment**/skaler til 0, når du er færdig,
  eller sæt `BACKUP_ARGS` til en tom streng for kun at lave tør kørsel.

### Overvågning

1. **Railway Deployments → View logs** (Observability). Søg i loggen:
   - `Hjerteslag:` hvert 5. minut: fase, antal kald, genforsøg, tasks færdige, rækker
   - `Tasks behandlet: X/Y (ca. N min tilbage)` hver 100. task, ETA
   - `Rate limit, venter` = ClickUp bremser (normalt, men mange er et tegn på for høj `CLICKUP_RPM`)
   - `FEJL`, `ADVARSEL`, `NEDBRUD`
   - Ingen `Hjerteslag` i over 10 minutter = noget hænger
2. **Metrics-fanen**: CPU/RAM/netværk. Hukommelsen bør være stabil. Voksende RAM hele vejen = meld det.
3. **Webhook**: sæt `NOTIFY_WEBHOOK_URL`, så får du besked ved start, færdig, stoppet (tidsgrænse) og nedbrud.
4. **Railway notifikationer**: Project Settings → Notifications, så får du mail/Slack, hvis en deploy fejler eller crasher.
5. **BigQuery** (fremdrift udefra), fx:
   ```sql
   SELECT COUNT(*) FROM `projekt.datasæt.tasks` WHERE snapshot_id = '20261120T115623Z';
   SELECT run_id, started_at, finished_at, phases FROM `projekt.datasæt.backup_runs` ORDER BY started_at DESC;
   ```
   Rækker i `tasks` skrives i bidder (hver ca. 1000 rækker). Når tallet stiger, kører den. `backup_runs` får én række ved hvert stop/slut.
