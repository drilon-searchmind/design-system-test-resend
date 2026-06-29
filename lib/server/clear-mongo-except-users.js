import mongoose from "mongoose";

import { connectDb } from "@/lib/db/mongoose";

/** Slet alle collections undtagen `users`. */
export async function clearMongoExceptUsers() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection not ready");

  const collections = await db.listCollections().toArray();
  /** @type {{ name: string; deletedCount: number }[]} */
  const deleted = [];

  for (const coll of collections) {
    if (coll.name === "users") continue;
    const result = await db.collection(coll.name).deleteMany({});
    deleted.push({ name: coll.name, deletedCount: result.deletedCount ?? 0 });
  }

  return { ok: true, deleted };
}
