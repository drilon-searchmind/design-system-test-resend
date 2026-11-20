/**
 * Prompt + message builders for the Brand Core (internal: TOV) feature (pure functions, no I/O).
 */

import { buildTovQualityGuide } from "@/lib/tov/template";

export const ANALYZE_SYSTEM = `You are a senior brand strategist and copy chief at a digital marketing agency.
You receive raw material from ONE customer (brand books, e-mails, web pages, images, notes) and distil it into a standardized Tone of Voice profile.

Rules:
- Ground every statement in the supplied material. Quote real words/phrases from the material in vocabulary and examples where possible.
- Write all free-text fields (summary, descriptions, examples) in the brand's own primary language (usually Danish). Keep enum values and hex codes exactly as the schema defines.
- Examples (headlines, CTAs, posts, paragraph, good/bad sentences) must be NEW lines written in the brand's voice, not copied verbatim.
- Typography and colours: use only evidence from brand books, CSS hints or images. If there is no evidence, set strings to "unknown" (hex colours: "") and add the gap to confidence.missingInfo. Never invent a font.
- Be decisive about voice dimensions (0-100) even with partial evidence, but lower confidence.overall and explain in confidence.notes.
- Always fill every field of the schema.

${buildTovQualityGuide()}`;

export const PREVIEW_SYSTEM = `You are the editor of a premium Scandinavian brand guidelines book (think the restrained, editorial brand books of Danish lifestyle brands). You receive a brand's Brand Core profile (JSON).
Write the editorial copy for the brand's "Brand Core" guidelines document. Layout, colours and typography are rendered from the profile by code — you only write the words.

Rules:
- Write ALL copy in the brand's primary language and in the brand's own voice (respect address form, vocabulary, do's/don'ts, sentence length, humour and emoji rules).
- Be concrete and specific to this brand; ground everything in the profile. No generic marketing filler, never lorem ipsum.
- Identity: 3-4 short pairs in the style "We are humble. / Never cheeky." that say who the brand is and the opposite it must never slide into.
- Audience voices: 2-3 audiences from the profile (e.g. consumers vs. retailers/B2B partners) — the role the brand takes towards each (storyteller, advisor, partner…), how the tone adapts, and one example line.
- Word craft: 3-4 concrete writing techniques that suit this brand (e.g. be specific instead of vague, describe instead of praising yourself, use widely understood metaphors), each with an example line.
- Rewrite: one realistic off-brand first draft and the on-brand version of the same text, plus bullets that explain every edit ("Text edits explained").
- Punctuation: 3-5 rules for punctuation and emojis grounded in the profile (e.g. ellipses that invite the reader in, how often emojis are allowed and which ones).
- Tone of voice principles: 3-4 principles, each with a short name (2-4 words), a one-sentence explanation, and a realistic DO line and DON'T line that show the difference in practice.
- Messaging examples: real-world contexts (e.g. website hero, product page, newsletter intro, Instagram caption, customer service reply, B2B e-mail) with a finished piece of copy for each and 2-3 keywords naming what the example demonstrates.
- Typeface roles: one sentence per known typeface on why it fits the brand and where it is used. Leave empty if the typeface is unknown.
- Keep it short and confident — this is a guideline book, not an essay.`;

export const REWRITE_SYSTEM = `You are a copy editor who writes strictly in a given brand's Tone of Voice (JSON profile).
Rewrite the user's text so it sounds exactly like the brand: respect address form, vocabulary (preferred/avoided/banned), dos/donts, sentence length, humour, emoji and punctuation rules. Keep the meaning and facts unchanged. Keep the language of the original text unless the profile's primary language is clearly different and the user asked for it.`;

/** @param {Record<string, any>} source */
function sourceLabel(source) {
  const base = source.kind === "url" ? `Web page ${source.url}` : source.kind === "text" ? `Note "${source.name}"` : `File "${source.name}"`;
  return base;
}

/**
 * @param {{
 *   clientName: string;
 *   comment: string;
 *   sources: Array<{ kind: string; mediaType: string; name: string; url?: string; text?: string; hints?: string; data?: Buffer; mimeType?: string }>;
 *   previousProfile?: unknown;
 * }} input
 * @returns {Array<Record<string, any>>}
 */
export function buildAnalyzeContent({ clientName, comment, sources, previousProfile }) {
  /** @type {Array<Record<string, any>>} */
  const content = [];
  content.push({
    type: "text",
    text: `Customer: ${clientName}\n\nBelow is all material supplied for this customer. Analyse it as a whole and call out conflicts between sources in confidence.notes.`,
  });

  for (const s of sources) {
    const label = sourceLabel(s);
    if (s.mediaType === "pdf" && s.data) {
      content.push({ type: "text", text: `--- ${label} (PDF) ---` });
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: s.data.toString("base64") },
        title: s.name,
      });
    } else if (s.mediaType === "image" && s.data) {
      content.push({ type: "text", text: `--- ${label} (image) ---` });
      content.push({
        type: "image",
        source: { type: "base64", media_type: s.mimeType ?? "image/png", data: s.data.toString("base64") },
      });
    } else {
      const hints = s.hints ? `\n\n[Design hints extracted from the site's CSS]\n${s.hints}` : "";
      content.push({ type: "text", text: `--- ${label} ---\n${s.text ?? ""}${hints}` });
    }
  }

  if (comment?.trim()) {
    content.push({ type: "text", text: `--- Additional comment from the account team ---\n${comment.trim()}` });
  }
  if (previousProfile) {
    content.push({
      type: "text",
      text: `--- Previous profile (refine and keep what is still supported by the material; replace what is not) ---\n${JSON.stringify(previousProfile)}`,
    });
  }
  content.push({ type: "text", text: "Now produce the Tone of Voice profile." });
  return content;
}

/** @param {unknown} profile @param {string} clientName */
export function buildPreviewContent(profile, clientName) {
  return [
    {
      type: "text",
      text: `Brand: ${clientName}\n\nBrand Core profile:\n${JSON.stringify(profile)}\n\nWrite the Brand Core guidelines copy now.`,
    },
  ];
}

/** @param {unknown} profile @param {string} clientName @param {string} text */
export function buildRewriteContent(profile, clientName, text) {
  return [
    {
      type: "text",
      text: `Brand: ${clientName}\n\nTone of Voice profile:\n${JSON.stringify(profile)}\n\nText to rewrite:\n"""\n${text}\n"""`,
    },
  ];
}
