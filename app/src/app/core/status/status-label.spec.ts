import { describe, expect, it } from "vitest";
import { getPharmacyStatusLabel } from "./status-label";

describe("getPharmacyStatusLabel", () => {
  it("uses the French label by default", () => {
    expect(getPharmacyStatusLabel("onDuty")).toBe("DE GARDE");
  });

  it("keeps missing hours distinct from closed", () => {
    expect(getPharmacyStatusLabel("unknown")).toBe("HORAIRES NON RENSEIGNÉS");
    expect(getPharmacyStatusLabel("closed")).toBe("FERMÉE");
  });

  it("supports English labels", () => {
    expect(getPharmacyStatusLabel("unknown", "en")).toBe("HOURS NOT PROVIDED");
  });
});
