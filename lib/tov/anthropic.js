/**
 * Minimal Anthropic Messages API client (no SDK) for the Tone of Voice feature.
 * Uses structured output (`output_config.format = json_schema`) so the reply is always valid JSON.
 */

/** Models the UI may choose from. API ids verified against GET /v1/models. */
export const TOV_MODELS = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (medium)", effort: "medium" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (medium)", effort: "medium" },
];

export const DEFAULT_TOV_MODEL = TOV_MODELS[0].id;

/** @param {unknown} id */
export function resolveTovModel(id) {
  return TOV_MODELS.find((m) => m.id === id) ?? TOV_MODELS[0];
}

/**
 * @param {{
 *   model: string;
 *   system: string;
 *   content: Array<Record<string, any>>;
 *   schema: Record<string, any>;
 *   maxTokens?: number;
 * }} args
 * @returns {Promise<{ json: any; usage: { input: number; output: number }; model: string }>}
 */
export async function callClaudeJson({ model, system, content, schema, maxTokens = 16000 }) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY er ikke sat i miljøet");
  const spec = resolveTovModel(model);

  /** @param {boolean} strict */
  async function send(strict) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: spec.id,
        max_tokens: maxTokens,
        // Large schemas exceed the grammar limit of structured outputs: describe the schema in the prompt instead
        // (the reply is validated/normalised against the schema afterwards).
        system:
          strict ? system : (
            `${system}\n\nReturn ONLY one valid JSON object (no markdown fences, no commentary) that conforms exactly to this JSON Schema:\n${JSON.stringify(schema)}`
          ),
        messages: [{ role: "user", content }],
        output_config: strict ? { effort: spec.effort, format: { type: "json_schema", schema } } : { effort: spec.effort },
      }),
    });
    const data = await res.json().catch(() => null);
    return { res, data };
  }

  let { res, data } = await send(true);
  if (!res.ok && /grammar is too large|too complex/i.test(data?.error?.message ?? "")) {
    ({ res, data } = await send(false));
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? `Anthropic API fejl (${res.status})`;
    throw new Error(msg);
  }  if (data?.stop_reason === "max_tokens") {
    throw new Error("Svaret blev afbrudt (max tokens). Prøv igen med mindre materiale.");
  }
  const text = (data?.content ?? [])
    .filter((b) => b?.type === "text")
    .map((b) => b.text)
    .join("");
  let json;
  try {
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    throw new Error("Modellen returnerede ugyldig JSON");
  }
  return {
    json,
    model: spec.id,
    usage: { input: data?.usage?.input_tokens ?? 0, output: data?.usage?.output_tokens ?? 0 },
  };
}
