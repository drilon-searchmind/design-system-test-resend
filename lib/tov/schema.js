/**
 * Standardized Brand Core profile (internal name: TOV; "voice" is the tone of voice section).
 *
 * ONE schema for ALL customers. It is the single source of truth for:
 *   - the JSON schema sent to the model (structured output),
 *   - normalisation/defaults of whatever is stored in MongoDB,
 *   - the UI (sections are rendered from this shape).
 *
 * Evolving the schema: add/rename fields here and bump TOV_SCHEMA_VERSION.
 * Old profiles keep working (missing fields are filled with defaults by
 * `normalizeTovProfile`) and are brought fully up to date by re-running the analysis.
 */

export const TOV_SCHEMA_VERSION = 1;

/** @param {string} description */
const str = (description) => ({ type: "string", description });
/** @param {string} description */
const num = (description) => ({ type: "number", description });
/** @param {string[]} values @param {string} description */
const oneOf = (values, description) => ({ type: "string", enum: values, description });
/** @param {any} items @param {string} description */
const list = (items, description) => ({ type: "array", items, description });
/** @param {Record<string, any>} properties @param {string} [description] */
const obj = (properties, description) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
  ...(description ? { description } : {}),
});
/** @param {string} description */
const strList = (description) => list({ type: "string" }, description);

const TEXT_STYLE = (what) =>
  obj(
    {
      size: str(`${what}: font size incl. unit, e.g. "48px" or "3rem". "unknown" if no evidence`),
      weight: str(`${what}: numeric font weight as string, e.g. "700"`),
      lineHeight: str(`${what}: line height, e.g. "1.2"`),
      letterSpacing: str(`${what}: letter spacing, e.g. "-0.02em" or "normal"`),
      textTransform: oneOf(["none", "uppercase", "lowercase", "capitalize"], `${what}: text transform`),
    },
    what,
  );

const DIMENSION = (desc) => num(`0-100. ${desc}`);

export const TOV_PROFILE_SCHEMA = obj({
  brand: obj({
    name: str("Brand / customer name"),
    industry: str("Industry or category"),
    tagline: str("Official tagline/claim, empty string if none"),
    mission: str("Mission or purpose in 1-2 sentences"),
    positioning: str("How the brand positions itself vs. competitors, 1-2 sentences"),
    coreValues: strList("3-6 core brand values"),
    audiences: list(
      obj({ name: str("Audience segment name"), description: str("Who they are and what they care about") }),
      "Target audiences",
    ),
  }),
  voice: obj({
    summary: str("Tone of voice summarised in 2-4 sentences, written for a copywriter"),
    primaryLanguage: str('ISO language code of the brand\'s main language, e.g. "da", "en"'),
    personality: list(
      obj({
        trait: str("Personality trait, 1-2 words"),
        description: str("What this trait means in writing"),
        intensity: DIMENSION("How strongly the trait is expressed"),
      }),
      "4-6 personality traits",
    ),
    dimensions: obj(
      {
        formalCasual: DIMENSION("0 = very formal, 100 = very casual"),
        seriousPlayful: DIMENSION("0 = very serious, 100 = very playful"),
        reservedBold: DIMENSION("0 = reserved/understated, 100 = bold/confident"),
        factualEmotional: DIMENSION("0 = purely factual, 100 = highly emotional"),
        simpleTechnical: DIMENSION("0 = plain everyday language, 100 = technical/expert language"),
        distantWarm: DIMENSION("0 = distant/corporate, 100 = warm/personal"),
        traditionalInnovative: DIMENSION("0 = traditional, 100 = innovative/modern"),
      },
      "Tone sliders",
    ),
    pointOfView: oneOf(["we", "I", "third_person", "you_focused", "mixed"], "Dominant narrative perspective"),
    addressForm: oneOf(["du", "De", "you", "formal_you", "none"], "How the reader is addressed"),
    sentenceLength: oneOf(["short", "medium", "long", "varied"], "Typical sentence length"),
    averageSentenceWords: num("Typical number of words per sentence"),
    readingLevel: oneOf(["very_easy", "easy", "standard", "advanced"], "Reading level"),
    humor: oneOf(["none", "subtle", "regular", "frequent"], "Use of humour"),
    emojiUsage: oneOf(["never", "rare", "moderate", "frequent"], "Emoji usage"),
    exclamationUsage: oneOf(["never", "rare", "moderate", "frequent"], "Exclamation marks"),
    jargonLevel: oneOf(["none", "low", "medium", "high"], "Industry jargon"),
  }),
  vocabulary: obj({
    preferredWords: strList("Words and expressions the brand likes to use"),
    avoidedWords: strList("Words and expressions the brand avoids"),
    signaturePhrases: strList("Recurring phrases typical of the brand"),
    bannedPhrases: strList("Phrases that must never be used"),
    terminology: list(
      obj({ term: str("Preferred term"), use: str("When/how to use it"), insteadOf: str("Term to avoid, empty if none") }),
      "Brand-specific terminology",
    ),
  }),
  style: obj({
    capitalization: oneOf(["sentence_case", "title_case", "mixed"], "Headline capitalization"),
    punctuationNotes: str("Rules for punctuation (commas, dashes, ellipses, etc.)"),
    numberFormat: str('How numbers are written, e.g. "1.000,50" or "1,000.50"'),
    dateFormat: str('Date format, e.g. "16. november 2026"'),
    currencyFormat: str('Currency format, e.g. "1.200 kr."'),
    formattingRules: strList("Formatting rules (lists, bold, headings, length of paragraphs...)"),
    dos: strList("Writing do's"),
    donts: strList("Writing don'ts"),
  }),
  typography: obj({
    primaryFont: obj({
      family: str('Primary (heading) font family, "unknown" if no evidence'),
      fallbacks: str("CSS fallback stack"),
      source: str("Where it comes from (Google Fonts, Adobe, custom, system)"),
    }),
    secondaryFont: obj({
      family: str('Secondary (body) font family, "unknown" if no evidence'),
      fallbacks: str("CSS fallback stack"),
      source: str("Where it comes from"),
    }),
    h1: TEXT_STYLE("Heading 1"),
    h2: TEXT_STYLE("Heading 2"),
    h3: TEXT_STYLE("Heading 3"),
    body: TEXT_STYLE("Body text"),
    button: TEXT_STYLE("Button text"),
    caption: TEXT_STYLE("Caption / small text"),
  }),
  colors: obj({
    primary: str('Primary brand colour as hex, e.g. "#0A3D62"'),
    secondary: str("Secondary brand colour as hex"),
    accent: str("Accent colour as hex"),
    background: str("Default page background colour as hex"),
    text: str("Default text colour as hex"),
    palette: list(
      obj({ name: str("Colour name"), hex: str("Hex value"), role: str("Role, e.g. CTA, background, highlight") }),
      "Full palette",
    ),
  }),
  visual: obj({
    imageryStyle: str("Photography/illustration style"),
    iconStyle: str("Icon style"),
    buttonStyle: str('Buttons: shape, corner radius, fill, e.g. "pill, 999px radius, solid primary"'),
    cornerRadius: str('Typical corner radius, e.g. "8px"'),
    layoutNotes: str("Layout/whitespace density notes"),
  }),
  messaging: obj({
    elevatorPitch: str("Elevator pitch in the brand's voice (2-3 sentences)"),
    boilerplate: str("Short 'about us' paragraph in the brand's voice"),
    pillars: list(
      obj({ title: str("Pillar"), description: str("Message"), proof: str("Proof point or evidence") }),
      "3-5 messaging pillars",
    ),
  }),
  channels: list(
    obj({
      channel: oneOf(["website", "email", "social", "ads", "newsletter", "support", "pr"], "Channel"),
      toneShift: str("How the tone shifts for this channel vs. the core voice"),
      example: str("Short example in the brand's voice for this channel"),
    }),
    "Channel-specific adjustments (only channels with evidence or clear implication)",
  ),
  examples: obj({
    headlines: strList("5 headline examples in the brand's voice"),
    ctas: strList("5 call-to-action examples"),
    emailSubjectLines: strList("4 email subject lines"),
    socialPosts: strList("3 short social posts"),
    adCopy: strList("3 short ad copy examples"),
    bodyParagraph: str("One body paragraph (60-90 words) showing the voice"),
    good: list(
      obj({ text: str("Sentence written ON brand"), why: str("Why it fits") }),
      "3-4 on-brand sentences",
    ),
    bad: list(
      obj({ text: str("Sentence written OFF brand"), why: str("Why it does not fit") }),
      "3-4 off-brand sentences",
    ),
  }),
  confidence: obj({
    overall: num("0-100. How well the supplied material supports this profile"),
    notes: str("Short note about the evidence quality"),
    missingInfo: strList("What material is missing to improve the profile (e.g. 'no typography evidence')"),
    sourcesUsed: strList("Names of the sources that carried the most weight"),
  }),
});

/**
 * Editorial copy for the Brand Core guidelines document (structured output).
 * The HTML itself is rendered from the profile + this copy by lib/tov/preview-html.js.
 */
export const TOV_PREVIEW_SCHEMA = obj({
  title: str('Document title, e.g. "<Brand> Brand Core"'),
  coverLine: str("One-line brand statement for the cover, max 12 words"),
  essence: str("Brand essence: 2-3 sentences that capture why the brand exists and how it should feel"),
  brandStory: str("Short brand story, 60-90 words"),
  identity: list(
    obj({
      weAre: str('What the brand is, as a short statement, e.g. "We are humble."'),
      never: str('The opposite it must never become, e.g. "Never cheeky."'),
    }),
    "3-4 'We are … / Never …' pairs that sum up who the brand is and what it signals",
  ),
  audienceVoices: list(
    obj({
      audience: str("Audience, e.g. 'Consumers' or 'Retailers & partners'"),
      role: str("The role the brand takes towards them, e.g. 'Storyteller' or 'Friendly business partner'"),
      guidance: str("1-2 sentences on how the tone adapts for this audience"),
      example: str("One line of copy written for this audience"),
    }),
    "2-3 audiences and how the voice adapts to each",
  ),
  wordCraft: list(
    obj({
      technique: str("Writing technique, e.g. 'Be concrete', 'Describe, don't praise', 'Familiar metaphors'"),
      explanation: str("One sentence on how and when to use it"),
      example: str("A line of copy showing the technique"),
    }),
    "3-4 word-choice techniques with examples",
  ),
  rewrite: obj(
    {
      context: str("Where the copy is used, e.g. 'Product description'"),
      before: str("A realistic first draft that is OFF brand (2-4 sentences)"),
      after: str("The same text rewritten ON brand"),
      edits: strList("3-5 bullets explaining each edit and why"),
    },
    "Before/after example with the edits explained",
  ),
  punctuation: list(
    obj({
      mark: str("Punctuation mark or element, e.g. 'Ellipsis …', 'Exclamation mark', 'Emojis'"),
      use: str("How the brand uses it (or avoids it)"),
      example: str("Short example, empty string if not relevant"),
    }),
    "3-5 punctuation and emoji rules",
  ),
  principles: list(
    obj({
      name: str("Principle name, 2-4 words"),
      description: str("One sentence explaining the principle"),
      doExample: str("A line of copy that follows the principle"),
      dontExample: str("A line of copy that breaks it"),
    }),
    "3-4 tone of voice principles",
  ),
  messaging: list(
    obj({
      context: str("Where the copy is used, e.g. 'Website hero', 'Newsletter intro'"),
      text: str("Finished copy for that context"),
      keywords: strList("2-3 short keywords on what the example demonstrates, e.g. 'Setting the scene', 'Honesty'"),
    }),
    "4-6 messaging examples",
  ),
  colorNotes: str("1-2 sentences on how the palette should be used"),
  typographyNotes: str("1-2 sentences on how the typefaces should be used"),
  primaryFontRole: str("One sentence on why the primary typeface fits the brand and where it is used; empty string if the font is unknown"),
  secondaryFontRole: str("One sentence on why the secondary typeface fits the brand and where it is used; empty string if the font is unknown"),
});

/** Schema for rewrite-in-tone playground. */
export const TOV_REWRITE_SCHEMA = obj({
  rewritten: str("The text rewritten in the brand's tone of voice"),
  changes: strList("2-5 short bullets: what was changed and why"),
});

/* ------------------------------------------------------------------ normalise */

/** @param {any} v */
const clamp100 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
};

/**
 * Walk a schema and coerce `value` into exactly that shape (no extra keys, no missing keys).
 * @param {any} schema
 * @param {any} value
 * @param {string} path
 * @returns {any}
 */
function coerce(schema, value, path = "") {
  if (schema.type === "object") {
    const src = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    /** @type {Record<string, any>} */
    const out = {};
    for (const [key, sub] of Object.entries(schema.properties)) {
      out[key] = coerce(sub, src[key], `${path}.${key}`);
    }
    return out;
  }
  if (schema.type === "array") {
    return Array.isArray(value) ? value.map((v) => coerce(schema.items, v, `${path}[]`)) : [];
  }
  if (schema.type === "number") {
    // Everything numeric in the profile is a 0-100 slider, except sentence words.
    if (path.endsWith("averageSentenceWords")) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.min(200, Math.max(0, Math.round(n))) : 0;
    }
    return clamp100(value);
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum.includes(value) ? value : schema.enum[0];
  }
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

/** Empty (but fully-shaped) profile — used for new customers and as defaults. */
export function emptyTovProfile() {
  return { schemaVersion: TOV_SCHEMA_VERSION, ...coerce(TOV_PROFILE_SCHEMA, {}) };
}

/**
 * Normalise any stored/returned object to the current schema.
 * @param {unknown} raw
 */
export function normalizeTovProfile(raw) {
  return { schemaVersion: TOV_SCHEMA_VERSION, ...coerce(TOV_PROFILE_SCHEMA, raw) };
}

/** @param {unknown} raw */
export function normalizeTovPreviewCopy(raw) {
  return coerce(TOV_PREVIEW_SCHEMA, raw);
}
