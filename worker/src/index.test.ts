import { describe, expect, it } from "vitest";
import worker from "./index";
import type { D1Database, D1PreparedStatement, D1Result, Env } from "./index";

const INSTALLATION_ID = "123e4567-e89b-42d3-a456-426614174000";
const RATE_LIMIT_SECRET = "rate-limit-test-secret-that-is-long-enough";
const REPORT_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const ADMIN_DIGEST_TOKEN = "test-admin-token";

interface StoredReport {
  id: string;
  pharmacy_id: string | null;
  kind: string;
  reasons_json: string;
  details_ciphertext: string | null;
  details_iv: string | null;
  proposed_lat: number | null;
  proposed_lon: number | null;
  contact_ciphertext: string | null;
  contact_iv: string | null;
  installation_hash: string;
  created_at: number;
  status: string;
}

class FakeD1 implements D1Database {
  readonly reports: StoredReport[] = [];
  readonly rateLimits = new Map<
    string,
    { windowStartedAt: number; hits: number }
  >();

  prepare(sql: string): D1PreparedStatement {
    return new FakeStatement(this, sql);
  }
}

class FakeStatement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(
    private readonly db: FakeD1,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  async first<Row = Record<string, unknown>>(): Promise<Row | null> {
    if (this.sql.includes("RETURNING hit_count")) {
      const [key, now, cutoff] = this.values as [
        string,
        number,
        number,
        number,
      ];
      const previous = this.db.rateLimits.get(key);
      const next =
        previous && previous.windowStartedAt > cutoff
          ? {
              windowStartedAt: previous.windowStartedAt,
              hits: previous.hits + 1,
            }
          : { windowStartedAt: now, hits: 1 };
      this.db.rateLimits.set(key, next);
      return { hit_count: next.hits } as unknown as Row;
    }
    if (this.sql.includes("SELECT contact_ciphertext, contact_iv")) {
      const [id] = this.values as [string];
      const report = this.db.reports.find((candidate) => candidate.id === id);
      if (!report) return null;
      return {
        contact_ciphertext: report.contact_ciphertext,
        contact_iv: report.contact_iv,
      } as unknown as Row;
    }
    return null;
  }

  async all<Row = Record<string, unknown>>(): Promise<D1Result<Row>> {
    if (!this.sql.includes("FROM reports"))
      return { success: true, results: [] };
    const results = this.db.reports
      .filter((report) => report.status === "pending")
      .map((report) => ({
        id: report.id,
        pharmacy_id: report.pharmacy_id,
        kind: report.kind,
        reasons_json: report.reasons_json,
        details_ciphertext: report.details_ciphertext,
        details_iv: report.details_iv,
        proposed_lat: report.proposed_lat,
        proposed_lon: report.proposed_lon,
        created_at: report.created_at,
        status: report.status,
      }));
    return { success: true, results: results as unknown as Row[] };
  }

  async run(): Promise<D1Result> {
    if (this.sql.includes("INSERT INTO rate_limits")) {
      await this.first();
      return { success: true, meta: { changes: 1 } };
    }
    if (this.sql.includes("INSERT INTO reports")) {
      const [
        id,
        pharmacy_id,
        kind,
        reasons_json,
        details_ciphertext,
        details_iv,
        proposed_lat,
        proposed_lon,
        contact_ciphertext,
        contact_iv,
        installation_hash,
        created_at,
      ] = this.values as [
        string,
        string | null,
        string,
        string,
        string | null,
        string | null,
        number | null,
        number | null,
        string | null,
        string | null,
        string,
        number,
      ];
      this.db.reports.push({
        id,
        pharmacy_id,
        kind,
        reasons_json,
        details_ciphertext,
        details_iv,
        proposed_lat,
        proposed_lon,
        contact_ciphertext,
        contact_iv,
        installation_hash,
        created_at,
        status: "pending",
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (this.sql.includes("DELETE FROM reports")) {
      const [cutoff] = this.values as [number];
      const before = this.db.reports.length;
      const retained = this.db.reports.filter(
        (report) => report.created_at >= cutoff,
      );
      this.db.reports.splice(0, this.db.reports.length, ...retained);
      return { success: true, meta: { changes: before - retained.length } };
    }
    if (this.sql.includes("DELETE FROM rate_limits")) {
      const [cutoff] = this.values as [number];
      for (const [key, value] of this.db.rateLimits) {
        if (value.windowStartedAt < cutoff) this.db.rateLimits.delete(key);
      }
      return { success: true, meta: { changes: 0 } };
    }
    return { success: true, meta: { changes: 0 } };
  }
}

function reportPayload(overrides: Record<string, unknown> = {}) {
  return {
    pharmacy_id: "node/123",
    kind: "correction",
    reasons: ["hours"],
    details: "Les horaires affichés ne correspondent plus.",
    proposed_lat: null,
    proposed_lon: null,
    contact_phone: null,
    contact_consent: false,
    installation_id: INSTALLATION_ID,
    ...overrides,
  };
}

function postReport(
  body: unknown,
  ip = "192.0.2.10",
  origin = "https://localhost",
) {
  return new Request("https://worker.test/reports", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      origin,
    },
    body: JSON.stringify(body),
  });
}

function baseEnv(db: D1Database): Env {
  return {
    DB: db,
    VERSION: "0.1.0",
    RATE_LIMIT_SECRET,
    REPORT_ENCRYPTION_KEY,
    ADMIN_DIGEST_TOKEN,
    REPORTS_ENABLED: "true",
  };
}

describe("Locapharm Worker", () => {
  it("returns health and an honest 404 for unknown routes", async () => {
    const healthy = await worker.fetch(
      new Request("https://worker.test/health"),
      { VERSION: "0.1.0" },
    );
    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toEqual({ status: "ok", version: "0.1.0" });

    const missing = await worker.fetch(
      new Request("https://worker.test/not-yet-available"),
      {},
    );
    expect(missing.status).toBe(404);
  });

  it("accepts a valid report and returns a real reference without echoed details", async () => {
    const db = new FakeD1();
    const response = await worker.fetch(
      postReport(reportPayload()),
      baseEnv(db),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ accepted: true });
    expect(typeof body.reference).toBe("string");
    expect(body).not.toHaveProperty("details");
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0].pharmacy_id).toBe("node/123");
    expect(db.reports[0].details_ciphertext).toBeTruthy();
    expect(db.reports[0].details_ciphertext).not.toContain("horaires");
    expect(
      [...db.rateLimits.keys()].every((key) => !key.includes("192.0.2.10")),
    ).toBe(true);
  });

  it("validates missing-pharmacy coordinates and rejects honeypot submissions", async () => {
    const db = new FakeD1();
    const missingWithoutPin = await worker.fetch(
      postReport(
        reportPayload({
          pharmacy_id: null,
          kind: "missing",
          reasons: ["missing"],
        }),
      ),
      baseEnv(db),
    );
    expect(missingWithoutPin.status).toBe(400);
    expect(await missingWithoutPin.json()).toEqual({
      error: "coordinates_required",
    });

    const trap = await worker.fetch(
      postReport(reportPayload({ website: "automated submission" })),
      baseEnv(db),
    );
    expect(trap.status).toBe(400);
    expect(await trap.json()).toEqual({ error: "invalid_payload" });
    expect(db.reports).toHaveLength(0);
  });

  it("limits reports per installation and rejects unapproved origins", async () => {
    const db = new FakeD1();
    const env = baseEnv(db);
    for (let index = 0; index < 5; index += 1) {
      const accepted = await worker.fetch(postReport(reportPayload()), env);
      expect(accepted.status).toBe(201);
    }
    const limited = await worker.fetch(postReport(reportPayload()), env);
    expect(limited.status).toBe(429);

    const forbidden = await worker.fetch(
      postReport(reportPayload(), "192.0.2.11", "https://untrusted.example"),
      env,
    );
    expect(forbidden.status).toBe(403);
  });

  it("encrypts optional contacts, requires consent, and protects retrieval", async () => {
    const db = new FakeD1();
    const withoutConsent = await worker.fetch(
      postReport(reportPayload({ contact_phone: "+237 699 123 456" })),
      baseEnv(db),
    );
    expect(withoutConsent.status).toBe(400);

    const submitted = await worker.fetch(
      postReport(
        reportPayload({
          contact_phone: "+237 699 123 456",
          contact_consent: true,
        }),
      ),
      baseEnv(db),
    );
    expect(submitted.status).toBe(201);
    const { reference } = (await submitted.json()) as { reference: string };
    const stored = db.reports[0];
    expect(stored.contact_ciphertext).toBeTruthy();
    expect(stored.contact_ciphertext).not.toContain("+237");

    const unauthorized = await worker.fetch(
      new Request(`https://worker.test/admin/pending/${reference}/contact`),
      baseEnv(db),
    );
    expect(unauthorized.status).toBe(401);

    const authorized = await worker.fetch(
      new Request(`https://worker.test/admin/pending/${reference}/contact`, {
        headers: { authorization: `Bearer ${ADMIN_DIGEST_TOKEN}` },
      }),
      baseEnv(db),
    );
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get("cache-control")).toBe("no-store");
    expect(await authorized.json()).toEqual({
      reference,
      contact_phone: "+237 699 123 456",
    });
  });

  it("keeps phone details out of the pending digest response", async () => {
    const db = new FakeD1();
    await worker.fetch(
      postReport(
        reportPayload({
          details: "Rappelez au +237 699 123 456 ou paul@example.cm.",
          contact_phone: "+237 699 123 456",
          contact_consent: true,
        }),
      ),
      baseEnv(db),
    );
    const response = await worker.fetch(
      new Request("https://worker.test/admin/pending", {
        headers: { authorization: `Bearer ${ADMIN_DIGEST_TOKEN}` },
      }),
      baseEnv(db),
    );
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).not.toContain("+237");
    expect(body).not.toContain("contact_ciphertext");
    expect(body).toContain("[contact masqué]");
    expect(body).not.toContain("paul@example.cm");
    expect(body).toContain("[adresse masquée]");
  });

  it("purges reports after the retention period", async () => {
    const db = new FakeD1();
    const now = Math.floor(Date.now() / 1000);
    db.reports.push(
      {
        id: "expired",
        pharmacy_id: "osm:node/1",
        kind: "correction",
        reasons_json: '["hours"]',
        details_ciphertext: null,
        details_iv: null,
        proposed_lat: null,
        proposed_lon: null,
        contact_ciphertext: null,
        contact_iv: null,
        installation_hash: "a".repeat(64),
        created_at: now - 31 * 24 * 60 * 60,
        status: "pending",
      },
      {
        id: "recent",
        pharmacy_id: "osm:node/2",
        kind: "correction",
        reasons_json: '["hours"]',
        details_ciphertext: null,
        details_iv: null,
        proposed_lat: null,
        proposed_lon: null,
        contact_ciphertext: null,
        contact_iv: null,
        installation_hash: "b".repeat(64),
        created_at: now - 2 * 24 * 60 * 60,
        status: "pending",
      },
    );
    const jobs: Promise<unknown>[] = [];
    await worker.scheduled(
      { scheduledTime: now * 1000, cron: "0 3 * * *" },
      { DB: db },
      { waitUntil: (job) => jobs.push(job) },
    );
    await Promise.all(jobs);
    expect(db.reports.map((report) => report.id)).toEqual(["recent"]);
  });
});
