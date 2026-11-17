import { describe, expect, it } from "vitest";
import worker from "./index";

describe("worker health endpoint", () => {
  it("returns service health and a version without request coordinates", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/health"),
      { VERSION: "0.1.0" },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "0.1.0" });
  });

  it("returns 404 for unimplemented routes", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/not-yet-available"),
      {},
    );
    expect(response.status).toBe(404);
  });
});
