import { fetchClickUpTask } from "@/lib/clickup/api";
import { csvRowToClientDoc, fetchClickUpCustomerRows } from "@/lib/clickup/import-customers";
import { applyClickUpCustomersSync } from "@/lib/server/clickup-customers-sync";
import { normalizeCvr } from "@/lib/crm/client-groups";
import { fetchLatestDeliveryTaskRows } from "@/lib/clickup/fetch-delivery-tasks";
import { importClickUpUsers } from "@/lib/clickup/import-users";
import { mapDeliveryTaskToImportRow } from "@/lib/clickup/task-map";
import { mapClickUpListMember } from "@/lib/clickup/user-map";
import Client from "@/lib/db/models/client";
import Department from "@/lib/db/models/department";
import Task from "@/lib/db/models/task";
import TeamMember from "@/lib/db/models/team-member";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";

/** @typedef {ReturnType<typeof mapDeliveryTaskToImportRow>} ImportRow */
/** @typedef {'new' | 'update' | 'unchanged' | 'skipped'} SyncKind */

/** ClickUp service line / liste → Agency OS-afdeling (nøgle), når navnene ikke matcher direkte. */
const DEPARTMENT_ALIASES = {
  "paid social": "social",
  "email marketing": "email",
  "e mail": "email",
  "creative performance": "creative",
  "client management": "clientMgmt",
  "account management": "clientMgmt",
};

/** Felter der sammenlignes mellem eksisterende opgave og ClickUp (kun felter import styrer). */
const COMPARE_FIELDS = [
  "title",
  "status",
  "priority",
  "clientSlug",
  "departmentKey",
  "assigneeMemberKeys",
  "dueDate",
  "estimateHours",
  "parentClickUpId",
  "description",
];

/** @param {unknown} s */
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/** Fjern landeliste i parentes: "boatlab.dk (DK, SE)" → "boatlab.dk". */
function stripParen(s) {
  return String(s ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** ClickUp-beskrivelse (markdown/tekst) → simpel, sikker HTML. */
function textToHtml(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  return t
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * @param {string} name
 * @param {string} type
 * @returns {"todo" | "doing" | "review" | "done" | "blocked" | "cancelled"}
 */
export function mapClickUpStatus(name, type) {
  const n = String(name ?? "").toLowerCase();
  if (/block|on hold|hold|venter|pause/.test(n)) return "blocked";
  if (/cancel|annul|afvist|rejected/.test(n)) return "cancelled";
  if (type === "closed" || /done|complete|closed|lukket|afsluttet/.test(n)) return "done";
  if (/review|godkend|approval|qa/.test(n)) return "review";
  if (/progress|doing|working|igang|i gang/.test(n)) return "doing";
  if (type === "open" || /to ?do|open|backlog|ny/.test(n)) return "todo";
  return "doing";
}

/** @param {string} p @returns {"high" | "medium" | "low"} */
export function mapClickUpPriority(p) {
  const v = String(p ?? "").toLowerCase();
  if (v === "urgent" || v === "high") return "high";
  if (v === "low") return "low";
  return "medium";
}

/**
 * Indlæs alt der skal bruges til at koble ClickUp-opgaver til Agency OS.
 */
async function loadMappingContext() {
  await connectDb();
  const [clients, departments, members, users] = await Promise.all([
    Client.find({}).select("slug name clickUpTaskName cvr groupKey status").lean(),
    Department.find({}).select("key name shortLabel").lean(),
    TeamMember.find({}).select("key name clickUpMemberId userId departmentKey").lean(),
    User.find({}).select("email clickUpMemberId").lean(),
  ]);

  /** @type {Map<string, Record<string, unknown>[]>} */
  const clientIndex = new Map();
  const add = (key, c) => {
    const k = norm(key);
    if (!k) return;
    const list = clientIndex.get(k);
    if (list) {
      if (!list.includes(c)) list.push(c);
    } else clientIndex.set(k, [c]);
  };
  for (const c of clients) {
    add(c.clickUpTaskName, c);
    add(c.name, c);
    add(String(c.slug ?? "").replace(/^c-/, ""), c);
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const deptIndex = new Map();
  for (const d of departments) {
    for (const k of [d.key, d.name, d.shortLabel]) if (k) deptIndex.set(norm(k).replace(/[-_]/g, " "), d);
  }
  const deptByKey = new Map(departments.map((d) => [String(d.key), d]));

  /** @type {Map<string, Record<string, unknown>>} */
  const memberByCuId = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const memberByUserId = new Map();
  for (const m of members) {
    if (m.clickUpMemberId) memberByCuId.set(String(m.clickUpMemberId), m);
    if (m.userId) memberByUserId.set(String(m.userId), m);
  }
  /** @type {Map<string, Record<string, unknown>>} */
  const userByEmail = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const userByCuId = new Map();
  for (const u of users) {
    if (u.email) userByEmail.set(String(u.email).toLowerCase(), u);
    if (u.clickUpMemberId) userByCuId.set(String(u.clickUpMemberId), u);
  }

  return { clientIndex, deptIndex, deptByKey, memberByCuId, memberByUserId, userByEmail, userByCuId };
}

/** @typedef {Awaited<ReturnType<typeof loadMappingContext>>} MappingContext */

/**
 * @param {MappingContext} ctx
 * @param {{ id: string; email: string } | null | undefined} cu
 */
function resolveMember(ctx, cu) {
  if (!cu) return null;
  const direct = cu.id ? ctx.memberByCuId.get(cu.id) : undefined;
  if (direct) return direct;
  const user = (cu.id ? ctx.userByCuId.get(cu.id) : undefined) ?? (cu.email ? ctx.userByEmail.get(cu.email) : undefined);
  if (user) return ctx.memberByUserId.get(String(user._id)) ?? null;
  return null;
}

/**
 * Kunde via ClickUp-mappenavn (domæne) → klient → CVR. Prøver også "Client"-feltet og dele af "a / b".
 * @param {MappingContext} ctx
 * @param {ImportRow} row
 */
function folderCandidates(row) {
  const candidates = [row.folderName, stripParen(row.folderName), row.clientField, stripParen(row.clientField)];
  for (const part of String(row.folderName).split("/")) candidates.push(part, stripParen(part));
  return candidates;
}

/**
 * Kunder i ClickUp's kunde-oversigt (samme kilde som kunde-sync) indekseret på domæne/navn.
 * Bruges til at foreslå oprettelse af kunder der endnu ikke findes i CRM'et.
 */
async function loadCustomerCandidates() {
  const { rows } = await fetchClickUpCustomerRows();
  /** @type {Map<string, Record<string, string>>} */
  const map = new Map();
  for (const r of rows) {
    if (!String(r.customerClickUpId ?? "").trim()) continue;
    for (const k of [r.clickUpTaskName, r.name]) {
      for (const v of [k, stripParen(k)]) {
        const n = norm(v);
        if (n && !map.has(n)) map.set(n, r);
      }
    }
  }
  return map;
}

/**
 * @param {Map<string, Record<string, string>>} candidates
 * @param {ImportRow} row
 */
function findCustomerCandidate(candidates, row) {
  for (const cand of folderCandidates(row)) {
    const hit = candidates.get(norm(cand));
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {MappingContext} ctx
 * @param {ImportRow} row
 */
function resolveClient(ctx, row) {
  for (const cand of folderCandidates(row)) {
    const hit = ctx.clientIndex.get(norm(cand));
    if (hit?.length) return { client: hit[0], ambiguous: hit.length > 1 };
  }
  return { client: null, ambiguous: false };
}

/**
 * @param {MappingContext} ctx
 * @param {ImportRow} row
 */
function resolveDepartment(ctx, row) {
  for (const cand of [row.serviceLine, row.listName]) {
    const k = norm(cand).replace(/[-_]/g, " ");
    if (!k) continue;
    const direct = ctx.deptIndex.get(k);
    if (direct) return direct;
    const alias = DEPARTMENT_ALIASES[/** @type {keyof typeof DEPARTMENT_ALIASES} */ (k)];
    if (alias && ctx.deptByKey.has(alias)) return ctx.deptByKey.get(alias) ?? null;
  }
  return null;
}

/**
 * Oversæt én ClickUp-opgave til et Agency OS-opgavedokument + advarsler/blokeringer.
 * @param {ImportRow} row
 * @param {MappingContext} ctx
 * @param {{
 *   parentDoc?: { _id: unknown; clientId: unknown; clientSlug?: string; clientCvr?: string } | null;
 *   customerCandidate?: Record<string, string> | null;
 * }} [opts]
 */
export function buildTaskImportDoc(row, ctx, opts = {}) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const blockers = [];

  let { client, ambiguous } = resolveClient(ctx, row);
  if (!client && opts.parentDoc?.clientId) {
    // Delopgaver arver kunden fra forælderen
    client = /** @type {Record<string, unknown>} */ ({
      _id: opts.parentDoc.clientId,
      slug: opts.parentDoc.clientSlug,
      cvr: opts.parentDoc.clientCvr,
      name: opts.parentDoc.clientSlug,
    });
  }
  const createsCustomer = !client && Boolean(opts.customerCandidate);
  if (createsCustomer) {
    warnings.push(
      `Kunden «${opts.customerCandidate?.name || opts.customerCandidate?.clickUpTaskName}» findes i ClickUp men ikke i CRM'et — oprettes automatisk ved import`,
    );
  } else if (!client) {
    blockers.push(
      `Kunde ikke fundet for ClickUp-mappen «${row.folderName}» — heller ikke i ClickUp's kunde-oversigt`,
    );
  } else if (ambiguous) {
    warnings.push("Flere kunder matcher mappenavnet — den første er valgt");
  }

  const dept = resolveDepartment(ctx, row);
  if (!dept) warnings.push(`Service line «${row.serviceLine || row.listName}» kunne ikke kobles til en afdeling`);

  const members = row.assignees.map((a) => ({ cu: a, member: resolveMember(ctx, a) }));
  const unmatchedUsers = members.filter((m) => !m.member).map((m) => m.cu);
  const pendingUsers = unmatchedUsers.filter((u) => u.id && u.email);
  const unmatchable = unmatchedUsers.filter((u) => !(u.id && u.email));
  if (pendingUsers.length) {
    warnings.push(
      `Ansvarlig findes ikke i teamet — oprettes automatisk ved import: ${pendingUsers.map((u) => u.username || u.email).join(", ")}`,
    );
  }
  if (unmatchable.length) {
    warnings.push(
      `Ansvarlig kan ikke oprettes (mangler ClickUp-id eller e-mail): ${unmatchable.map((u) => u.username || u.email || u.id).join(", ")}`,
    );
  }
  const memberDocs = members.map((m) => m.member).filter((m) => m != null);
  const creatorMember = resolveMember(ctx, row.creator);

  const status = mapClickUpStatus(row.statusName, row.statusType);
  const priority = mapClickUpPriority(row.priority);

  /** @type {Record<string, unknown>} */
  const doc = {
    title: row.name || "(uden titel)",
    description: textToHtml(row.description),
    status,
    priority,
    dueDate: row.dueDateIso ? new Date(row.dueDateIso) : undefined,
    estimateHours: row.timeEstimateHours ? Math.round(row.timeEstimateHours * 100) / 100 : undefined,
    assigneeMemberKeys: memberDocs.map((m) => String(m.key)),
    assigneeMemberKey: memberDocs[0] ? String(memberDocs[0].key) : undefined,
    assigneeId: memberDocs[0]?._id,
    completedAt: status === "done" && row.closedAtIso ? new Date(row.closedAtIso) : undefined,
    clickUpTaskId: row.clickUpTaskId,
    clickUpUrl: row.clickUpUrl,
    clickUpStatus: row.statusName,
    clickUpListName: row.listName,
    clickUpServiceLine: row.serviceLine || row.listName,
    clickUpFolderName: row.folderName,
    clickUpTags: row.tags.length ? row.tags : undefined,
    clickUpCreatedAt: row.createdAtIso ? new Date(row.createdAtIso) : undefined,
    clickUpImportedAt: new Date(),
    isSubTask: Boolean(row.parentId),
  };

  if (client) {
    doc.clientId = client._id;
    doc.clientSlug = client.slug;
    doc.clientCvr = normalizeCvr(client.cvr) || undefined;
  }
  if (dept) {
    doc.departmentKey = String(dept.key);
    doc.departmentId = dept._id;
  }
  if (creatorMember) {
    doc.createdByMemberKey = String(creatorMember.key);
    doc.createdByMemberId = creatorMember._id;
    if (creatorMember.userId) doc.createdByUserId = creatorMember.userId;
  }
  if (opts.parentDoc) doc.parentTaskId = opts.parentDoc._id;

  return { doc, warnings, blockers, client, dept, memberDocs, pendingUsers, status, priority, createsCustomer };
}

/**
 * Ansvarlige/oprettere i valgte opgaver der ikke findes i teamet, men kan oprettes (har ClickUp-id + e-mail).
 * @param {MappingContext} ctx
 * @param {ImportRow[]} rows
 */
function collectMissingUsers(ctx, rows) {
  /** @type {Map<string, ImportRow["assignees"][number]>} */
  const missing = new Map();
  for (const row of rows) {
    for (const u of [...row.assignees, row.creator]) {
      if (!u?.id || !u.email || missing.has(u.id)) continue;
      if (!resolveMember(ctx, u)) missing.set(u.id, u);
    }
  }
  return missing;
}

/**
 * Opret bruger + teammedlem for ClickUp-brugere (samme import som bruger-sync).
 * @param {Map<string, ImportRow["assignees"][number]>} missing
 */
async function createMissingUsers(missing) {
  const existing = await TeamMember.find({}).select("key").lean();
  const usedTeamMemberKeys = new Set(existing.map((m) => String(m.key ?? "")).filter(Boolean));
  const userRows = [...missing.values()].map((u) =>
    mapClickUpListMember(
      { id: u.id, username: u.username, email: u.email, color: u.color, initials: u.initials, profilePicture: u.profilePicture },
      { listId: "tasks", usedTeamMemberKeys },
    ),
  );
  return importClickUpUsers(userRows);
}

/** @param {Record<string, unknown>} o */
function stripUndefined(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

/** @param {unknown} v */
function cmp(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(String).sort().join("|");
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  return String(v).trim();
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string} parentClickUpId
 */
function taskSnapshot(doc, parentClickUpId) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of COMPARE_FIELDS) {
    out[key] = key === "parentClickUpId" ? parentClickUpId : cmp(doc[key]);
  }
  return out;
}

const STATUS_DA = {
  todo: "Skal laves",
  doing: "I gang",
  review: "Til review",
  done: "Færdig",
  blocked: "Blokeret",
  cancelled: "Annulleret",
};
const PRIORITY_DA = { high: "Høj", medium: "Mellem", low: "Lav" };

/**
 * @param {ImportRow[]} rows
 * @param {Map<string, Record<string, unknown>>} existingByCuId
 */
function parentLookup(rows, existingByCuId) {
  const inBatch = new Set(rows.map((r) => r.clickUpTaskId));
  return (/** @type {string} */ parentId) => ({
    inDb: existingByCuId.get(parentId) ?? null,
    inBatch: inBatch.has(parentId),
  });
}

/**
 * @param {{ limit?: number; createdFrom?: string; createdTo?: string }} [opts]
 */
export async function previewClickUpTasksSync(opts = {}) {
  const fetched = await fetchLatestDeliveryTaskRows(opts);
  const { rows } = fetched;
  const ctx = await loadMappingContext();

  const ids = rows.map((r) => r.clickUpTaskId);
  const parentIds = rows.map((r) => r.parentId).filter(Boolean);
  const existingDocs = await Task.find({ clickUpTaskId: { $in: [...ids, ...parentIds] } }).lean();
  const knownIds = new Set(existingDocs.map((d) => String(d._id)));
  const missingParentOids = existingDocs
    .map((d) => d.parentTaskId)
    .filter((oid) => oid && !knownIds.has(String(oid)));
  if (missingParentOids.length) {
    existingDocs.push(...(await Task.find({ _id: { $in: missingParentOids } }).lean()));
  }
  /** @type {Map<string, Record<string, unknown>>} */
  const existingByCuId = new Map(
    existingDocs.map((d) => [String(d.clickUpTaskId), /** @type {Record<string, unknown>} */ (d)]),
  );
  const findParent = parentLookup(rows, existingByCuId);

  const counts = { new: 0, update: 0, unchanged: 0, skipped: 0 };
  let linkedToClient = 0;

  // Kun hent ClickUp's kunde-oversigt hvis mindst én opgave mangler en kunde i CRM'et
  const needsCandidates = rows.some((r) => !resolveClient(ctx, r).client);
  const candidates = needsCandidates ? await loadCustomerCandidates() : null;
  /** @type {Map<string, Record<string, string>>} */
  const customersToCreate = new Map();
  /** @type {Map<string, ImportRow["assignees"][number]>} */
  const usersToCreate = new Map();

  const previewRows = rows.map((row) => {
    const parent = row.parentId ? findParent(row.parentId) : null;
    const parentDb = parent?.inDb;
    const customerCandidate =
      candidates && !resolveClient(ctx, row).client ? findCustomerCandidate(candidates, row) : null;
    const { doc, warnings, blockers, client, dept, memberDocs, pendingUsers, status, priority, createsCustomer } = buildTaskImportDoc(row, ctx, {
      parentDoc: parentDb ? /** @type {never} */ (parentDb) : null,
      customerCandidate,
    });
    for (const u of pendingUsers) usersToCreate.set(u.id, u);
    if (createsCustomer && customerCandidate) {
      customersToCreate.set(String(customerCandidate.customerClickUpId), customerCandidate);
    }
    const candidateDoc = createsCustomer && customerCandidate ? csvRowToClientDoc(customerCandidate, new Set()) : null;
    if (row.parentId && !parentDb && !parent?.inBatch) {
      warnings.push("Forælder-opgaven er ikke importeret — den hentes automatisk ved import");
    }
    if (client) linkedToClient += 1;

    const existing = existingByCuId.get(row.clickUpTaskId);
    const proposedSnap = taskSnapshot(doc, row.parentId);
    const currentSnap = existing ? taskSnapshot(existing, cmp(existing.parentClickUpId)) : null;
    // Eksisterende opgaver gemmer ikke parentClickUpId; udled fra forælderen
    if (existing && currentSnap) {
      const parentDoc = existing.parentTaskId ?
        existingDocs.find((d) => String(d._id) === String(existing.parentTaskId))
      : null;
      currentSnap.parentClickUpId = parentDoc ? String(parentDoc.clickUpTaskId ?? "") : "";
    }

    /** @type {Array<{ field: string; from: string; to: string }>} */
    const changes = [];
    if (currentSnap) {
      for (const key of COMPARE_FIELDS) {
        if (currentSnap[key] !== proposedSnap[key]) {
          changes.push({ field: key, from: currentSnap[key], to: proposedSnap[key] });
        }
      }
    }

    /** @type {SyncKind} */
    let kind = "new";
    if (blockers.length) kind = "skipped";
    else if (existing) kind = changes.length ? "update" : "unchanged";
    counts[kind] += 1;

    return {
      clickUpTaskId: row.clickUpTaskId,
      kind,
      clickUpUrl: row.clickUpUrl,
      proposed: {
        name: row.name,
        status: `${STATUS_DA[status]} (ClickUp: ${row.statusName || "—"})`,
        priority: PRIORITY_DA[priority],
        clientName:
          client ? String(client.name ?? client.slug)
          : candidateDoc ? `${String(candidateDoc.name ?? "")} (ny kunde — oprettes fra ClickUp)`
          : "",
        clientCvr: normalizeCvr(client?.cvr ?? candidateDoc?.cvr),
        customerFolder: row.folderName,
        department: dept ? String(dept.name) : "",
        serviceLine: row.serviceLine || row.listName,
        serviceLineList: row.listName,
        assignees: [
          ...memberDocs.map((m) => String(m.name)),
          ...pendingUsers.map((u) => `${u.username || u.email} (ny — oprettes fra ClickUp)`),
        ].join("; "),
        creator: row.creator?.username ?? "",
        dueDate: row.dueDateIso.slice(0, 10),
        estimateHours: row.timeEstimateHours ? `${Math.round(row.timeEstimateHours * 100) / 100} t` : "",
        createdAt: row.createdAtIso.slice(0, 10),
        closedAt: row.closedAtIso.slice(0, 10),
        isSubtask: row.parentId ? `Ja (forælder ${row.parentId})` : "Nej",
        description: row.description.slice(0, 280),
        notImported: [
          row.tags.length ? `tags (${row.tags.length})` : "",
          row.checklistItems ? `tjekliste (${row.checklistItems})` : "",
          row.timeSpentHours ? `tid logget (${Math.round(row.timeSpentHours * 10) / 10} t)` : "",
          row.dependenciesCount ? `afhængigheder (${row.dependenciesCount})` : "",
          row.recordType ? `record type: ${row.recordType}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        blockers: blockers.join(" · "),
        warnings: warnings.join(" · "),
      },
      current: currentSnap,
      changes,
    };
  });

  const { scannedCount, matchedCount, matchedBeforeLimit } = fetched;
  return {
    fetchedAt: new Date().toISOString(),
    previewOnly: false,
    teamId: fetched.teamId,
    spaceId: fetched.spaceId,
    spaceName: fetched.spaceName,
    limit: fetched.limit,
    createdFrom: fetched.createdFrom,
    createdTo: fetched.createdTo,
    scannedCount,
    matchedCount,
    matchedBeforeLimit,
    pagesFetched: fetched.pagesFetched,
    linkedToClient,
    customersToCreate: customersToCreate.size,
    usersToCreate: usersToCreate.size,
    total: previewRows.length,
    counts,
    rows: previewRows,
    slowFetchNote:
      scannedCount > matchedCount || matchedBeforeLimit > matchedCount ?
        `${scannedCount} tasks scannet i Delivery${fetched.createdFrom || fetched.createdTo ? " i valgt periode" : ""} — viser ${matchedCount} nyeste efter kunde-mappe → service line filter${matchedBeforeLimit > matchedCount ? ` (${matchedBeforeLimit} matchede)` : ""}.`
      : null,
  };
}

/**
 * Importér valgte ClickUp-opgaver (opret eller opdatér via `clickUpTaskId`).
 * Forældre importeres først; mangler en forælder hentes den automatisk fra ClickUp.
 * @param {string[]} clickUpTaskIds
 * @param {{ limit?: number; createdFrom?: string; createdTo?: string }} [filters] samme periode som preview
 */
export async function applyClickUpTasksSync(clickUpTaskIds, filters = {}) {
  const wanted = [...new Set(clickUpTaskIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (!wanted.length) return { ok: false, error: "Ingen opgaver valgt", status: 400 };

  const fetched = await fetchLatestDeliveryTaskRows(filters);
  const wantedSet = new Set(wanted);
  /** @type {Map<string, ImportRow>} */
  const selected = new Map(
    fetched.rows.filter((r) => wantedSet.has(r.clickUpTaskId)).map((r) => [r.clickUpTaskId, r]),
  );
  if (!selected.size) {
    return { ok: false, error: "Valgte opgaver findes ikke i ClickUp-preview — hent preview igen", status: 400 };
  }

  let ctx = await loadMappingContext();
  const token = process.env.CLICKUP_API_TOKEN?.trim() ?? "";

  // Hent forældre der hverken er valgt eller allerede findes
  const extraParents = new Set(
    [...selected.values()].map((r) => r.parentId).filter((p) => p && !selected.has(p)),
  );
  if (extraParents.size) {
    const have = await Task.find({ clickUpTaskId: { $in: [...extraParents] } }).select("clickUpTaskId").lean();
    for (const d of have) extraParents.delete(String(d.clickUpTaskId));
  }
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const autoParents = [];
  for (const parentId of extraParents) {
    try {
      const raw = await fetchClickUpTask({ token, taskId: parentId });
      const row = mapDeliveryTaskToImportRow(/** @type {Record<string, unknown>} */ (raw));
      if (row.clickUpTaskId) {
        selected.set(row.clickUpTaskId, row);
        autoParents.push(row.clickUpTaskId);
      }
    } catch (e) {
      errors.push(`Forælder ${parentId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Forældre før børn (dybde via parent-kæden)
  const depth = (/** @type {ImportRow} */ r, n = 0) => {
    const p = r.parentId ? selected.get(r.parentId) : null;
    return p && n < 10 ? depth(p, n + 1) + 1 : 0;
  };
  const ordered = [...selected.values()].sort((a, b) => depth(a) - depth(b));

  // Opret manglende kunder fra ClickUp's kunde-oversigt (samme import som kunde-sync), før opgaverne
  /** @type {Map<string, Record<string, string>>} */
  const customerCandidateByTask = new Map();
  const needsCustomer = ordered.filter((r) => !resolveClient(ctx, r).client && !r.parentId);
  const orphanParents = ordered.filter((r) => r.parentId && !selected.has(r.parentId) && !resolveClient(ctx, r).client);
  let customersCreated = 0;
  if (needsCustomer.length || orphanParents.length) {
    const candidates = await loadCustomerCandidates();
    /** @type {Set<string>} */
    const customerIds = new Set();
    for (const r of [...needsCustomer, ...orphanParents]) {
      const hit = findCustomerCandidate(candidates, r);
      if (hit) {
        customerCandidateByTask.set(r.clickUpTaskId, hit);
        customerIds.add(String(hit.customerClickUpId));
      }
    }
    if (customerIds.size) {
      const res = await applyClickUpCustomersSync([...customerIds]);
      if ("error" in res && res.error) errors.push(`Kunde-import: ${res.error}`);
      else {
        customersCreated = "imported" in res ? Number(res.imported ?? 0) : 0;
        if ("errors" in res && Array.isArray(res.errors)) errors.push(...res.errors);
      }
      ctx = await loadMappingContext();
    }
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const importedByCuId = new Map();
  // Opret manglende ansvarlige/oprettere (bruger + teammedlem) før opgaverne
  let usersCreated = 0;
  const missingUsers = collectMissingUsers(ctx, ordered);
  if (missingUsers.size) {
    const res = await createMissingUsers(missingUsers);
    usersCreated = res.imported;
    errors.push(...res.errors);
    ctx = await loadMappingContext();
  }
  let created = 0;
  let updated = 0;
  let skipped = 0;
  /** @type {string[]} */
  const importedIds = [];

  for (const row of ordered) {
    try {
      let parentDoc = null;
      if (row.parentId) {
        parentDoc =
          importedByCuId.get(row.parentId) ??
          (await Task.findOne({ clickUpTaskId: row.parentId }).lean());
      }
      const built = buildTaskImportDoc(row, ctx, { parentDoc: /** @type {never} */ (parentDoc) });
      if (built.blockers.length) {
        skipped += 1;
        errors.push(`${row.name || row.clickUpTaskId}: ${built.blockers.join("; ")}`);
        continue;
      }
      const { doc } = built;
      if (row.parentId && !parentDoc) {
        // Forælder kunne ikke hentes — importer som selvstændig opgave
        doc.isSubTask = false;
      }
      const now = new Date();
      const createdAt = /** @type {Date | undefined} */ (doc.clickUpCreatedAt) ?? now;
      const res = await Task.findOneAndUpdate(
        { clickUpTaskId: row.clickUpTaskId },
        { $set: { ...stripUndefined(doc), updatedAt: now }, $setOnInsert: { createdAt } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, timestamps: false, includeResultMetadata: true },
      );
      if (res?.lastErrorObject?.updatedExisting) updated += 1;
      else created += 1;
      const saved = /** @type {Record<string, unknown>} */ (res?.value?.toObject?.() ?? res?.value ?? {});
      importedByCuId.set(row.clickUpTaskId, saved);
      importedIds.push(row.clickUpTaskId);
    } catch (e) {
      errors.push(`${row.name || row.clickUpTaskId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: true,
    imported: created + updated,
    created,
    updated,
    skipped,
    autoImportedParents: autoParents.length,
    customersCreated,
    usersCreated,
    errors,
    total: selected.size,
    appliedIds: importedIds,
  };
}
