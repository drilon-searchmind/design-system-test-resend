import { plainTextFromHtml } from "@/lib/crm/knowledge-utils";
import { callClaudeJson, resolveTovModel } from "@/lib/tov/anthropic";

export const KB_SUMMARY_MAX_CHARS = 240;

const KB_SUMMARY_MODEL = resolveTovModel("claude-sonnet-5-5").id;
const KB_SUMMARY_SOURCE_MAX_CHARS = 12_000;
const KB_SUMMARY_MIN_SOURCE_CHARS = 30;
const KB_SUMMARY_TIMEOUT_MS = 25_000;

const SUMMARY_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  "Du skriver korte resuméer til artikler i et dansk digitalbureaus interne knowledge base (wiki).",
  "Skriv 1–2 sætninger på dansk, der fortæller læseren hvad artiklen handler om, og hvornår den er nyttig.",
  `Maks ${KB_SUMMARY_MAX_CHARS} tegn. Ingen markdown, ingen anførselstegn, ingen indledning som "Denne artikel".`,
  "Brug kun information fra artiklen — opfind ikke detaljer.",
].join("\n");

export function isKbSummaryAiConfigured() {
  return Boolean(process.env.CLAUDE_API_KEY);
}

/**
 * @param {string} text
 */
function clampSummary(text) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["'«»“”]+|["'«»“”]+$/g, "")
    .trim();
  if (clean.length <= KB_SUMMARY_MAX_CHARS) return clean;
  const cut = clean.slice(0, KB_SUMMARY_MAX_CHARS);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > KB_SUMMARY_MAX_CHARS * 0.5) return cut.slice(0, sentenceEnd + 1);
  const wordEnd = cut.lastIndexOf(" ");
  return `${cut.slice(0, wordEnd > 0 ? wordEnd : cut.length).replace(/[,;:–-]+$/, "")}…`;
}

/**
 * @param {{ title?: string; bodyMd?: string }} input
 */
export function hasEnoughKbSummarySource(input) {
  const plain = `${String(input.title ?? "").trim()} ${plainTextFromHtml(String(input.bodyMd ?? ""))}`.trim();
  return plain.length >= KB_SUMMARY_MIN_SOURCE_CHARS;
}

/**
 * Generér et kort dansk resumé (1–2 sætninger) med Claude ud fra titel + brødtekst.
 * Kaster fejl hvis Claude ikke er konfigureret/tilgængelig.
 *
 * @param {{ title?: string; bodyMd?: string }} input
 * @returns {Promise<string>}
 */
export async function generateKnowledgeSummary(input) {
  if (!isKbSummaryAiConfigured()) throw new Error("AI-resumé er ikke sat op (CLAUDE_API_KEY mangler)");

  const title = String(input.title ?? "").trim();
  const body = plainTextFromHtml(String(input.bodyMd ?? ""), KB_SUMMARY_SOURCE_MAX_CHARS);
  if (!hasEnoughKbSummarySource({ title, bodyMd: body })) {
    throw new Error("Skriv lidt mere i artiklen, før der kan laves et resumé");
  }

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI-resumé tog for lang tid")), KB_SUMMARY_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      callClaudeJson({
        model: KB_SUMMARY_MODEL,
        system: SYSTEM_PROMPT,
        content: [{ type: "text", text: `Titel: ${title || "(uden titel)"}\n\nBrødtekst:\n${body || "(tom)"}` }],
        schema: SUMMARY_SCHEMA,
        maxTokens: 1024,
      }),
      timeout,
    ]);
    const summary = clampSummary(/** @type {{ json?: { summary?: unknown } }} */ (result)?.json?.summary ?? "");
    if (!summary) throw new Error("AI returnerede et tomt resumé");
    return summary;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bruges ved gem: forsøg AI-resumé, men fejl aldrig — returnér tom streng + besked ved fejl.
 *
 * @param {{ title?: string; bodyMd?: string }} input
 * @returns {Promise<{ summary: string; notice: string | null }>}
 */
export async function tryGenerateKnowledgeSummary(input) {
  if (!hasEnoughKbSummarySource(input)) return { summary: "", notice: null };
  if (!isKbSummaryAiConfigured()) {
    return { summary: "", notice: "Artiklen er gemt uden resumé — AI-resumé er ikke sat op (CLAUDE_API_KEY mangler)." };
  }
  try {
    return { summary: await generateKnowledgeSummary(input), notice: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "ukendt fejl";
    return { summary: "", notice: `Artiklen er gemt uden resumé — AI-resumé fejlede (${reason}).` };
  }
}
