# Brand Core: skabelon for analysen

> Genereret fra `lib/tov/template.js`. Ret reglerne dér og kør `node scripts/generate-brand-core-template-doc.mjs`.

Hver analyse leverer de samme sektioner. **Formen** (felter, valgmuligheder, antal) ligger i `lib/tov/schema.js` (`TOV_PROFILE_SCHEMA`) og håndhæves på modellens svar. **Indholdsstandarden** herunder sendes med i analyse-prompten (`ANALYZE_SYSTEM` i `lib/tov/prompts.js`). Tallene er mål, ikke krav om fyld.

Standarden er udledt af en analyse, teamet har vurderet som målniveauet.

## 1. Sammenfatning

Felter: `brand.*, voice.summary, voice.primaryLanguage`

- voice.summary: 3-5 sætninger (ca. 350-450 tegn), skrevet til en tekstforfatter: hvem stemmen er, hvordan svære emner forklares, hvad der er fokus, og hvordan tonen flekser efter kanal/modtager.
- mission: 1-2 sætninger. positioning: 1-2 sætninger (ca. 200 tegn) der siger hvad brandet er i forhold til konkurrenterne.
- coreValues: 5-6 værdier på 1-3 ord hver.
- audiences: 3 målgrupper med et kort navn og ca. 130 tegn om hvad de er under pres for / har brug for.
- tagline: kun hvis den findes i materialet, ellers tom streng. Opfind aldrig en.

## 2. Tone-skalaer

Felter: `voice.dimensions.*`

- Alle 7 skalaer udfyldes beslutsomt og bruger hele 0-100. Undgå at lægge alle omkring 50.
- Tallene skal passe til sammenfatning og personlighed (fx en 'selvsikker' stemme kan ikke score lavt på reservedBold).

## 3. Personlighed

Felter: `voice.personality[]`

- 6 træk (mindst 4). trait er ét ord.
- description (ca. 100-120 tegn) siger hvad trækket betyder i tekst, og hvor grænsen går ('..., aldrig X').
- intensity varierer mellem ca. 60 og 90, og ikke alle har samme tal.

## 4. Sprog & stil

Felter: `voice.* (enums), style.*`

- Alle enums (synsvinkel, tiltaleform, sætningslængde, humor, emoji m.fl.) og averageSentenceWords udfyldes.
- punctuationNotes: ca. 200 tegn med konkrete regler (tankestreg, punktum i overskrifter, udråbstegn).
- formattingRules, dos og donts: 5 af hver, korte og i bydeform (ca. 30-50 tegn).
- Tal-, dato- og valutaformat følger brandets sprog. Er det ikke dokumenteret, er det et skøn og nævnes i confidence.notes.

## 5. Ordforråd

Felter: `vocabulary.*`

- preferredWords: 10-12. avoidedWords: 5-6. signaturePhrases: 5 (rigtige vendinger fra materialet). bannedPhrases: 4.
- terminology: 3-5 poster med term, hvordan det bruges og hvad der skrives i stedet (insteadOf). Brandnavn og produktnavne skrives altid præcist.

## 6. Typografi

Felter: `typography.*`

- Kun dokumenteret evidens. Intet bevis giver 'unknown' og et punkt i confidence.missingInfo. Opfind aldrig en skrifttype.
- Både primær og sekundær skrifttype med fallbacks og kilde. H1-H3, brødtekst, knap og caption udfyldes når materialet viser det.

## 7. Farver & visuelt

Felter: `colors.*, visual.*`

- Hex-værdier kun fra materialet (guide, CSS, billeder). Palette: 8-10 farver med navn, hex og rolle (CTA, baggrund, highlight).
- imageryStyle ca. 250-300 tegn, øvrige visuelle felter 1-2 konkrete sætninger (form, radius, tæthed).

## 8. Kommunikation

Felter: `messaging.*`

- elevatorPitch: 2-3 sætninger (ca. 220 tegn) i brandets stemme. boilerplate: kort 'om os' (ca. 250-270 tegn).
- pillars: 4 budskaber (mindst 3) med titel, beskrivelse (ca. 110 tegn) og et konkret proof point.

## 9. Kanaler

Felter: `channels[]`

- 4-6 kanaler med evidens eller klar implikation. toneShift siger konkret hvad der ændres ift. kernestemmen, og example er en kort linje i stemmen.

## 10. Eksempler

Felter: `examples.*`

- 5 overskrifter, 5 CTA'er, 4 emnelinjer, 3 sociale opslag, 3 annoncetekster. Alt er NYE linjer i stemmen, ikke kopier.
- bodyParagraph: 60-90 ord. good/bad: 4 af hver. 'bad' skal være realistiske fejl der bryder et bestemt personlighedstræk, og 'why' peger på træk eller regel.

## 11. Datagrundlag

Felter: `confidence.*`

- overall er et ærligt tal. notes (kan være lange) beskriver kvaliteten af materialet, konflikter mellem kilder og alt der er antaget eller skønnet frem for dokumenteret.
- missingInfo: 4-6 konkrete mangler. sourcesUsed: de tungeste kilder, helst med sidetal.

## Ændre skabelonen

- **Nyt eller omdøbt felt:** ret `lib/tov/schema.js`, hæv `TOV_SCHEMA_VERSION`, og vis det i `components/tov/tov-profile-view.js`.
- **Kvalitetskrav:** ret `lib/tov/template.js` og regenerér dokumentet.
- Eksisterende profiler følger den nye standard, første gang kunden analyseres igen.
