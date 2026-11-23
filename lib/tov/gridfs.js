import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";

const BUCKET = "tov_source_files";

/** @returns {GridFSBucket} */
function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB er ikke forbundet");
  return new GridFSBucket(db, { bucketName: BUCKET });
}

/**
 * Store binary Brand Core material outside the 16 MB BSON document limit.
 * @param {Buffer} buffer
 * @param {{ filename: string; contentType?: string }} meta
 * @returns {Promise<import('mongodb').ObjectId>}
 */
export async function storeTovBinary(buffer, meta) {
  const b = bucket();
  return new Promise((resolve, reject) => {
    const stream = b.openUploadStream(meta.filename || "upload.bin", {
      contentType: meta.contentType || "application/octet-stream",
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id));
    stream.end(buffer);
  });
}

/**
 * @param {unknown} id
 * @returns {Promise<Buffer | null>}
 */
export async function readTovBinary(id) {
  if (!id) return null;
  let oid;
  try {
    oid = id instanceof ObjectId ? id : new ObjectId(String(id));
  } catch {
    return null;
  }
  const b = bucket();
  /** @type {Buffer[]} */
  const chunks = [];
  return new Promise((resolve, reject) => {
    b.openDownloadStream(oid)
      .on("data", (c) => chunks.push(c))
      .on("error", (err) => {
        // Missing file → null (legacy / cleaned up)
        if (err && /** @type {{ code?: string }} */ (err).code === "ENOENT") resolve(null);
        else reject(err);
      })
      .on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** @param {unknown} id */
export async function deleteTovBinary(id) {
  if (!id) return;
  let oid;
  try {
    oid = id instanceof ObjectId ? id : new ObjectId(String(id));
  } catch {
    return;
  }
  try {
    await bucket().delete(oid);
  } catch {
    // already gone
  }
}
