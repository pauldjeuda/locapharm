import { describe, expect, it } from "vitest";
import { PharmacyRecord } from "./pharmacy.models";
import { PharmacyHoursService } from "./pharmacy-hours.service";

function pharmacy(openingHours?: string): PharmacyRecord {
  return {
    id: "osm:node/1",
    name: "Pharmacie test",
    lat: 3.8667,
    lon: 11.5167,
    region: "Centre",
    opening_hours: openingHours,
    source: {
      id: "osm",
      url: "https://www.openstreetmap.org/node/1",
      fetched_at: "2026-11-17T00:00:00Z",
      license: "ODbL-1.0",
      official: false,
    },
    quality: { score: 1, flags: [] },
    updated_at: "2026-11-17T00:00:00Z",
  };
}

describe("PharmacyHoursService", () => {
  it("evaluates a weekday schedule using Cameroon wall time", async () => {
    const service = new PharmacyHoursService();
    const record = pharmacy("Mo-Fr 09:00-18:00");
    await service.prepare([record]);
    service.now.set(new Date("2026-11-17T08:30:00.000Z"));

    expect(service.status(record)).toMatchObject({ state: "open" });
  });

  it("reports the next opening time when a known schedule is closed", async () => {
    const service = new PharmacyHoursService();
    const record = pharmacy("Mo-Fr 09:00-18:00");
    await service.prepare([record]);
    service.now.set(new Date("2026-11-17T18:30:00.000Z"));

    expect(service.status(record)).toMatchObject({
      state: "closed",
      nextChange: { direction: "opens", dayOffset: 1, time: "09:00" },
    });
  });

  it("keeps overnight opening intervals open after midnight", async () => {
    const service = new PharmacyHoursService();
    const record = pharmacy("Mo-Su 22:00-02:00");
    await service.prepare([record]);
    service.now.set(new Date("2026-11-17T00:30:00.000Z"));

    expect(service.status(record)).toMatchObject({
      state: "open",
      nextChange: { direction: "closes", dayOffset: 0, time: "02:00" },
    });
  });

  it("keeps explicitly conditional states unknown", async () => {
    const service = new PharmacyHoursService();
    // "Mo-Su unknown" tells opening_hours.js the status is conditionally
    // unknown every day — getUnknown() must return true so the service
    // reports state:"unknown" rather than open/closed.
    const record = pharmacy("Mo-Su unknown");
    await service.prepare([record]);
    service.now.set(new Date("2026-11-17T08:30:00.000Z"));

    expect(service.status(record)).toMatchObject({
      state: "unknown",
      reason: "conditional",
    });
  });

  it("does not turn missing or invalid hours into a closed status", async () => {
    const service = new PharmacyHoursService();
    const missing = pharmacy();
    const invalid = pharmacy("Mo-Fr 99:00-40:00");
    await service.prepare([missing, invalid]);

    expect(service.status(missing)).toMatchObject({
      state: "unknown",
      reason: "missing",
    });
    expect(service.status(invalid)).toMatchObject({
      state: "unknown",
      reason: "invalid",
    });
  });

  it("only marks explicit 24/7 data as continuously open", () => {
    const service = new PharmacyHoursService();

    expect(service.isOpenTwentyFourSeven(pharmacy("24/7"))).toBe(true);
    expect(service.isOpenTwentyFourSeven(pharmacy("Mo-Su 00:00-24:00"))).toBe(
      true,
    );
    expect(service.isOpenTwentyFourSeven(pharmacy("Mo-Fr 00:00-24:00"))).toBe(
      false,
    );
  });
});
