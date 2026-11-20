/**
 * Brand Core analysis template: what every analysis must contain and how good each section has to be.
 *
 * Source of truth for the *content standard*. The *shape* (fields, enums, counts) lives in
 * lib/tov/schema.js (TOV_PROFILE_SCHEMA). This file is used to:
 *   - build the quality guide that is appended to the analysis prompt (lib/tov/prompts.js),
 *   - generate docs/BRAND-CORE-TEMPLATE.md (node scripts/generate-brand-core-template-doc.mjs).
 * The standard was derived from an analysis the team rated as the target level. Edit the rules here,
 * not in the prompt.
 */

/**
 * @typedef {{ id: string; title: string; fields: string; rules: string[] }} TovTemplateSection
 */

/** @type {TovTemplateSection[]} */
export const TOV_TEMPLATE_SECTIONS = [
  {
    id: "summary",
    title: "Sammenfatning",
    fields: "brand.*, voice.summary, voice.primaryLanguage",
    rules: [
      "voice.summary: 3-5 sætninger (ca. 350-450 tegn), skrevet til en tekstforfatter: hvem stemmen er, hvordan svære emner forklares, hvad der er fokus, og hvordan tonen flekser efter kanal/modtager.",
      "mission: 1-2 sætninger. positioning: 1-2 sætninger (ca. 200 tegn) der siger hvad brandet er i forhold til konkurrenterne.",
      "coreValues: 5-6 værdier på 1-3 ord hver.",
      "audiences: 3 målgrupper med et kort navn og ca. 130 tegn om hvad de er under pres for / har brug for.",
      "tagline: kun hvis den findes i materialet, ellers tom streng. Opfind aldrig en.",
    ],
  },
  {
    id: "dimensions",
    title: "Tone-skalaer",
    fields: "voice.dimensions.*",
    rules: [
      "Alle 7 skalaer udfyldes beslutsomt og bruger hele 0-100. Undgå at lægge alle omkring 50.",
      "Tallene skal passe til sammenfatning og personlighed (fx en 'selvsikker' stemme kan ikke score lavt på reservedBold).",
    ],
  },
  {
    id: "personality",
    title: "Personlighed",
    fields: "voice.personality[]",
    rules: [
      "6 træk (mindst 4). trait er ét ord.",
      "description (ca. 100-120 tegn) siger hvad trækket betyder i tekst, og hvor grænsen går ('..., aldrig X').",
      "intensity varierer mellem ca. 60 og 90, og ikke alle har samme tal.",
    ],
  },
  {
    id: "style",
    title: "Sprog & stil",
    fields: "voice.* (enums), style.*",
    rules: [
      "Alle enums (synsvinkel, tiltaleform, sætningslængde, humor, emoji m.fl.) og averageSentenceWords udfyldes.",
      "punctuationNotes: ca. 200 tegn med konkrete regler (tankestreg, punktum i overskrifter, udråbstegn).",
      "formattingRules, dos og donts: 5 af hver, korte og i bydeform (ca. 30-50 tegn).",
      "Tal-, dato- og valutaformat følger brandets sprog. Er det ikke dokumenteret, er det et skøn og nævnes i confidence.notes.",
    ],
  },
  {
    id: "vocabulary",
    title: "Ordforråd",
    fields: "vocabulary.*",
    rules: [
      "preferredWords: 10-12. avoidedWords: 5-6. signaturePhrases: 5 (rigtige vendinger fra materialet). bannedPhrases: 4.",
      "terminology: 3-5 poster med term, hvordan det bruges og hvad der skrives i stedet (insteadOf). Brandnavn og produktnavne skrives altid præcist.",
    ],
  },
  {
    id: "typography",
    title: "Typografi",
    fields: "typography.*",
    rules: [
      "Kun dokumenteret evidens. Intet bevis giver 'unknown' og et punkt i confidence.missingInfo. Opfind aldrig en skrifttype.",
      "Både primær og sekundær skrifttype med fallbacks og kilde. H1-H3, brødtekst, knap og caption udfyldes når materialet viser det.",
    ],
  },
  {
    id: "colors-visual",
    title: "Farver & visuelt",
    fields: "colors.*, visual.*",
    rules: [
      "Hex-værdier kun fra materialet (guide, CSS, billeder). Palette: 8-10 farver med navn, hex og rolle (CTA, baggrund, highlight).",
      "imageryStyle ca. 250-300 tegn, øvrige visuelle felter 1-2 konkrete sætninger (form, radius, tæthed).",
    ],
  },
  {
    id: "messaging",
    title: "Kommunikation",
    fields: "messaging.*",
    rules: [
      "elevatorPitch: 2-3 sætninger (ca. 220 tegn) i brandets stemme. boilerplate: kort 'om os' (ca. 250-270 tegn).",
      "pillars: 4 budskaber (mindst 3) med titel, beskrivelse (ca. 110 tegn) og et konkret proof point.",
    ],
  },
  {
    id: "channels",
    title: "Kanaler",
    fields: "channels[]",
    rules: [
      "4-6 kanaler med evidens eller klar implikation. toneShift siger konkret hvad der ændres ift. kernestemmen, og example er en kort linje i stemmen.",
    ],
  },
  {
    id: "examples",
    title: "Eksempler",
    fields: "examples.*",
    rules: [
      "5 overskrifter, 5 CTA'er, 4 emnelinjer, 3 sociale opslag, 3 annoncetekster. Alt er NYE linjer i stemmen, ikke kopier.",
      "bodyParagraph: 60-90 ord. good/bad: 4 af hver. 'bad' skal være realistiske fejl der bryder et bestemt personlighedstræk, og 'why' peger på træk eller regel.",
    ],
  },
  {
    id: "confidence",
    title: "Datagrundlag",
    fields: "confidence.*",
    rules: [
      "overall er et ærligt tal. notes (kan være lange) beskriver kvaliteten af materialet, konflikter mellem kilder og alt der er antaget eller skønnet frem for dokumenteret.",
      "missingInfo: 4-6 konkrete mangler. sourcesUsed: de tungeste kilder, helst med sidetal.",
    ],
  },
];

/** Prompt block appended to the analysis system prompt. */
export function buildTovQualityGuide() {
  const body = TOV_TEMPLATE_SECTIONS.map(
    (s) => `${s.title} (${s.fields}):\n${s.rules.map((r) => `  - ${r}`).join("\n")}`,
  ).join("\n\n");
  return `Content standard (every analysis follows this, section by section; the numbers are targets, never padding):

${body}

General: be specific and concrete to this brand, never generic marketing filler. Prefer the brand's own words from the material. State clearly what is documented and what is estimated.`;
}
