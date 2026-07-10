/**
 * NPS recipient resolution — shared between API send and NPS konti UI.
 */

/** @typedef {{ name?: string; email?: string; title?: string; phone?: string }} ContactEmbed */

/** @typedef {{ id: string; name: string; email?: string; title?: string; isPrimary?: boolean }} NpsListedContact */

/**
 * @typedef {object} NpsRecipientClientShape
 * @property {ContactEmbed} [primaryContact]
 * @property {ContactEmbed} [secondaryContact]
 * @property {NpsListedContact[]} [npsContacts]
 * @property {boolean} [npsSendEnabled]
 * @property {'primary' | 'secondary' | 'contact' | 'custom'} [npsRecipientKind]
 * @property {string | null} [npsRecipientContactId]
 * @property {{ name?: string; email?: string } | null} [npsRecipientCustom]
 */

/**
 * @param {NpsRecipientClientShape} client
 * @returns {{ email: string; name: string } | null}
 */
export function resolveNpsRecipient(client) {
  const kind = client.npsRecipientKind ?? "primary";

  if (kind === "custom") {
    const custom = client.npsRecipientCustom;
    const email = typeof custom?.email === "string" ? custom.email.trim() : "";
    if (!email) return null;
    const name = typeof custom?.name === "string" ? custom.name.trim() : "";
    return { email, name };
  }

  if (kind === "secondary") {
    return contactFromEmbed(client.secondaryContact);
  }

  if (kind === "contact") {
    const cid = typeof client.npsRecipientContactId === "string" ? client.npsRecipientContactId.trim() : "";
    if (!cid) return contactFromEmbed(client.primaryContact);
    const list = Array.isArray(client.npsContacts) ? client.npsContacts : [];
    const hit = list.find((c) => c.id === cid);
    if (hit?.email) {
      return { email: hit.email.trim(), name: (hit.name ?? "").trim() };
    }
    return contactFromEmbed(client.primaryContact);
  }

  return contactFromEmbed(client.primaryContact);
}

/** @param {ContactEmbed | undefined | null} embed */
function contactFromEmbed(embed) {
  if (!embed || typeof embed !== "object") return null;
  const email = typeof embed.email === "string" ? embed.email.trim() : "";
  if (!email) return null;
  const name = typeof embed.name === "string" ? embed.name.trim() : "";
  return { email, name };
}

/**
 * @param {NpsRecipientClientShape} client
 * @returns {{ value: string; label: string; email?: string; name?: string }[]}
 */
export function listNpsRecipientOptions(client) {
  /** @type {{ value: string; label: string; email?: string; name?: string }[]} */
  const options = [];
  /** @type {Set<string>} */
  const seenEmails = new Set();

  /** @param {string} value @param {string} label @param {string} [email] @param {string} [name] */
  function push(value, label, email, name) {
    const em = (email ?? "").trim().toLowerCase();
    if (em && seenEmails.has(em)) return;
    if (em) seenEmails.add(em);
    options.push({ value, label, email: email?.trim(), name: name?.trim() });
  }

  const pc = client.primaryContact;
  if (pc?.email) {
    push("primary", `Primær — ${pc.name || pc.email}`, pc.email, pc.name);
  }

  const sc = client.secondaryContact;
  if (sc?.email) {
    push("secondary", `Sekundær — ${sc.name || sc.email}`, sc.email, sc.name);
  }

  const extras = Array.isArray(client.npsContacts) ? client.npsContacts : [];
  for (let i = 0; i < extras.length; i += 1) {
    const c = extras[i];
    if (!c?.email) continue;
    const label = c.isPrimary ? `Kontakt (primær) — ${c.name || c.email}` : `Kontakt — ${c.name || c.email}`;
    push(`contact:${c.id}`, label, c.email, c.name);
  }

  push("custom", "Ny NPS-e-mail…");

  return options;
}

/**
 * @param {NpsRecipientClientShape} client
 */
export function npsRecipientSelectValue(client) {
  const kind = client.npsRecipientKind ?? "primary";
  if (kind === "custom") return "custom";
  if (kind === "secondary") return "secondary";
  if (kind === "contact") {
    const cid = typeof client.npsRecipientContactId === "string" ? client.npsRecipientContactId.trim() : "";
    if (cid) return `contact:${cid}`;
  }
  return "primary";
}

/**
 * @param {string} selectValue
 */
export function parseNpsRecipientSelectValue(selectValue) {
  const v = String(selectValue ?? "").trim();
  if (v === "custom") return { kind: /** @type {const} */ ("custom") };
  if (v === "secondary") return { kind: /** @type {const} */ ("secondary") };
  if (v === "primary") return { kind: /** @type {const} */ ("primary") };
  if (v.startsWith("contact:")) {
    return {
      kind: /** @type {const} */ ("contact"),
      contactId: v.slice("contact:".length),
    };
  }
  return { kind: /** @type {const} */ ("primary") };
}

/** @param {NpsRecipientClientShape} client */
export function isNpsSendEnabled(client) {
  return client.npsSendEnabled !== false;
}
