/**
 * Resolve ClickUp custom field values to human-readable export values.
 * @param {Record<string, unknown>} field
 */
export function resolveClickUpCustomField(field) {
  if (!field || typeof field !== "object") return "";
  const value = field.value;
  if (value == null || value === "") return "";

  const type = String(field.type ?? "");
  const config = /** @type {Record<string, unknown>} */ (field.type_config ?? {});

  if (type === "drop_down") {
    const options = /** @type {Array<{ id?: string; name?: string; orderindex?: number }>} */ (
      config.options ?? []
    );
    const opt = options.find((o) => o.orderindex === value || o.id === value);
    return opt?.name ?? String(value);
  }

  if (type === "labels" && Array.isArray(value)) {
    const options = /** @type {Array<{ id?: string; label?: string; name?: string }>} */ (
      config.options ?? []
    );
    return value
      .map((v) => {
        const opt = options.find((o) => o.id === v);
        return (opt?.label ?? opt?.name ?? String(v)).trim();
      })
      .filter(Boolean)
      .join("; ");
  }

  if (type === "users" && Array.isArray(value)) {
    return value
      .map((u) => {
        if (!u || typeof u !== "object") return String(u);
        const user = /** @type {Record<string, unknown>} */ (u);
        return String(user.username ?? user.email ?? user.id ?? "");
      })
      .filter(Boolean)
      .join("; ");
  }

  if (type === "date") {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return new Date(n).toISOString().slice(0, 10);
  }

  if (type === "currency" || type === "number" || type === "formula") {
    return String(value);
  }

  if (type === "url" || type === "short_text" || type === "text" || type === "email" || type === "phone") {
    return String(value);
  }

  if (type === "list_relationship" && Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const row = /** @type {Record<string, unknown>} */ (item);
        return String(row.name ?? row.id ?? "");
      })
      .filter(Boolean)
      .join("; ");
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** @param {Record<string, unknown>[]} customFields */
export function customFieldsByName(customFields) {
  /** @type {Record<string, Record<string, unknown>>} */
  const map = {};
  if (!Array.isArray(customFields)) return map;
  for (const field of customFields) {
    if (field && typeof field === "object" && typeof field.name === "string") {
      map[field.name.trim()] = /** @type {Record<string, unknown>} */ (field);
    }
  }
  return map;
}

/** @param {Record<string, Record<string, unknown>>} byName @param {string} name */
export function fieldValue(byName, name) {
  const field = byName[name];
  if (!field) return "";
  return resolveClickUpCustomField(field);
}
