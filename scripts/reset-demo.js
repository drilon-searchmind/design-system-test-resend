import { clearMongoExceptUsers } from "../lib/server/clear-mongo-except-users.js";
import { seedDemoFromStatic } from "../lib/server/seed-demo-from-static.js";

async function main() {
  console.log("Clearing MongoDB (except users)…");
  const cleared = await clearMongoExceptUsers();
  console.log("Cleared collections:", cleared.deleted);

  console.log("Seeding demo data from static fixtures…");
  const seeded = await seedDemoFromStatic();
  console.log("Seed complete:", seeded.counts);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
