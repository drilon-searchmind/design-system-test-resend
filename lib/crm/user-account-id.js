import mongoose from "mongoose";

/**
 * @param {string} raw Route param e.g. `u-507f1f77bcf86cd799439011`
 * @returns {string | null} Mongo ObjectId hex string
 */
export function parseUserAccountId(raw) {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("u-")) return null;
  const oid = s.slice(2);
  if (!mongoose.Types.ObjectId.isValid(oid)) return null;
  return oid;
}

/**
 * @param {string | import('mongoose').Types.ObjectId | null | undefined} mongoId
 */
export function formatUserAccountId(mongoId) {
  const oid = String(mongoId ?? "").trim();
  if (!oid || !mongoose.Types.ObjectId.isValid(oid)) return "";
  return `u-${oid}`;
}
