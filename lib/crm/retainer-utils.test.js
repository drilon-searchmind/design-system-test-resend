import { describe, expect, it } from "vitest";

import {
  buildContractRetainerSumByClientId,
  computeEffectiveRetainer,
  enrichClientRetainer,
  isContributingRetainerContract,
  sumContributingContractRetainer,
} from "./retainer-utils.js";

describe("retainer-utils", () => {
  it("counts only signed active retainer contracts", () => {
    const contracts = [
      { status: "active", type: "retainer", signedAt: new Date(), value: 5000 },
      { status: "pending_signature", type: "retainer", value: 3000 },
      { status: "active", type: "project", signedAt: new Date(), value: 9000 },
      { status: "ended", type: "retainer", signedAt: new Date(), value: 2000 },
    ];
    expect(sumContributingContractRetainer(contracts)).toBe(5000);
  });

  it("combines static CRM retainer with contract sum", () => {
    const contracts = [
      { clientId: "a", status: "active", type: "retainer", signedAt: new Date(), value: 5000 },
      { clientId: "a", status: "notice", type: "subscription", signedAt: new Date(), value: 1000 },
    ];
    expect(computeEffectiveRetainer(10000, contracts)).toBe(16000);
    expect(buildContractRetainerSumByClientId(contracts).a).toBe(6000);
  });

  it("enriches client wire shape without losing static base", () => {
    const enriched = enrichClientRetainer({ id: "c-alis", retainer: 10000, currency: "DKK" }, 5000);
    expect(enriched.retainerBase).toBe(10000);
    expect(enriched.retainerFromContracts).toBe(5000);
    expect(enriched.retainer).toBe(15000);
  });

  it("rejects unsigned contracts", () => {
    expect(
      isContributingRetainerContract({ status: "active", type: "retainer", value: 5000 }),
    ).toBe(false);
  });
});
