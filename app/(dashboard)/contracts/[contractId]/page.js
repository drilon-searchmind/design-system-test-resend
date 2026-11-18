import mongoose from "mongoose";

import { ContractDetailPageClient } from "@/components/contracts/contract-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import Contract from "@/lib/db/models/contract";
import Client from "@/lib/db/models/client";
import { connectDb } from "@/lib/db/mongoose";
import { CONTRACTS } from "@/lib/crm/static-data";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ contractId: string }> }} props */
export async function generateMetadata({ params }) {
  const { contractId } = await params;
  const demoRow = CONTRACTS.find((c) => c.id === contractId);
  if (demoRow) return { title: `${demoRow.clientName} · Kontrakt · Searchmind 1337 OS` };

  try {
    await connectDb();
    /** @type {Record<string, unknown>[]} */
    const orClause = [{ key: contractId }];
    if (mongoose.Types.ObjectId.isValid(contractId)) {
      orClause.push({ _id: new mongoose.Types.ObjectId(contractId) });
    }
    const ctrDoc = await Contract.findOne({ $or: orClause }).select("clientId").lean();
    const clientOid = ctrDoc?.clientId;
    if (!clientOid) return { title: "Kontrakt · Searchmind 1337 OS" };
    const clientDoc = await Client.findById(clientOid).select("name").lean();
    const name = clientDoc?.name ? String(clientDoc.name) : "Kontrakt";
    return { title: `${name} · Kontrakt · Searchmind 1337 OS` };
  } catch {
    return { title: "Kontrakt · Searchmind 1337 OS" };
  }
}

/** @param {{ params: Promise<{ contractId: string }> }} props */
export default async function ContractDetailPage({ params }) {
  const { contractId } = await params;
  return (
    <main className={cn(shellMainStudio)}>
      <ContractDetailPageClient contractId={contractId} />
    </main>
  );
}
