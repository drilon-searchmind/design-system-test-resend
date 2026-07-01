import User from "@/lib/db/models/user";

/**
 * @param {Array<{ userId?: unknown }>} memberDocs
 * @returns {Promise<Map<string, string>>}
 */
export async function buildUserImageMapForMembers(memberDocs) {
  const ids = [
    ...new Set(
      memberDocs
        .map((d) => (d.userId != null ? String(d.userId) : ""))
        .filter((id) => id.length > 0),
    ),
  ];
  if (!ids.length) return new Map();

  const users = await User.find({ _id: { $in: ids } })
    .select("_id image")
    .lean();

  /** @type {Map<string, string>} */
  const map = new Map();
  for (const u of users) {
    const img = String(u.image ?? "").trim();
    if (img) map.set(String(u._id), img);
  }
  return map;
}

/**
 * @param {Record<string, unknown>} doc
 * @param {Map<string, string>} imageMap
 */
export function attachMemberUserImage(doc, imageMap) {
  const uid = doc.userId != null ? String(doc.userId) : "";
  if (!uid) return doc;
  const image = imageMap.get(uid);
  if (!image) return doc;
  return { ...doc, image };
}

/**
 * @param {Record<string, unknown>[]} docs
 */
export async function enrichMembersWithUserImages(docs) {
  const imageMap = await buildUserImageMapForMembers(docs);
  return docs.map((d) => attachMemberUserImage(d, imageMap));
}

/**
 * @param {string | null | undefined} userId
 */
export async function userImageByUserId(userId) {
  const uid = userId != null ? String(userId).trim() : "";
  if (!uid) return null;
  const doc = await User.findById(uid).select("image").lean();
  const img = String(doc?.image ?? "").trim();
  return img || null;
}
