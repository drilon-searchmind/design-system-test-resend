/**
 * Prompt + message builders for the Tone of Voice feature (pure functions, no I/O).
 */

export const ANALYZE_SYSTEM = `You are a senior brand strategist and copy chief at a digital marketing agency.
You receive raw material from ONE customer (brand books, e-mails, web pages, images, notes) and distil it into a standardized Tone of Voice profile.

Rules:
- Ground every statement in the supplied material. Quote real words/phrases from the material in vocabulary and examples where possible.
- Write all free-text fields (summary, descriptions, examples) in the brand's own primary language (usually Danish). Keep enum values and hex codes exactly as the schema defines.
- Examples (headlines, CTAs, posts, paragraph, good/bad sentences) must be NEW lines written in the brand's voice, not copied verbatim.
- Typography and colours: use only evidence from brand books, CSS hints or images. If there is no evidence, set strings to "unknown" (hex colours: "") and add the gap to confidence.missingInfo. Never invent a font.
- Be decisive about voice dimensions (0-100) even with partial evidence, but lower confidence.overall and explain in confidence.notes.
- Always fill every field of the schema.`;

export const PREVIEW_SYSTEM = `You are a front-end designer and copywriter. You receive a brand's Tone of Voice profile (JSON).
Produce ONE complete, self-contained HTML document that previews the brand: a realistic sample landing page (hero with headline + sub-headline + CTA, 3 benefit cards, a short testimonial/quote block, a short about paragraph, a footer) and a small sample e-mail block below it.

Rules:
- Apply typography (families, sizes, weights, line heights, letter spacing, text transform), colours, button style and corner radius from the profile exactly. If a font family is "unknown", use a sensible system stack.
- If a font is a Google Font, include its <link> in <head>; always add a fallback stack.
- Write ALL copy fresh in the brand's voice and primary language, following the profile's vocabulary, do's/don'ts, address form, sentence length, humour and emoji rules. Use plausible placeholder content (invented but realistic), never lorem ipsum.
- No JavaScript, no external images (use CSS gradients/solid blocks or inline SVG shapes instead), all CSS inline in a <style> tag, responsive up to 1100px wide.
- Return a full document starting with <!doctype html>.`;

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
      text: `Brand: ${clientName}\n\nTone of Voice profile:\n${JSON.stringify(profile)}\n\nGenerate the HTML preview now.`,
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
