/** Statuses where signed retainer contracts contribute to monthly MRR. */
const CONTRIBUTING_STATUSES = new Set(["active", "notice"]);

/** Contract types counted as recurring monthly retainer revenue. */
const RETAINER_TYPES = new Set(["retainer", "subscription"]);

/**
 * Whether a contract row adds to the customer's effective retainer total.
 * Requires signature (accepted) and an active commercial status.
 * @param {Record<string, unknown> | null | undefined} contract
 */
export function isContributingRetainerContract(contract) {
  if (!contract || typeof contract !== "object") return false;
  const status = String(contract.status ?? "");
  if (!CONTRIBUTING_STATUSES.has(status)) return false;
  const type = String(contract.type ?? "retainer");
  if (!RETAINER_TYPES.has(type)) return false;
  if (!contract.signedAt) return false;
  const value = typeof contract.value === "number" ? contract.value : Number(contract.value);
  return Number.isFinite(value) && value > 0;
}

/**
 * @param {Record<string, unknown>[] | null | undefined} contracts
 */
export function sumContributingContractRetainer(contracts) {
  if (!Array.isArray(contracts)) return 0;
  return contracts.filter(isContributingRetainerContract).reduce((sum, doc) => {
    const value = typeof doc.value === "number" ? doc.value : Number(doc.value);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/**
 * Static CRM retainer + sum of signed, active retainer/subscription contracts.
 * @param {number | null | undefined} staticRetainer
 * @param {Record<string, unknown>[] | null | undefined} contracts
 */
export function computeEffectiveRetainer(staticRetainer, contracts) {
  const base =
    typeof staticRetainer === "number" && Number.isFinite(staticRetainer) ? staticRetainer : 0;
  return base + sumContributingContractRetainer(contracts);
}

/**
 * @param {Record<string, unknown>[]} contractDocs
 * @returns {Record<string, number>}
 */
export function buildContractRetainerSumByClientId(contractDocs) {
  /** @type {Record<string, number>} */
  const map = {};
  for (const doc of contractDocs) {
    if (!isContributingRetainerContract(doc)) continue;
    const cid = doc.clientId != null ? String(doc.clientId) : "";
    if (!cid) continue;
    const value = typeof doc.value === "number" ? doc.value : Number(doc.value);
    map[cid] = (map[cid] ?? 0) + (Number.isFinite(value) ? value : 0);
  }
  return map;
}

/**
 * Adds effective retainer fields while preserving the static CRM amount separately.
 * @template {Record<string, unknown>} T
 * @param {T} client
 * @param {number} [contractRetainerSum=0]
 */
export function enrichClientRetainer(client, contractRetainerSum = 0) {
  const base = typeof client.retainer === "number" && Number.isFinite(client.retainer) ? client.retainer : 0;
  const fromContracts =
    typeof contractRetainerSum === "number" && Number.isFinite(contractRetainerSum) ?
      contractRetainerSum
    : 0;
  return {
    ...client,
    retainerBase: base,
    retainerFromContracts: fromContracts,
    retainer: base + fromContracts,
  };
}
