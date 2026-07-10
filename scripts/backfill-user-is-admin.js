import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";

async function main() {
  await connectDb();
  const result = await User.updateMany(
    { isAdmin: { $exists: false } },
    { $set: { isAdmin: false } },
  );
  console.log(`Backfill isAdmin=false: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
