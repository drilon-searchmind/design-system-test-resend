import Client from "@/lib/db/models/client";
import ContractTemplate from "@/lib/db/models/contract-template";

/** @typedef {Record<string, unknown>} RawDoc */

const SERVICE_AGREEMENT_TEMPLATE_KEY = "serviceaftale-aarlig";

/** @param {unknown} v */
const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Når en kontrakt til en EKSISTERENDE kunde underskrives (opsalg / tillæg), lægges
 * kontraktens linjer oven i kundens aftalebeløb:
 *  - løbende linjer  → `serviceBudgets.<afdeling>` (udtaget af MRR'en; selve MRR kommer fra kontraktværdien,
 *    så `retainerAmount` røres ikke og intet tælles dobbelt)
 *  - "oneoff-web"    → `oneOffWebAmount`
 *  - serviceaftale   → `serviceAgreementAnnual` (kontraktværdien pr. år)
 * Idempotent via `contract.commercialAppliedAt`. Kalder gemmer selv kontrakten.
 *
 * @param {import('mongoose').Document & RawDoc} contract
 * @param {{ signedAt: Date; by?: string }} opts
 * @returns {Promise<{ applied: boolean; changes?: Record<string, { from: unknown; to: unknown }> }>}
 */
export async function applyContractToExistingClient(contract, opts) {
  if (!contract.clientId || contract.commercialAppliedAt) return { applied: false };

  const client = await Client.findById(contract.clientId);
  if (!client) return { applied: false };

  const type = String(contract.type ?? "retainer");
  const recurring = ["retainer", "subscription"].includes(type);

  let isServiceAgreement = false;
  if (contract.templateId) {
    const tpl = /** @type {RawDoc | null} */ (
      await ContractTemplate.findById(contract.templateId).select("key").lean()
    );
    isServiceAgreement = str(tpl?.key) === SERVICE_AGREEMENT_TEMPLATE_KEY;
  }

  const lines = Array.isArray(contract.serviceLines) ? contract.serviceLines : [];
  /** @type {Record<string, number>} */
  const budgetAdd = {};
  let oneOffAdd = 0;
  for (const l of lines) {
    const key = str(l?.key);
    const amount = Number(l?.amount ?? 0);
    if (!key || !(amount > 0)) continue;
    if (key === "oneoff-web") oneOffAdd += amount;
    else if (recurring && !isServiceAgreement) budgetAdd[key] = (budgetAdd[key] ?? 0) + amount;
  }

  const value = Number(contract.value ?? 0);
  const agreementAdd = isServiceAgreement && value > 0 ? value : 0;

  /** @type {Record<string, { from: unknown; to: unknown }>} */
  const changes = {};

  if (Object.keys(budgetAdd).length) {
    const current = new Map(client.serviceBudgets ? [...client.serviceBudgets.entries()] : []);
    for (const [dept, add] of Object.entries(budgetAdd)) {
      const from = current.get(dept) ?? 0;
      current.set(dept, from + add);
      changes[`serviceBudgets.${dept}`] = { from, to: from + add };
    }
    client.serviceBudgets = current;
  }
  if (oneOffAdd > 0) {
    const from = client.oneOffWebAmount ?? 0;
    client.oneOffWebAmount = from + oneOffAdd;
    changes.oneOffWebAmount = { from, to: from + oneOffAdd };
  }
  if (agreementAdd > 0) {
    const from = client.serviceAgreementAnnual ?? 0;
    client.serviceAgreementAnnual = from + agreementAdd;
    changes.serviceAgreementAnnual = { from, to: from + agreementAdd };
  }

  if (Object.keys(changes).length) {
    const log = client.commercialLog ?? [];
    log.push({
      at: opts.signedAt,
      by: opts.by || "Kontrakt",
      note: `Underskrevet kontrakt: ${str(contract.label) || "Tillæg"}`,
      changes,
    });
    client.commercialLog = log.slice(-50);
    await client.save();
  }

  contract.commercialAppliedAt = opts.signedAt;
  return { applied: Object.keys(changes).length > 0, changes };
}
