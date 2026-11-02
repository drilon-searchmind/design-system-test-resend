import {
  annotateClientsWithGroups,
  clientGroupHref,
  clientGroupKey,
  defaultGroupName,
  normalizeGroupKey,
} from "@/lib/crm/client-groups";
import Client from "@/lib/db/models/client";
import ClientGroup from "@/lib/db/models/client-group";

/**
 * @param {...Record<string, unknown>} clauses
 */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && Object.keys(c).length > 0);
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

/**
 * Navne på koncerner (nøgle → navn) til annotering af klientlister.
 * `ClientGroup.cvr` gemmer koncern-nøglen (CVR eller manuel `g-…`-nøgle).
 * @param {Record<string, unknown>} scope `buildIsTestQuery(...)`
 * @returns {Promise<Record<string, string>>}
 */
export async function loadGroupNameMap(scope) {
  const docs = await ClientGroup.find(scope).select("cvr name").lean();
  /** @type {Record<string, string>} */
  const out = {};
  for (const d of docs) {
    const key = normalizeGroupKey(d.cvr);
    const name = typeof d.name === "string" ? d.name.trim() : "";
    if (key && name) out[key] = name;
  }
  return out;
}

/**
 * Kunde-vælger (`{ value: slug, label, group? }`) hvor brands i samme koncern får `group` = koncernnavn.
 * `docs` skal indeholde `slug name cvr groupKey` og være alle klienter i scope (ellers undervurderes koncerner).
 * @param {Record<string, unknown>[]} docs
 * @param {Record<string, unknown>} scope
 * @returns {Promise<{ value: string; label: string; group?: string }[]>}
 */
export async function buildClientPicklist(docs, scope) {
  const names = await loadGroupNameMap(scope);
  const annotated = annotateClientsWithGroups(
    docs.map((d) => ({
      value: String(d.slug ?? ""),
      label: String(d.name ?? d.slug ?? "—"),
      name: String(d.name ?? d.slug ?? "—"),
      cvr: d.cvr ? String(d.cvr) : "",
      groupKey: d.groupKey ? String(d.groupKey) : "",
    })),
    names,
  );
  return annotated
    .filter((c) => c.value.trim())
    .map((c) => ({
      value: c.value,
      label: c.label,
      ...(c.groupName ? { group: c.groupName } : {}),
    }));
}

/**
 * Alle klient-dokumenter (lean) i en koncern (manuel nøgle eller delt CVR).
 * @param {string} groupKey Normaliseret koncern-nøgle
 * @param {Record<string, unknown>} scope
 */
export async function resolveGroupMemberDocs(groupKey, scope) {
  if (!groupKey) return [];
  const candidates = await Client.find(
    andQuery(
      {
        $or: [
          { groupKey: { $exists: true, $nin: [null, ""] } },
          { cvr: { $exists: true, $nin: [null, ""] } },
        ],
      },
      scope,
    ),
  )
    .select("_id cvr groupKey")
    .lean();
  const ids = candidates.filter((d) => clientGroupKey(d) === groupKey).map((d) => d._id);
  if (!ids.length) return [];
  return Client.find({ _id: { $in: ids } }).lean();
}

/**
 * Koncern-kontekst til en enkelt brand-side (null hvis brandet står alene).
 * @param {Record<string, any>} clientDoc
 * @param {Record<string, unknown>} scope
 */
export async function resolveGroupContext(clientDoc, scope) {
  const key = clientGroupKey(clientDoc);
  if (!key) return null;
  const members = await resolveGroupMemberDocs(key, scope);
  if (members.length < 2) return null;

  const groupDoc = await ClientGroup.findOne({ cvr: key }).select("name").lean();
  const named = typeof groupDoc?.name === "string" ? groupDoc.name.trim() : "";
  const slimMembers = members.map((m) => ({
    name: String(m.name ?? ""),
    retainer: typeof m.retainerAmount === "number" ? m.retainerAmount : 0,
  }));
  const currentId = String(clientDoc._id);

  return {
    cvr: key,
    name: named || defaultGroupName(slimMembers),
    href: clientGroupHref(key),
    brands: members
      .map((m) => ({
        id: String(m.slug ?? m._id),
        name: String(m.name ?? ""),
        isCurrent: String(m._id) === currentId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "da")),
  };
}
