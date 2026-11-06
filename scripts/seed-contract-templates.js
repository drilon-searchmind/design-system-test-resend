import ContractTemplate from "@/lib/db/models/contract-template";
import { STARTER_CONTRACT_TEMPLATES } from "@/lib/crm/contract-template-defaults";
import { connectDb } from "@/lib/db/mongoose";

await connectDb();
for (const t of STARTER_CONTRACT_TEMPLATES) {
  const exists = await ContractTemplate.exists({ key: t.key });
  if (exists) {
    console.log("skip", t.key);
    continue;
  }
  await ContractTemplate.create({ ...t, isDefault: false, active: true, isTest: false });
  console.log("created", t.key);
}
process.exit(0);
