import { clearMongoExceptUsers } from "../lib/server/clear-mongo-except-users.js";

async function main() {
  console.log("Clearing MongoDB (except users)…");
  const cleared = await clearMongoExceptUsers();
  console.log("Done:", cleared.deleted);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
