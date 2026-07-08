import Department from "@/lib/db/models/department";
import TeamMember from "@/lib/db/models/team-member";
import { deptMeta, normalizeDeptKey } from "@/lib/crm/dept-keys";
import { connectDb } from "@/lib/db/mongoose";
import { mapTeamMemberFromMongo } from "@/lib/server/contracts-data";
import { buildIsTestQuery } from "@/lib/server/test-data-filter";

/** @param {Record<string, unknown>[]} clauses */
function andQuery(...clauses) {
  const parts = clauses.filter((c) => c && typeof c === "object" && Object.keys(c).length > 0);
  if (!parts.length) return {};
  if (parts.length === 1) return /** @type {Record<string, unknown>} */ (parts[0]);
  return { $and: parts };
}

/**
 * @param {string} memberKey
 * @param {{ departmentKey?: string | null }} body
 * @param {{ includeTest?: boolean }} [opts]
 */
export async function patchTeamMemberDepartment(memberKey, body, opts = {}) {
  const mk = String(memberKey ?? "").trim();
  if (!mk) return { error: "Medarbejder-nøgle mangler", status: 400 };

  const raw = body.departmentKey;
  const cleared = raw === null || raw === undefined || String(raw).trim() === "";
  const normalized = cleared ? null : normalizeDeptKey(String(raw));

  if (!cleared && !deptMeta(normalized)) {
    return { error: `Ukendt disciplin: ${normalized}`, status: 400 };
  }

  await connectDb();
  const scope = /** @type {Record<string, unknown>} */ (
    buildIsTestQuery(Boolean(opts.includeTest) ? "all" : "production")
  );

  const mem = await TeamMember.findOne(/** @type {Record<string, unknown>} */ (andQuery(scope, { key: mk }))).lean();
  if (!mem || typeof mem !== "object") {
    return { error: "Medarbejder ikke fundet", status: 404 };
  }

  /** @type {import('mongoose').Types.ObjectId | null} */
  let departmentId = null;
  if (normalized) {
    const dep = await Department.findOne(
      /** @type {Record<string, unknown>} */ (andQuery(scope, { key: normalized })),
    )
      .select("_id")
      .lean();
    departmentId =
      dep && typeof dep === "object" && "_id" in dep ?
        /** @type {import('mongoose').Types.ObjectId} */ (dep._id)
      : null;
  }

  /** @type {Record<string, unknown>} */
  const $set = {
    disciplineKeys: normalized ? [normalized] : [],
  };
  /** @type {Record<string, 1>} */
  const $unset = {};

  if (cleared) {
    $unset.departmentKey = 1;
    $unset.departmentId = 1;
  } else {
    $set.departmentKey = normalized;
    if (departmentId) $set.departmentId = departmentId;
    else $unset.departmentId = 1;
  }

  /** @type {Record<string, unknown>} */
  const updateDoc = { $set };
  if (Object.keys($unset).length) updateDoc.$unset = $unset;

  await TeamMember.updateOne({ _id: mem._id }, updateDoc).exec();

  const fresh = await TeamMember.findById(mem._id).lean();
  if (!fresh || typeof fresh !== "object") {
    return { error: "Kunne ikke hente opdateret medarbejder", status: 500 };
  }

  return {
    ok: /** @type {const} */ (true),
    memberKey: mk,
    member: mapTeamMemberFromMongo(/** @type {Record<string, unknown>} */ (fresh)),
  };
}
