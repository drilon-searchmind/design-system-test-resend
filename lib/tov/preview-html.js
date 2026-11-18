/**
 * Renders the saved Brand Core preview: a self-contained, print-ready brand guidelines document
 * (cover, contents, essence, tone of voice, language, before/after rewrite, colour, typography, messaging, examples).
 * Structure is modelled on real brand books (DILLING guidelines, Maileg Tone of Voice guide in docs/).
 * Layout is code; the words come from the profile + the model-written editorial copy.
 * Colours inside the document are the CLIENT's brand colours (not the CRM design tokens).
 * Pure function, no I/O. No JavaScript in the output (rendered in a sandboxed iframe).
 */

const PAPER = "#faf8f5";
const INK = "#1c1b19";
const MUTED = "#6d6a64";
const RULE = "#e4e0d8";
const DO_COLOR = "#2f6b4f";
const DONT_COLOR = "#a23b2a";

const LABELS = {
  da: {
    doc: "Brand Core",
    sub: "Brand guidelines",
    contents: "Indhold",
    essence: "Brand essens",
    mission: "Mission",
    positioning: "Positionering",
    values: "Kerneværdier",
    audiences: "Målgrupper",
    story: "Historien",
    voice: "Tone of voice",
    principles: "Principper",
    do: "Gør",
    dont: "Undgå",
    scales: "Tonen i skala",
    facts: "Grundregler",
    language: "Sprog & ordvalg",
    preferred: "Ord vi bruger",
    avoided: "Ord vi undgår",
    signature: "Signatur-vendinger",
    banned: "Aldrig",
    terminology: "Terminologi",
    insteadOf: "i stedet for",
    rules: "Skriveregler",
    color: "Farver",
    typography: "Typografi",
    primaryFont: "Primær skrifttype",
    secondaryFont: "Sekundær skrifttype",
    hierarchy: "Hierarki",
    messaging: "Budskaber",
    pitch: "Elevator pitch",
    pillars: "Budskabssøjler",
    inUse: "I brug",
    examples: "Eksempler",
    onBrand: "På brand",
    offBrand: "Ikke på brand",
    headlines: "Overskrifter",
    ctas: "Call to action",
    channels: "Kanaler",
    generated: "Genereret",
    unknownFont: "Ingen dokumenteret skrifttype — systemfont vises",
    identity: "Hvem vi er",
    audienceVoices: "Tonen til hvem",
    wordCraft: "Ordvalg i praksis",
    rewrite: "Fra udkast til brand",
    before: "Før",
    after: "Efter",
    edits: "Rettelser forklaret",
    punctuation: "Tegnsætning & emojis",
    keywords: "Nøgleord",
    updated: "Opdateret",
  },
  en: {
    doc: "Brand Core",
    sub: "Brand guidelines",
    contents: "Contents",
    essence: "Brand essence",
    mission: "Mission",
    positioning: "Positioning",
    values: "Core values",
    audiences: "Audiences",
    story: "Our story",
    voice: "Tone of voice",
    principles: "Principles",
    do: "Do",
    dont: "Don't",
    scales: "Tone on a scale",
    facts: "Ground rules",
    language: "Language & vocabulary",
    preferred: "Words we use",
    avoided: "Words we avoid",
    signature: "Signature phrases",
    banned: "Never",
    terminology: "Terminology",
    insteadOf: "instead of",
    rules: "Writing rules",
    color: "Colour",
    typography: "Typography",
    primaryFont: "Primary typeface",
    secondaryFont: "Secondary typeface",
    hierarchy: "Hierarchy",
    messaging: "Messaging",
    pitch: "Elevator pitch",
    pillars: "Message pillars",
    inUse: "In use",
    examples: "Examples",
    onBrand: "On brand",
    offBrand: "Off brand",
    headlines: "Headlines",
    ctas: "Calls to action",
    channels: "Channels",
    generated: "Generated",
    unknownFont: "No documented typeface — system font shown",
    identity: "Who we are",
    audienceVoices: "Who we talk to",
    wordCraft: "Word choice in practice",
    rewrite: "From draft to brand",
    before: "Before",
    after: "After",
    edits: "Text edits explained",
    punctuation: "Punctuation & emojis",
    keywords: "Keywords",
    updated: "Updated",
  },
};

const DIMENSIONS = {
  da: [
    ["formalCasual", "Formel", "Afslappet"],
    ["seriousPlayful", "Seriøs", "Legende"],
    ["reservedBold", "Afdæmpet", "Modig"],
    ["factualEmotional", "Faktuel", "Følelsesladet"],
    ["simpleTechnical", "Enkel", "Teknisk"],
    ["distantWarm", "Distanceret", "Varm"],
    ["traditionalInnovative", "Traditionel", "Nytænkende"],
  ],
  en: [
    ["formalCasual", "Formal", "Casual"],
    ["seriousPlayful", "Serious", "Playful"],
    ["reservedBold", "Reserved", "Bold"],
    ["factualEmotional", "Factual", "Emotional"],
    ["simpleTechnical", "Simple", "Technical"],
    ["distantWarm", "Distant", "Warm"],
    ["traditionalInnovative", "Traditional", "Innovative"],
  ],
};

const FACTS = {
  da: {
    addressForm: ["Tiltale", { du: "Du", De: "De", you: "You", formal_you: "Formel you", none: "Ingen direkte tiltale" }],
    pointOfView: ["Perspektiv", { we: "Vi", I: "Jeg", third_person: "3. person", you_focused: "Læseren i fokus", mixed: "Blandet" }],
    sentenceLength: ["Sætninger", { short: "Korte", medium: "Mellemlange", long: "Lange", varied: "Varierede" }],
    humor: ["Humor", { none: "Ingen", subtle: "Diskret", regular: "Jævnligt", frequent: "Ofte" }],
    emojiUsage: ["Emojis", { never: "Aldrig", rare: "Sjældent", moderate: "Moderat", frequent: "Ofte" }],
    exclamationUsage: ["Udråbstegn", { never: "Aldrig", rare: "Sjældent", moderate: "Moderat", frequent: "Ofte" }],
  },
  en: {
    addressForm: ["Address", { du: "Du", De: "De", you: "You", formal_you: "Formal you", none: "No direct address" }],
    pointOfView: ["Perspective", { we: "We", I: "I", third_person: "Third person", you_focused: "Reader-focused", mixed: "Mixed" }],
    sentenceLength: ["Sentences", { short: "Short", medium: "Medium", long: "Long", varied: "Varied" }],
    humor: ["Humour", { none: "None", subtle: "Subtle", regular: "Regular", frequent: "Frequent" }],
    emojiUsage: ["Emojis", { never: "Never", rare: "Rarely", moderate: "Moderate", frequent: "Often" }],
    exclamationUsage: ["Exclamation marks", { never: "Never", rare: "Rarely", moderate: "Moderate", frequent: "Often" }],
  },
};

const HIERARCHY = [
  ["h1", "H1"],
  ["h2", "H2"],
  ["h3", "H3"],
  ["body", "Body"],
  ["button", "Button"],
  ["caption", "Caption"],
];

const HIERARCHY_DEFAULTS = {
  h1: { size: "56px", weight: "600", lineHeight: "1.05" },
  h2: { size: "36px", weight: "600", lineHeight: "1.15" },
  h3: { size: "24px", weight: "600", lineHeight: "1.25" },
  body: { size: "17px", weight: "400", lineHeight: "1.6" },
  button: { size: "15px", weight: "600", lineHeight: "1.2" },
  caption: { size: "13px", weight: "400", lineHeight: "1.4" },
};

/* ------------------------------------------------------------------ helpers */

/** @param {unknown} s */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** @param {unknown} v */
const known = (v) => {
  const s = String(v ?? "").trim();
  return s && s.toLowerCase() !== "unknown" ? s : "";
};

/** @param {unknown} v @returns {string} "#rrggbb" or "" */
function hex(v) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v ?? "").trim());
  if (!m) return "";
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${h.toLowerCase()}`;
}

/** @param {string} h */
function rgbOf(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @param {string} h relative luminance 0-1 */
function luminance(h) {
  const [r, g, b] = rgbOf(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {string} a @param {string} b */
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** @param {string} bg */
const onColor = (bg) => (contrast(bg, "#ffffff") >= contrast(bg, INK) ? "#ffffff" : INK);

/** Font family names: letters, digits, spaces and a few safe symbols only. @param {unknown} v */
const cleanFamily = (v) => known(v).replace(/[^\p{L}\p{N} .&'-]/gu, "").trim().slice(0, 60);

/** @param {unknown} v */
const cleanFallbacks = (v) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N} ,'"-]/gu, "")
    .trim()
    .slice(0, 160);

/** @param {{ family?: string; fallbacks?: string }} font @param {string} generic */
function fontStack(font, generic) {
  const family = cleanFamily(font?.family);
  const fallbacks = cleanFallbacks(font?.fallbacks);
  return [family ? `'${family.replace(/'/g, "")}'` : "", fallbacks || generic].filter(Boolean).join(", ");
}

/** CSS lengths/numbers from the profile, or the default. @param {unknown} v @param {RegExp} re @param {string} fallback */
const cssValue = (v, re, fallback) => {
  const s = String(v ?? "").trim();
  return re.test(s) ? s : fallback;
};
const SIZE_RE = /^\d+(\.\d+)?(px|rem|em|pt)$/;
const WEIGHT_RE = /^[1-9]00$/;
const LINE_RE = /^\d+(\.\d+)?(px|rem|em|%)?$/;
const SPACING_RE = /^(normal|-?\d*\.?\d+(px|rem|em))$/;

/** @param {Record<string, any>} s @param {keyof typeof HIERARCHY_DEFAULTS} key */
function textStyle(s, key) {
  const d = HIERARCHY_DEFAULTS[key];
  const size = cssValue(s?.size, SIZE_RE, d.size);
  // Keep huge web H1 sizes within the page
  const px = size.endsWith("px") ? Number.parseFloat(size) : size.endsWith("rem") || size.endsWith("em") ? Number.parseFloat(size) * 16 : 0;
  const safeSize = px > 72 ? "72px" : size;
  return [
    `font-size:${safeSize}`,
    `font-weight:${cssValue(s?.weight, WEIGHT_RE, d.weight)}`,
    `line-height:${cssValue(s?.lineHeight, LINE_RE, d.lineHeight)}`,
    `letter-spacing:${cssValue(s?.letterSpacing, SPACING_RE, "normal")}`,
    `text-transform:${["uppercase", "lowercase", "capitalize"].includes(s?.textTransform) ? s.textTransform : "none"}`,
  ].join(";");
}

/** @param {Array<unknown>} items */
const nonEmpty = (items) => (Array.isArray(items) ? items.map((x) => String(x ?? "").trim()).filter(Boolean) : []);

/** @param {string[]} items @param {string} [cls] */
const chips = (items, cls = "") =>
  items.length ? `<div class="chips">${items.map((w) => `<span class="chip ${cls}">${esc(w)}</span>`).join("")}</div>` : `<p class="muted">—</p>`;

/** @param {string} family */
function googleFontHref(family) {
  return `https://fonts.googleapis.com/css?family=${encodeURIComponent(family).replace(/%20/g, "+")}:300,400,500,600,700&display=swap`;
}

/* --------------------------------------------------------------- document */

/**
 * @param {{
 *   profile: Record<string, any>;
 *   copy: Record<string, any>;
 *   brandName: string;
 *   domain?: string;
 *   generatedAt?: Date;
 * }} input
 * @returns {string}
 */
export function renderBrandCoreDocument({ profile: p, copy, brandName, domain = "", generatedAt = new Date() }) {
  const lang = String(p.voice?.primaryLanguage ?? "").toLowerCase().startsWith("en") ? "en" : "da";
  const L = LABELS[lang];
  const name = known(p.brand?.name) || brandName || "Brand";

  /* colours */
  const paper = hex(p.colors?.background) && luminance(hex(p.colors.background)) > 0.75 ? hex(p.colors.background) : PAPER;
  const ink = hex(p.colors?.text) && contrast(hex(p.colors.text), paper) >= 7 ? hex(p.colors.text) : INK;
  const primary = hex(p.colors?.primary) || ink;
  const accent = hex(p.colors?.accent) && contrast(hex(p.colors.accent), paper) >= 3 ? hex(p.colors.accent) : primary;
  const accentText = contrast(accent, paper) >= 3 ? accent : ink;
  const coverText = onColor(primary);

  /** @type {Array<{ name: string; hex: string; role: string }>} */
  const palette = [];
  const seen = new Set();
  const addSwatch = (h, nm, role) => {
    const v = hex(h);
    if (!v || seen.has(v)) return;
    seen.add(v);
    palette.push({ hex: v, name: String(nm ?? "").trim(), role: String(role ?? "").trim() });
  };
  for (const c of p.colors?.palette ?? []) addSwatch(c.hex, c.name, c.role);
  addSwatch(p.colors?.primary, lang === "en" ? "Primary" : "Primær", "");
  addSwatch(p.colors?.secondary, lang === "en" ? "Secondary" : "Sekundær", "");
  addSwatch(p.colors?.accent, "Accent", "");
  addSwatch(p.colors?.background, lang === "en" ? "Background" : "Baggrund", "");
  addSwatch(p.colors?.text, lang === "en" ? "Text" : "Tekst", "");

  /* type */
  const headFamily = cleanFamily(p.typography?.primaryFont?.family);
  const bodyFamily = cleanFamily(p.typography?.secondaryFont?.family);
  const headStack = fontStack(p.typography?.primaryFont, "Georgia, 'Times New Roman', serif");
  const bodyStack = bodyFamily ? fontStack(p.typography?.secondaryFont, "system-ui, -apple-system, 'Segoe UI', sans-serif") : "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  const fontLinks = [
    [headFamily, p.typography?.primaryFont?.source],
    [bodyFamily, p.typography?.secondaryFont?.source],
  ]
    .filter(([fam, src]) => fam && /google/i.test(String(src ?? "")))
    .map(([fam]) => `<link rel="stylesheet" href="${esc(googleFontHref(String(fam)))}">`);

  const host = String(domain ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  const dateLabel = generatedAt.toLocaleDateString(lang === "en" ? "en-GB" : "da-DK", { day: "numeric", month: "long", year: "numeric" });

  /* sections (only those with content) */
  const sections = [];
  let page = 2;
  /** @param {string} title @param {string} body @param {string} [intro] */
  const section = (title, body, intro = "") => {
    page += 1;
    const no = String(sections.length + 1).padStart(2, "0");
    sections.push({ no, title, page });
    return `
<section class="page">
  <header class="sec-head">
    <p class="eyebrow">${no} — ${esc(title)}</p>
    <h2 class="display">${esc(title)}</h2>
    ${intro ? `<p class="lede">${esc(intro)}</p>` : ""}
  </header>
  ${body}
  <footer class="folio"><span>${esc(name)} · ${esc(L.doc)} · ${esc(L.updated)} ${esc(dateLabel)}</span><span>${String(page).padStart(2, "0")}</span></footer>
</section>`;
  };

  const values = nonEmpty(p.brand?.coreValues);
  const audiences = (p.brand?.audiences ?? []).filter((a) => known(a?.name));
  const essenceHtml = section(
    L.essence,
    `
  ${copy.essence ? `<blockquote class="statement">${esc(copy.essence)}</blockquote>` : ""}
  <div class="grid two">
    ${known(p.brand?.mission) ? `<div><p class="label">${L.mission}</p><p>${esc(p.brand.mission)}</p></div>` : ""}
    ${known(p.brand?.positioning) ? `<div><p class="label">${L.positioning}</p><p>${esc(p.brand.positioning)}</p></div>` : ""}
  </div>
  ${
    values.length ?
      `<p class="label">${L.values}</p><ol class="values">${values.map((v, i) => `<li><span class="num">${String(i + 1).padStart(2, "0")}</span>${esc(v)}</li>`).join("")}</ol>`
    : ""
  }
  ${
    audiences.length ?
      `<p class="label">${L.audiences}</p><div class="grid three">${audiences.map((a) => `<div class="card"><h4>${esc(a.name)}</h4><p class="muted">${esc(a.description)}</p></div>`).join("")}</div>`
    : ""
  }
  ${copy.brandStory ? `<div class="story"><p class="label">${L.story}</p><p class="big">${esc(copy.brandStory)}</p></div>` : ""}`,
  );

  const principles = (copy.principles ?? []).filter((x) => known(x?.name));
  const identity = (copy.identity ?? []).filter((x) => known(x?.weAre));
  const audienceVoices = (copy.audienceVoices ?? []).filter((x) => known(x?.audience));
  const traits = (p.voice?.personality ?? []).filter((t) => known(t?.trait));
  const facts = Object.entries(FACTS[lang])
    .map(([key, [label, map]]) => [label, map[p.voice?.[key]] ?? ""])
    .filter(([, v]) => v);
  const voiceHtml = section(
    L.voice,
    `
  ${
    identity.length ?
      `<p class="label first">${L.identity}</p><div class="identity">${identity
        .map((x) => `<div class="pair"><p class="we">${esc(x.weAre)}</p>${known(x.never) ? `<p class="never">${esc(x.never)}</p>` : ""}</div>`)
        .join("")}</div>`
    : ""
  }
  ${
    traits.length ?
      `<div class="traits">${traits.map((t) => `<div class="trait"><h3>${esc(t.trait)}</h3><p class="muted">${esc(t.description)}</p></div>`).join("")}</div>`
    : ""
  }
  ${
    principles.length ?
      `<p class="label">${L.principles}</p>
  <div class="principles">${principles
    .map(
      (x, i) => `
    <article class="principle">
      <div class="principle-head"><span class="num">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(x.name)}</h3><p class="muted">${esc(x.description)}</p></div></div>
      <div class="dodont">
        <div class="do"><p class="tag">✓ ${L.do}</p><p>“${esc(x.doExample)}”</p></div>
        <div class="dont"><p class="tag">✕ ${L.dont}</p><p>“${esc(x.dontExample)}”</p></div>
      </div>
    </article>`,
    )
    .join("")}</div>`
    : ""
  }
  ${
    audienceVoices.length ?
      `<p class="label">${L.audienceVoices}</p><div class="grid three">${audienceVoices
        .map(
          (a) =>
            `<div class="card"><p class="ctx">${esc(a.role)}</p><h4>${esc(a.audience)}</h4><p>${esc(a.guidance)}</p>${known(a.example) ? `<p class="quote small-quote">“${esc(a.example)}”</p>` : ""}</div>`,
        )
        .join("")}</div>`
    : ""
  }
  <div class="grid two top">
    <div>
      <p class="label">${L.scales}</p>
      ${DIMENSIONS[lang]
        .map(([key, left, right]) => {
          const v = Math.min(100, Math.max(0, Number(p.voice?.dimensions?.[key]) || 0));
          return `<div class="scale"><span>${left}</span><div class="track"><i style="left:${v}%"></i></div><span>${right}</span></div>`;
        })
        .join("")}
    </div>
    ${
      facts.length ?
        `<div><p class="label">${L.facts}</p><dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`
      : ""
    }
  </div>`,
    known(p.voice?.summary),
  );

  const terminology = (p.vocabulary?.terminology ?? []).filter((t) => known(t?.term));
  const dos = nonEmpty(p.style?.dos);
  const donts = nonEmpty(p.style?.donts);
  const wordCraft = (copy.wordCraft ?? []).filter((w) => known(w?.technique));
  const punctuation = (copy.punctuation ?? []).filter((x) => known(x?.mark));
  const languageHtml = section(
    L.language,
    `
  <div class="grid two">
    <div><p class="label">${L.preferred}</p>${chips(nonEmpty(p.vocabulary?.preferredWords), "ok")}</div>
    <div><p class="label">${L.avoided}</p>${chips(nonEmpty(p.vocabulary?.avoidedWords), "bad")}</div>
    <div><p class="label">${L.signature}</p>${chips(nonEmpty(p.vocabulary?.signaturePhrases))}</div>
    <div><p class="label">${L.banned}</p>${chips(nonEmpty(p.vocabulary?.bannedPhrases), "bad")}</div>
  </div>
  ${
    terminology.length ?
      `<p class="label">${L.terminology}</p><table class="table"><tbody>${terminology
        .map((t) => `<tr><th>${esc(t.term)}</th><td>${esc(t.use)}</td><td class="muted">${t.insteadOf ? `${L.insteadOf} <s>${esc(t.insteadOf)}</s>` : ""}</td></tr>`)
        .join("")}</tbody></table>`
    : ""
  }
  ${
    dos.length || donts.length ?
      `<p class="label">${L.rules}</p><div class="dodont wide">
    <div class="do"><p class="tag">✓ ${L.do}</p><ul>${dos.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
    <div class="dont"><p class="tag">✕ ${L.dont}</p><ul>${donts.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
  </div>`
    : ""
  }
  ${
    wordCraft.length ?
      `<p class="label">${L.wordCraft}</p><div class="grid two">${wordCraft
        .map(
          (w, i) =>
            `<div class="craft"><span class="num">${String(i + 1).padStart(2, "0")}</span><h4>${esc(w.technique)}</h4><p class="muted">${esc(w.explanation)}</p>${known(w.example) ? `<p class="quote">“${esc(w.example)}”</p>` : ""}</div>`,
        )
        .join("")}</div>`
    : ""
  }
  ${
    punctuation.length ?
      `<p class="label">${L.punctuation}</p><table class="table"><tbody>${punctuation
        .map((x) => `<tr><th>${esc(x.mark)}</th><td>${esc(x.use)}</td><td class="muted">${known(x.example) ? `“${esc(x.example)}”` : ""}</td></tr>`)
        .join("")}</tbody></table>`
    : ""
  }`,
  );

  const rewrite = copy.rewrite ?? {};
  const rewriteEdits = nonEmpty(rewrite.edits);
  const rewriteHtml =
    known(rewrite.before) && known(rewrite.after) ?
      section(
        L.rewrite,
        `
  ${known(rewrite.context) ? `<p class="ctx">${esc(rewrite.context)}</p>` : ""}
  <div class="dodont wide rewrite">
    <div class="dont"><p class="tag">✕ ${L.before}</p><p class="quote">“${esc(rewrite.before)}”</p></div>
    <div class="do"><p class="tag">✓ ${L.after}</p><p class="quote">“${esc(rewrite.after)}”</p></div>
  </div>
  ${
    rewriteEdits.length ?
      `<p class="label">${L.edits}</p><ol class="edits">${rewriteEdits.map((e) => `<li>${esc(e)}</li>`).join("")}</ol>`
    : ""
  }`,
      )
    : "";

  const colorHtml =
    palette.length ?
      section(
        L.color,
        `
  <div class="swatches">${palette
    .map((c, i) => {
      const fg = onColor(c.hex);
      const [r, g, b] = rgbOf(c.hex);
      return `<figure class="swatch${i === 0 ? " lead" : ""}" style="background:${c.hex};color:${fg}">
      <figcaption>
        <strong>${esc(c.name || c.role || "—")}</strong>
        ${c.role && c.name ? `<span>${esc(c.role)}</span>` : ""}
        <span class="codes">HEX ${c.hex.toUpperCase()}<br>RGB ${r} ${g} ${b}</span>
      </figcaption>
    </figure>`;
    })
    .join("")}</div>`,
        known(copy.colorNotes),
      )
    : "";

  const typeHtml = section(
    L.typography,
    `
  <div class="grid two">
    <div class="specimen">
      <p class="label">${L.primaryFont}</p>
      <p class="aa" style="font-family:${esc(headStack)}">Aa</p>
      <h3 style="font-family:${esc(headStack)}">${esc(headFamily || L.unknownFont)}</h3>
      ${headFamily && known(copy.primaryFontRole) ? `<p class="role">${esc(copy.primaryFontRole)}</p>` : ""}
      <p class="glyphs" style="font-family:${esc(headStack)}">ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ<br>abcdefghijklmnopqrstuvwxyzæøå<br>0123456789 &amp;@!?</p>
      <p class="muted small">${esc([p.typography?.primaryFont?.source, p.typography?.primaryFont?.fallbacks].map(known).filter(Boolean).join(" · "))}</p>
    </div>
    <div class="specimen">
      <p class="label">${L.secondaryFont}</p>
      <p class="aa" style="font-family:${esc(bodyStack)}">Aa</p>
      <h3 style="font-family:${esc(bodyStack)}">${esc(bodyFamily || L.unknownFont)}</h3>
      ${bodyFamily && known(copy.secondaryFontRole) ? `<p class="role">${esc(copy.secondaryFontRole)}</p>` : ""}
      <p class="glyphs" style="font-family:${esc(bodyStack)}">ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ<br>abcdefghijklmnopqrstuvwxyzæøå<br>0123456789 &amp;@!?</p>
      <p class="muted small">${esc([p.typography?.secondaryFont?.source, p.typography?.secondaryFont?.fallbacks].map(known).filter(Boolean).join(" · "))}</p>
    </div>
  </div>
  <p class="label">${L.hierarchy}</p>
  <div class="hierarchy">${HIERARCHY.map(([key, label]) => {
    const s = p.typography?.[key] ?? {};
    const stack = key === "body" || key === "caption" ? bodyStack : headStack;
    const sample =
      key === "body" ? copy.brandStory || p.examples?.bodyParagraph || name
      : key === "button" ? nonEmpty(p.examples?.ctas)[0] || name
      : key === "caption" ? copy.coverLine || name
      : nonEmpty(p.examples?.headlines)[HIERARCHY.findIndex(([k]) => k === key)] || copy.coverLine || name;
    const spec = [known(s.size), known(s.weight), known(s.lineHeight) && `/ ${s.lineHeight}`].filter(Boolean).join(" ");
    return `<div class="h-row"><span class="h-meta">${label}<br><em>${esc(spec || "—")}</em></span><p class="h-sample" style="font-family:${esc(stack)};${textStyle(s, /** @type {any} */ (key))}">${esc(sample)}</p></div>`;
  }).join("")}</div>`,
    known(copy.typographyNotes),
  );

  const pillars = (p.messaging?.pillars ?? []).filter((m) => known(m?.title));
  const messaging = (copy.messaging ?? []).filter((m) => known(m?.text));
  const messagingHtml = section(
    L.messaging,
    `
  ${known(p.messaging?.elevatorPitch) ? `<blockquote class="statement">${esc(p.messaging.elevatorPitch)}</blockquote>` : ""}
  ${
    pillars.length ?
      `<p class="label">${L.pillars}</p><div class="grid three">${pillars
        .map((m, i) => `<div class="card"><span class="num">${String(i + 1).padStart(2, "0")}</span><h4>${esc(m.title)}</h4><p>${esc(m.description)}</p>${m.proof ? `<p class="muted small">${esc(m.proof)}</p>` : ""}</div>`)
        .join("")}</div>`
    : ""
  }
  ${
    messaging.length ?
      `<p class="label">${L.inUse}</p><div class="usage">${messaging
        .map((m) => {
          const keywords = nonEmpty(m.keywords);
          return `<div class="use"><div><p class="ctx">${esc(m.context)}</p>${
            keywords.length ? `<p class="kw"><span>${L.keywords}:</span> ${keywords.map(esc).join(", ")}</p>` : ""
          }</div><p class="line">${esc(m.text)}</p></div>`;
        })
        .join("")}</div>`
    : ""
  }`,
    known(p.messaging?.boilerplate),
  );

  const good = (p.examples?.good ?? []).filter((e) => known(e?.text));
  const bad = (p.examples?.bad ?? []).filter((e) => known(e?.text));
  const headlines = nonEmpty(p.examples?.headlines);
  const ctas = nonEmpty(p.examples?.ctas);
  const channels = (p.channels ?? []).filter((c) => known(c?.example));
  const examplesHtml = section(
    L.examples,
    `
  <div class="dodont wide">
    <div class="do"><p class="tag">✓ ${L.onBrand}</p>${good.map((e) => `<p class="quote">“${esc(e.text)}”</p><p class="muted small">${esc(e.why)}</p>`).join("")}</div>
    <div class="dont"><p class="tag">✕ ${L.offBrand}</p>${bad.map((e) => `<p class="quote">“${esc(e.text)}”</p><p class="muted small">${esc(e.why)}</p>`).join("")}</div>
  </div>
  <div class="grid two top">
    ${headlines.length ? `<div><p class="label">${L.headlines}</p><ul class="lines">${headlines.map((h) => `<li class="head">${esc(h)}</li>`).join("")}</ul></div>` : ""}
    ${ctas.length ? `<div><p class="label">${L.ctas}</p><div class="ctas">${ctas.map((c) => `<span class="btn">${esc(c)}</span>`).join("")}</div></div>` : ""}
  </div>
  ${
    channels.length ?
      `<p class="label">${L.channels}</p><div class="grid three">${channels
        .map((c) => `<div class="card"><p class="ctx">${esc(c.channel)}</p><p>${esc(c.example)}</p><p class="muted small">${esc(c.toneShift)}</p></div>`)
        .join("")}</div>`
    : ""
  }`,
  );

  const contentsHtml = `
<section class="page contents">
  <header class="sec-head"><p class="eyebrow">${esc(name)} — ${esc(L.doc)}</p><h2 class="display">${L.contents}</h2></header>
  <ol class="toc">${sections.map((s) => `<li><span class="num">${s.no}</span><span class="toc-title">${esc(s.title)}</span><span class="toc-page">${String(s.page).padStart(2, "0")}</span></li>`).join("")}</ol>
  ${copy.coverLine ? `<p class="toc-line">${esc(copy.coverLine)}</p>` : ""}
  <footer class="folio"><span>${esc(name)} · ${esc(L.doc)}</span><span>02</span></footer>
</section>`;

  const cover = `
<section class="page cover">
  <div class="cover-top">
    <div class="mark">
      <span class="mark-initials">${esc(initials)}</span>
      ${host ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&amp;sz=128" alt="">` : ""}
    </div>
    <p class="cover-kicker">${esc(L.doc)} · ${esc(L.sub)}</p>
  </div>
  <div class="cover-main">
    <h1>${esc(name)}</h1>
    ${known(p.brand?.tagline) ? `<p class="cover-tagline">${esc(p.brand.tagline)}</p>` : ""}
    ${copy.coverLine ? `<p class="cover-line">${esc(copy.coverLine)}</p>` : ""}
  </div>
  <div class="cover-foot"><span>${esc(host)}</span><span>${esc(L.generated)} ${esc(dateLabel)}</span></div>
</section>`;

  const title = known(copy.title) || `${name} ${L.doc}`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${host ? `<link rel="icon" href="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&amp;sz=64">` : ""}
${fontLinks.join("\n")}
<style>
  :root { --paper:${paper}; --ink:${ink}; --muted:${MUTED}; --rule:${RULE}; --primary:${primary}; --on-primary:${coverText}; --accent:${accentText}; --do:${DO_COLOR}; --dont:${DONT_COLOR}; --head:${headStack}; --body:${bodyStack}; }
  * { box-sizing:border-box; }
  html, body { margin:0; }
  body { background:#e8e5df; color:var(--ink); font-family:var(--body); font-size:16px; line-height:1.6; -webkit-font-smoothing:antialiased; padding:32px 16px; }
  .page { position:relative; max-width:1120px; aspect-ratio:297/210; margin:0 auto 32px; background:var(--paper); padding:88px 96px 104px; box-shadow:0 1px 2px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.08); }
  h1, h2, h3, h4 { font-family:var(--head); margin:0; font-weight:600; letter-spacing:-0.01em; }
  p { margin:0 0 12px; }
  .muted { color:var(--muted); }
  .small { font-size:13px; }
  .eyebrow, .label, .tag, .ctx, .cover-kicker { font-family:var(--body); font-size:11px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; }
  .eyebrow { color:var(--accent); margin-bottom:20px; }
  .label { color:var(--muted); margin:48px 0 16px; padding-top:16px; border-top:1px solid var(--rule); }
  .display { font-size:clamp(40px, 6vw, 64px); line-height:1.02; }
  .lede { max-width:720px; margin-top:28px; font-size:20px; line-height:1.55; color:var(--ink); }
  .sec-head { margin-bottom:48px; }
  .folio { position:absolute; left:96px; right:96px; bottom:40px; display:flex; justify-content:space-between; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); border-top:1px solid var(--rule); padding-top:14px; }
  .grid { display:grid; gap:32px 48px; }
  .grid.two { grid-template-columns:repeat(2, minmax(0,1fr)); }
  .grid.three { grid-template-columns:repeat(3, minmax(0,1fr)); gap:20px; }
  .grid.top { margin-top:8px; }
  .grid .label { margin-top:24px; }
  .card { border:1px solid var(--rule); padding:24px; background:rgba(255,255,255,.45); }
  .card h4 { font-size:19px; margin:6px 0 8px; }
  .num { font-family:var(--body); font-size:12px; font-weight:600; color:var(--accent); letter-spacing:.08em; }
  .statement { margin:0 0 16px; font-family:var(--head); font-size:clamp(26px, 3.2vw, 36px); line-height:1.25; max-width:880px; border-left:3px solid var(--primary); padding-left:28px; }
  .big { font-size:19px; line-height:1.65; max-width:760px; }
  .values { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:0; border-top:1px solid var(--rule); }
  .values li { font-family:var(--head); font-size:22px; padding:20px 16px 20px 0; border-bottom:1px solid var(--rule); display:flex; gap:14px; align-items:baseline; }
  .traits { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:28px; margin-bottom:8px; }
  .trait h3 { font-size:24px; margin-bottom:8px; }
  .principles { display:grid; gap:20px; }
  .principle { border-top:1px solid var(--rule); padding-top:20px; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.3fr); gap:32px; }
  .principle-head { display:flex; gap:16px; }
  .principle-head h3 { font-size:22px; margin-bottom:6px; }
  .dodont { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .dodont.wide { gap:24px; }
  .do, .dont { padding:18px 20px; background:rgba(255,255,255,.55); border-top:3px solid var(--do); }
  .dont { border-top-color:var(--dont); }
  .do .tag { color:var(--do); } .dont .tag { color:var(--dont); }
  .do p:last-child, .dont p:last-child { margin-bottom:0; }
  .do ul, .dont ul { margin:0; padding-left:18px; } .do li, .dont li { margin-bottom:6px; }
  .quote { font-family:var(--head); font-size:18px; line-height:1.4; margin:14px 0 4px; }
  .scale { display:grid; grid-template-columns:100px 1fr 100px; align-items:center; gap:14px; font-size:13px; color:var(--muted); margin-bottom:14px; }
  .scale span:last-child { text-align:right; }
  .track { position:relative; height:1px; background:var(--ink); opacity:.9; }
  .track i { position:absolute; top:50%; width:13px; height:13px; border-radius:50%; background:var(--primary); border:2px solid var(--paper); box-shadow:0 0 0 1px var(--primary); transform:translate(-50%,-50%); }
  .facts { margin:0; display:grid; grid-template-columns:1fr 1fr; gap:0 24px; }
  .facts div { border-bottom:1px solid var(--rule); padding:10px 0; }
  .facts dt { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
  .facts dd { margin:2px 0 0; font-family:var(--head); font-size:18px; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { border:1px solid var(--rule); border-radius:999px; padding:5px 14px; font-size:14px; background:rgba(255,255,255,.6); }
  .chip.ok { border-color:var(--do); color:var(--do); }
  .chip.bad { border-color:var(--dont); color:var(--dont); text-decoration:line-through; text-decoration-thickness:1px; }
  .table { width:100%; border-collapse:collapse; font-size:15px; }
  .table th, .table td { text-align:left; padding:12px 16px 12px 0; border-bottom:1px solid var(--rule); vertical-align:top; }
  .table th { font-family:var(--head); font-weight:600; width:24%; }
  .swatches { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px,1fr)); gap:16px; }
  .swatch { margin:0; min-height:220px; padding:20px; display:flex; align-items:flex-end; border:1px solid rgba(0,0,0,.06); }
  .swatch.lead { grid-column:span 2; min-height:280px; }
  .swatch figcaption { display:flex; flex-direction:column; gap:4px; font-size:13px; }
  .swatch strong { font-family:var(--head); font-size:20px; font-weight:600; }
  .swatch .codes { margin-top:10px; font-size:12px; letter-spacing:.06em; opacity:.85; }
  .specimen .aa { font-size:140px; line-height:1; margin:0 0 12px; }
  .specimen h3 { font-size:26px; margin-bottom:12px; }
  .glyphs { font-size:17px; line-height:1.7; word-break:break-all; }
  .hierarchy { border-top:1px solid var(--rule); }
  .h-row { display:grid; grid-template-columns:120px 1fr; gap:24px; padding:18px 0; border-bottom:1px solid var(--rule); align-items:baseline; }
  .h-meta { font-size:12px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
  .h-meta em { font-style:normal; font-weight:400; letter-spacing:0; text-transform:none; }
  .h-sample { margin:0; overflow-wrap:anywhere; }
  .usage { display:grid; gap:0; border-top:1px solid var(--rule); }
  .use { display:grid; grid-template-columns:200px 1fr; gap:24px; padding:20px 0; border-bottom:1px solid var(--rule); }
  .ctx { color:var(--accent); margin:4px 0 0; }
  .line { font-family:var(--head); font-size:22px; line-height:1.35; margin:0; }
  .lines { list-style:none; padding:0; margin:0; } .lines li { font-family:var(--head); font-size:20px; line-height:1.3; padding:10px 0; border-bottom:1px solid var(--rule); }
  .ctas { display:flex; flex-wrap:wrap; gap:10px; }
  .btn { display:inline-block; background:var(--primary); color:var(--on-primary); padding:12px 22px; font-weight:600; font-size:14px; border-radius:${esc(cssValue(p.visual?.cornerRadius, /^\d+(\.\d+)?(px|rem|em|%)$/, "2px"))}; }
  .cover { background:var(--primary); color:var(--on-primary); display:flex; flex-direction:column; justify-content:space-between; }
  .cover-top { display:flex; justify-content:space-between; align-items:center; }
  .cover-kicker { opacity:.85; margin:0; }
  .mark { position:relative; width:72px; height:72px; border-radius:16px; background:#fff; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.12); }
  .mark-initials { font-family:var(--head); font-weight:700; font-size:26px; color:${contrast(primary, "#ffffff") >= 3 ? primary : INK}; }
  .mark img { position:absolute; inset:12px; width:48px; height:48px; object-fit:contain; background:#fff; }
  .cover h1 { font-size:clamp(56px, 10vw, 128px); line-height:.95; letter-spacing:-0.03em; }
  .cover-tagline { font-family:var(--head); font-size:clamp(20px, 2.4vw, 28px); margin-top:24px; opacity:.92; }
  .cover-line { max-width:620px; font-size:18px; margin-top:16px; opacity:.8; }
  .cover-foot { display:flex; justify-content:space-between; font-size:12px; letter-spacing:.14em; text-transform:uppercase; opacity:.8; border-top:1px solid currentColor; padding-top:16px; }
  .toc { list-style:none; margin:0; padding:0; border-top:1px solid var(--rule); max-width:820px; }
  .toc li { display:grid; grid-template-columns:64px 1fr auto; padding:18px 0; border-bottom:1px solid var(--rule); align-items:baseline; }
  .toc-title { font-family:var(--head); font-size:26px; }
  .toc-page { font-size:13px; color:var(--muted); }
  .toc-line { margin-top:56px; max-width:620px; font-family:var(--head); font-size:22px; color:var(--muted); }
  .story { margin-top:8px; }
  .label.first { margin-top:0; }
  .identity { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:0; border-top:1px solid var(--rule); margin-bottom:8px; }
  .pair { padding:22px 20px 22px 0; border-bottom:1px solid var(--rule); }
  .pair .we { font-family:var(--head); font-size:26px; line-height:1.2; margin:0 0 6px; }
  .pair .never { font-family:var(--head); font-size:20px; line-height:1.25; color:var(--muted); font-style:italic; margin:0; }
  .small-quote { font-size:16px; }
  .craft { border-top:1px solid var(--rule); padding-top:16px; }
  .craft h4 { font-size:20px; margin:6px 0 6px; }
  .rewrite .quote { font-size:20px; line-height:1.45; }
  .edits { margin:0; padding-left:22px; max-width:820px; } .edits li { padding:6px 0; border-bottom:1px solid var(--rule); }
  .kw { font-size:12px; color:var(--muted); margin:8px 0 0; } .kw span { font-weight:600; }
  .role { font-size:14px; line-height:1.5; color:var(--muted); max-width:420px; }
  @media (max-width: 760px) {
    body { padding:0; background:var(--paper); }
    .page { aspect-ratio:auto; padding:48px 24px 88px; margin:0; box-shadow:none; border-bottom:1px solid var(--rule); }
    .folio { left:24px; right:24px; bottom:28px; }
    .grid.two, .grid.three, .dodont, .principle, .facts, .use, .h-row { grid-template-columns:1fr; }
    .swatch.lead { grid-column:auto; }
    .specimen .aa { font-size:96px; }
    .cover { min-height:100vh; }
  }
  @media print {
    @page { size:A4 landscape; margin:0; }
    body { background:none; padding:0; }
    .page { margin:0; box-shadow:none; break-after:page; max-width:none; width:297mm; min-height:210mm; aspect-ratio:auto; }
    .cover, .swatch, .btn, .track i { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>
${cover}
${contentsHtml}
${essenceHtml}
${voiceHtml}
${languageHtml}
${rewriteHtml}
${colorHtml}
${typeHtml}
${messagingHtml}
${examplesHtml}
</body>
</html>`;
}
