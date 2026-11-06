import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { renderContractDocumentHtml } from "@/lib/contracts/contract-document-html";
import Client from "@/lib/db/models/client";
import Contract from "@/lib/db/models/contract";
import { connectDb } from "@/lib/db/mongoose";
import { requireSession } from "@/lib/server/require-session";

/**
 * Printbart kontraktdokument (kontrakttekst + underskriftsoplysninger).
 * Åbn i browseren og vælg "Gem som PDF" (`?print=1` åbner print-dialogen direkte).
 *
 * @param {import('next/server').NextRequest} req
 * @param {{ params: Promise<{ contractId: string }> }} ctx
 */
export async function GET(req, ctx) {
  const authResult = await requireSession();
  if ("response" in authResult) return authResult.response;

  const { contractId } = await ctx.params;
  await connectDb();

  const byId = mongoose.isValidObjectId(contractId);
  const doc = await Contract.findOne(byId ? { _id: contractId } : { key: contractId }).lean();
  if (!doc) return NextResponse.json({ error: "Kontrakt ikke fundet" }, { status: 404 });

  const prospect = /** @type {Record<string, unknown> | undefined} */ (doc.prospect);
  let clientName = prospect?.name ? String(prospect.name) : "";
  if (doc.clientId) {
    const client = await Client.findById(doc.clientId).select("name").lean();
    if (client?.name) clientName = String(client.name);
  }

  const body =
    typeof doc.documentBodyMd === "string" && doc.documentBodyMd.trim() ?
      doc.documentBodyMd
    : "_Kontrakten har endnu ingen tekst._";

  const html = renderContractDocumentHtml({
    title: doc.label ? String(doc.label) : "Aftale",
    clientName,
    bodyMd: body,
    signature:
      doc.signedAt ?
        {
          name: doc.signedByName ? String(doc.signedByName) : undefined,
          email: doc.signedByEmail ? String(doc.signedByEmail) : undefined,
          title: doc.signedByTitle ? String(doc.signedByTitle) : undefined,
          company: doc.signedByCompany ? String(doc.signedByCompany) : undefined,
          signedAt: doc.signedAt,
          ip: doc.signatureIp ? String(doc.signatureIp) : undefined,
          hash: doc.signatureDocumentHash ? String(doc.signatureDocumentHash) : undefined,
        }
      : null,
    autoPrint: req.nextUrl.searchParams.get("print") === "1",
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
