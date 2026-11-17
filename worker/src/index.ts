import emergencyDirectory from "../../data/emergency.json";

export interface D1Result<Row = unknown> {
  success: boolean;
  results?: Row[];
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<Row = Record<string, unknown>>(): Promise<Row | null>;
  all<Row = Record<string, unknown>>(): Promise<D1Result<Row>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

export interface Env {
  DB?: D1Database;
  VERSION?: string;
  APP_ORIGINS?: string;
  RATE_LIMIT_SECRET?: string;
  REPORT_ENCRYPTION_KEY?: string;
  ADMIN_DIGEST_TOKEN?: string;
  NEGATIVE_VOTE_THRESHOLD?: string;
  DUTY_WARNING_DAYS?: string;
  MAX_SEARCH_RADIUS_KM?: string;
  MINIMUM_APP_VERSION?: string;
  PUBLIC_NOTICE?: string;
  REPORTS_ENABLED?: string;
  VOTES_ENABLED?: string;
  FEEDBACK_ENABLED?: string;
}

type ReportKind = "correction" | "missing" | "duty_list";
type ReportReason =
  | "phone"
  | "address"
  | "hours"
  | "closed"
  | "duty"
  | "missing"
  | "access";

interface ReportPayload {
  pharmacy_id: string | null;
  kind: ReportKind;
  reasons: ReportReason[];
  details: string;
  proposed_lat: number | null;
  proposed_lon: number | null;
  contact_phone: string | null;
  installation_id: string;
}

interface VotePayload {
  pharmacy_id: string;
  duty_window_id: string;
  vote: "on_duty" | "closed";
  installation_id: string;
}

interface FeedbackPayload {
  message: string;
  diagnostics: Record<string, string>;
  diagnostics_opt_in: boolean;
  installation_id: string;
}

interface PendingReportRow {
  id: string;
  pharmacy_id: string | null;
  kind: ReportKind;
  reasons_json: string;
  details_ciphertext: string | null;
  details_iv: string | null;
  proposed_lat: number | null;
  proposed_lon: number | null;
  created_at: number;
  status: string;
}

interface PendingFeedbackRow {
  id: string;
  message_ciphertext: string;
  message_iv: string;
  diagnostics_json: string;
  diagnostics_opt_in: number;
  created_at: number;
  status: string;
}

const DEFAULT_ORIGINS = [
  "https://pauldjeuda.github.io",
  "https://localhost",
  "capacitor://localhost",
];
const MAX_BODY_BYTES = 16 * 1024;
const RATE_WINDOW_SECONDS = 60 * 60;
const REPORT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const RATE_RETENTION_SECONDS = 24 * 60 * 60;
const ALLOWED_REASONS = new Set<ReportReason>([
  "phone",
  "address",
  "hours",
  "closed",
  "duty",
  "missing",
  "access",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigins = parseOrigins(env.APP_ORIGINS);

    if (origin && !allowedOrigins.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403);
    }
    if (request.method === "OPTIONS") {
      return preflight(origin);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json(
        { status: "ok", version: env.VERSION ?? "0.1.0" },
        200,
        origin,
        { "cache-control": "public, max-age=60" },
      );
    }

    if (url.pathname === "/config" && request.method === "GET") {
      return publicConfig(env, origin);
    }

    if (url.pathname === "/reports" && request.method === "POST") {
      return submitReport(request, env, origin);
    }

    if (url.pathname === "/votes" && request.method === "POST") {
      return submitVote(request, env, origin);
    }

    if (url.pathname === "/votes/summary" && request.method === "GET") {
      return getVoteSummary(request, env, origin);
    }

    if (url.pathname === "/feedback" && request.method === "POST") {
      return submitFeedback(request, env, origin);
    }

    if (url.pathname === "/admin/pending" && request.method === "GET") {
      return listPendingReports(request, env, origin);
    }

    if (url.pathname === "/admin/feedback" && request.method === "GET") {
      return listPendingFeedback(request, env, origin);
    }

    const reportMatch = url.pathname.match(
      /^\/admin\/pending\/([\da-f-]{36})$/i,
    );
    if (reportMatch && request.method === "PATCH") {
      return updatePendingStatus(
        request,
        env,
        origin,
        "reports",
        reportMatch[1],
      );
    }

    const feedbackMatch = url.pathname.match(
      /^\/admin\/feedback\/([\da-f-]{36})$/i,
    );
    if (feedbackMatch && request.method === "PATCH") {
      return updatePendingStatus(
        request,
        env,
        origin,
        "feedback",
        feedbackMatch[1],
      );
    }

    const contactMatch = url.pathname.match(
      /^\/admin\/pending\/([\da-f-]{36})\/contact$/i,
    );
    if (contactMatch && request.method === "GET") {
      return readReportContact(request, env, origin, contactMatch[1]);
    }

    return json({ error: "not_found" }, 404, origin);
  },

  async scheduled(
    _controller: { scheduledTime: number; cron: string },
    env: Env,
    context: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<void> {
    if (env.DB) {
      context.waitUntil(
        purgeExpiredRecords(env.DB, Math.floor(Date.now() / 1000)),
      );
    }
  },
};

function publicConfig(env: Env, origin: string | null): Response {
  const hasRateLimitSecret = Boolean(
    env.RATE_LIMIT_SECRET && env.RATE_LIMIT_SECRET.length >= 32,
  );
  const config = {
    schema_version: 1,
    worker_version: env.VERSION ?? "0.1.0",
    emergency: {
      last_checked: emergencyDirectory.last_checked,
      source: emergencyDirectory.source,
      contacts: emergencyDirectory.contacts,
    },
    thresholds: {
      duty_warning_days: boundedInteger(env.DUTY_WARNING_DAYS, 7, 1, 30),
      max_search_radius_km: boundedInteger(env.MAX_SEARCH_RADIUS_KM, 20, 1, 20),
      negative_votes_24h: voteWarningThreshold(env.NEGATIVE_VOTE_THRESHOLD),
    },
    features: {
      report_submission:
        env.REPORTS_ENABLED === "true" &&
        Boolean(
          env.DB &&
            hasRateLimitSecret &&
            env.ADMIN_DIGEST_TOKEN &&
            hasValidEncryptionKey(env.REPORT_ENCRYPTION_KEY),
        ),
      community_votes:
        env.VOTES_ENABLED === "true" && Boolean(env.DB && hasRateLimitSecret),
      feedback_submission:
        env.FEEDBACK_ENABLED === "true" &&
        Boolean(
          env.DB &&
            hasRateLimitSecret &&
            env.ADMIN_DIGEST_TOKEN &&
            hasValidEncryptionKey(env.REPORT_ENCRYPTION_KEY),
        ),
      routing: false,
    },
    minimum_app_version: validAppVersion(env.MINIMUM_APP_VERSION),
    notice: safeNotice(env.PUBLIC_NOTICE),
  };
  return json(config, 200, origin, {
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
  });
}

function boundedInteger(
  configured: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(configured);
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function voteWarningThreshold(configured?: string): number {
  return boundedInteger(configured, 3, 1, 20);
}

function validAppVersion(configured?: string): string | null {
  return configured && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(configured)
    ? configured
    : null;
}

function safeNotice(configured?: string): string | null {
  if (!configured) return null;
  const notice = configured.trim();
  if (
    !notice ||
    notice.length > 240 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(notice)
  ) {
    return null;
  }
  return notice;
}

function hasValidEncryptionKey(encoded?: string): boolean {
  if (!encoded) return false;
  try {
    return base64ToBytes(encoded).byteLength === 32;
  } catch {
    return false;
  }
}

async function submitReport(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  if (
    env.REPORTS_ENABLED !== "true" ||
    !env.DB ||
    !env.ADMIN_DIGEST_TOKEN ||
    !env.RATE_LIMIT_SECRET ||
    env.RATE_LIMIT_SECRET.length < 32 ||
    !hasValidEncryptionKey(env.REPORT_ENCRYPTION_KEY)
  ) {
    return json({ error: "report_service_unavailable" }, 503, origin);
  }
  if (!isJsonRequest(request))
    return json({ error: "json_required" }, 415, origin);

  const ipAddress = request.headers.get("CF-Connecting-IP");
  if (!ipAddress) return json({ error: "request_unavailable" }, 503, origin);

  const now = Math.floor(Date.now() / 1000);
  let ipBucket: string;
  try {
    ipBucket = await hmacHex(env.RATE_LIMIT_SECRET, `ip:${ipAddress}`);
    if (!(await withinRateLimit(env.DB, ipBucket, now, 20))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }
  } catch {
    return json({ error: "report_service_unavailable" }, 503, origin);
  }

  const payloadResult = await readReportPayload(request);
  if ("error" in payloadResult) {
    return json(
      { error: payloadResult.error },
      payloadResult.error === "payload_too_large" ? 413 : 400,
      origin,
    );
  }
  const payload = payloadResult.payload;

  try {
    const installBucket = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `install:${payload.installation_id}`,
    );
    if (!(await withinRateLimit(env.DB, installBucket, now, 5))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }

    const reportEncryptionKey = env.REPORT_ENCRYPTION_KEY;
    if ((payload.details || payload.contact_phone) && !reportEncryptionKey) {
      return json({ error: "report_encryption_unavailable" }, 503, origin);
    }

    let encryptedDetails: { ciphertext: string; iv: string } | null = null;
    let encryptedContact: { ciphertext: string; iv: string } | null = null;
    if (payload.details && reportEncryptionKey) {
      try {
        encryptedDetails = await encryptText(
          payload.details,
          reportEncryptionKey,
        );
      } catch {
        return json({ error: "report_encryption_unavailable" }, 503, origin);
      }
    }
    if (payload.contact_phone && reportEncryptionKey) {
      try {
        encryptedContact = await encryptText(
          payload.contact_phone,
          reportEncryptionKey,
        );
      } catch {
        return json({ error: "contact_storage_unavailable" }, 503, origin);
      }
    }

    const reference = crypto.randomUUID();
    const result = await env.DB.prepare(
      `INSERT INTO reports (
        id, pharmacy_id, kind, reasons_json, details_ciphertext, details_iv,
        proposed_lat, proposed_lon,
        contact_ciphertext, contact_iv, installation_hash, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(
        reference,
        payload.pharmacy_id,
        payload.kind,
        JSON.stringify(payload.reasons),
        encryptedDetails?.ciphertext ?? null,
        encryptedDetails?.iv ?? null,
        payload.proposed_lat,
        payload.proposed_lon,
        encryptedContact?.ciphertext ?? null,
        encryptedContact?.iv ?? null,
        installBucket,
        now,
      )
      .run();

    if (!result.success) throw new Error("insert_failed");
    return json({ accepted: true, reference }, 201, origin);
  } catch {
    return json({ error: "report_service_unavailable" }, 503, origin);
  }
}

async function readReportPayload(
  request: Request,
): Promise<{ payload: ReportPayload } | { error: string }> {
  const parsed = await readLimitedJson(request, MAX_BODY_BYTES);
  if ("error" in parsed) return { error: parsed.error };
  const value = parsed.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "invalid_payload" };
  }

  const input = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "pharmacy_id",
    "kind",
    "reasons",
    "details",
    "proposed_lat",
    "proposed_lon",
    "contact_phone",
    "contact_consent",
    "installation_id",
    "website",
  ]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { error: "invalid_payload" };
  }
  if (
    (input.website !== undefined && typeof input.website !== "string") ||
    (typeof input.website === "string" && input.website.trim())
  ) {
    return { error: "invalid_payload" };
  }
  const kind = input.kind;
  if (kind !== "correction" && kind !== "missing" && kind !== "duty_list") {
    return { error: "invalid_kind" };
  }
  const pharmacyId = input.pharmacy_id;
  if (
    pharmacyId !== null &&
    (typeof pharmacyId !== "string" ||
      !/^(?:osm:)?(?:node|way|relation)\/\d{1,20}$/.test(pharmacyId))
  ) {
    return { error: "invalid_pharmacy_id" };
  }
  if (kind === "missing" && pharmacyId !== null) {
    return { error: "invalid_pharmacy_id" };
  }
  if (kind !== "missing" && pharmacyId === null) {
    return { error: "invalid_pharmacy_id" };
  }

  if (
    !Array.isArray(input.reasons) ||
    input.reasons.length < 1 ||
    input.reasons.length > 7 ||
    input.reasons.some(
      (reason) =>
        typeof reason !== "string" ||
        !ALLOWED_REASONS.has(reason as ReportReason),
    ) ||
    new Set(input.reasons).size !== input.reasons.length
  ) {
    return { error: "invalid_reasons" };
  }
  if (kind === "missing" && !input.reasons.includes("missing")) {
    return { error: "invalid_reasons" };
  }
  if (kind !== "missing" && input.reasons.includes("missing")) {
    return { error: "invalid_reasons" };
  }

  const details = input.details === undefined ? "" : input.details;
  if (typeof details !== "string" || details.length > 500) {
    return { error: "invalid_details" };
  }
  const proposedLat = input.proposed_lat ?? null;
  const proposedLon = input.proposed_lon ?? null;
  if (
    (proposedLat === null) !== (proposedLon === null) ||
    (proposedLat !== null &&
      (typeof proposedLat !== "number" ||
        typeof proposedLon !== "number" ||
        !Number.isFinite(proposedLat) ||
        !Number.isFinite(proposedLon) ||
        proposedLat < 1.3 ||
        proposedLat > 13.5 ||
        proposedLon < 8 ||
        proposedLon > 16.5))
  ) {
    return { error: "invalid_coordinates" };
  }
  if (kind === "missing" && proposedLat === null) {
    return { error: "coordinates_required" };
  }

  const phone = input.contact_phone ?? null;
  if (
    input.contact_consent !== undefined &&
    typeof input.contact_consent !== "boolean"
  ) {
    return { error: "invalid_contact_consent" };
  }
  const contactConsent = input.contact_consent === true;
  if (contactConsent && phone === null) {
    return { error: "invalid_contact_consent" };
  }
  if (
    phone !== null &&
    (typeof phone !== "string" ||
      !contactConsent ||
      phone.replace(/\D/g, "").length < 7 ||
      phone.replace(/\D/g, "").length > 15 ||
      !/^\+?[\d\s().-]+$/.test(phone.trim()))
  ) {
    return { error: "invalid_contact" };
  }

  const installationId = input.installation_id;
  if (
    typeof installationId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      installationId,
    )
  ) {
    return { error: "invalid_installation_id" };
  }

  return {
    payload: {
      pharmacy_id: pharmacyId as string | null,
      kind,
      reasons: input.reasons as ReportReason[],
      details: details.trim(),
      proposed_lat: proposedLat as number | null,
      proposed_lon: proposedLon as number | null,
      contact_phone: phone ? phone.trim() : null,
      installation_id: installationId,
    },
  };
}

async function readLimitedJson(
  request: Request,
  maxBytes: number,
): Promise<{ value: unknown } | { error: string }> {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { error: "payload_too_large" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { error: "invalid_json" };
  const decoder = new TextDecoder();
  let raw = "";
  let bytesRead = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        return { error: "payload_too_large" };
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return { error: "invalid_json" };
  } finally {
    reader.releaseLock();
  }

  try {
    return { value: JSON.parse(raw) as unknown };
  } catch {
    return { error: "invalid_json" };
  }
}

async function readVotePayload(
  request: Request,
): Promise<{ payload: VotePayload } | { error: string }> {
  const parsed = await readLimitedJson(request, 4 * 1024);
  if ("error" in parsed) return { error: parsed.error };
  if (
    !parsed.value ||
    typeof parsed.value !== "object" ||
    Array.isArray(parsed.value)
  ) {
    return { error: "invalid_payload" };
  }

  const input = parsed.value as Record<string, unknown>;
  const allowedKeys = new Set([
    "pharmacy_id",
    "duty_window_id",
    "vote",
    "installation_id",
    "website",
  ]);
  if (
    Object.keys(input).some((key) => !allowedKeys.has(key)) ||
    (input.website !== undefined && typeof input.website !== "string") ||
    (typeof input.website === "string" && input.website.trim())
  ) {
    return { error: "invalid_payload" };
  }

  const pharmacyId = input.pharmacy_id;
  if (
    typeof pharmacyId !== "string" ||
    !/^(?:osm:)?(?:node|way|relation)\/\d{1,20}$/.test(pharmacyId)
  ) {
    return { error: "invalid_pharmacy_id" };
  }
  const dutyWindowId = input.duty_window_id;
  if (
    typeof dutyWindowId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      dutyWindowId,
    )
  ) {
    return { error: "invalid_duty_window_id" };
  }
  if (input.vote !== "on_duty" && input.vote !== "closed") {
    return { error: "invalid_vote" };
  }
  const installationId = input.installation_id;
  if (
    typeof installationId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      installationId,
    )
  ) {
    return { error: "invalid_installation_id" };
  }

  return {
    payload: {
      pharmacy_id: pharmacyId,
      duty_window_id: dutyWindowId,
      vote: input.vote,
      installation_id: installationId,
    },
  };
}

async function readFeedbackPayload(
  request: Request,
): Promise<{ payload: FeedbackPayload } | { error: string }> {
  const parsed = await readLimitedJson(request, 8 * 1024);
  if ("error" in parsed) return { error: parsed.error };
  if (
    !parsed.value ||
    typeof parsed.value !== "object" ||
    Array.isArray(parsed.value)
  ) {
    return { error: "invalid_payload" };
  }

  const input = parsed.value as Record<string, unknown>;
  const allowedKeys = new Set([
    "message",
    "diagnostics_opt_in",
    "diagnostics",
    "installation_id",
    "website",
  ]);
  if (
    Object.keys(input).some((key) => !allowedKeys.has(key)) ||
    (input.website !== undefined && typeof input.website !== "string") ||
    (typeof input.website === "string" && input.website.trim())
  ) {
    return { error: "invalid_payload" };
  }

  const message = input.message;
  if (typeof message !== "string" || message.trim().length < 1 || message.length > 1000) {
    return { error: "invalid_message" };
  }
  const diagnosticsOptIn = input.diagnostics_opt_in;
  if (typeof diagnosticsOptIn !== "boolean") {
    return { error: "diagnostics_consent_required" };
  }
  const diagnostics: Record<string, string> = {};
  if (diagnosticsOptIn) {
    if (
      !input.diagnostics ||
      typeof input.diagnostics !== "object" ||
      Array.isArray(input.diagnostics)
    ) {
      return { error: "invalid_diagnostics" };
    }
    const source = input.diagnostics as Record<string, unknown>;
    const allowedDiagnosticKeys = new Set([
      "app_version",
      "platform",
      "locale",
      "network",
      "error_code",
    ]);
    if (Object.keys(source).some((key) => !allowedDiagnosticKeys.has(key))) {
      return { error: "invalid_diagnostics" };
    }
    if (source.app_version !== undefined) {
      if (
        typeof source.app_version !== "string" ||
        !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(source.app_version)
      ) {
        return { error: "invalid_diagnostics" };
      }
      diagnostics.app_version = source.app_version;
    }
    if (source.platform !== undefined) {
      if (source.platform !== "android" && source.platform !== "web") {
        return { error: "invalid_diagnostics" };
      }
      diagnostics.platform = source.platform;
    }
    if (source.locale !== undefined) {
      if (source.locale !== "fr" && source.locale !== "en") {
        return { error: "invalid_diagnostics" };
      }
      diagnostics.locale = source.locale;
    }
    if (source.network !== undefined) {
      if (
        source.network !== "online" &&
        source.network !== "offline" &&
        source.network !== "unknown"
      ) {
        return { error: "invalid_diagnostics" };
      }
      diagnostics.network = source.network;
    }
    if (source.error_code !== undefined) {
      if (
        typeof source.error_code !== "string" ||
        ![
          "api_unavailable",
          "pack_download_failed",
          "local_storage_error",
          "map_unavailable",
          "unknown",
        ].includes(source.error_code)
      ) {
        return { error: "invalid_diagnostics" };
      }
      diagnostics.error_code = source.error_code;
    }
    if (Object.keys(diagnostics).length === 0) {
      return { error: "empty_diagnostics" };
    }
  } else if (
    input.diagnostics !== undefined &&
    input.diagnostics !== null &&
    (typeof input.diagnostics !== "object" ||
      Array.isArray(input.diagnostics) ||
      Object.keys(input.diagnostics).length > 0)
  ) {
    return { error: "diagnostics_without_consent" };
  }

  const installationId = input.installation_id;
  if (
    typeof installationId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      installationId,
    )
  ) {
    return { error: "invalid_installation_id" };
  }

  return {
    payload: {
      message: message.trim(),
      diagnostics,
      diagnostics_opt_in: diagnosticsOptIn,
      installation_id: installationId,
    },
  };
}

async function submitVote(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  if (env.VOTES_ENABLED !== "true") {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
  if (!isJsonRequest(request))
    return json({ error: "json_required" }, 415, origin);
  if (!env.DB || !env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
  const ipAddress = request.headers.get("CF-Connecting-IP");
  if (!ipAddress) return json({ error: "request_unavailable" }, 503, origin);

  const parsed = await readVotePayload(request);
  if ("error" in parsed) {
    return json(
      { error: parsed.error },
      parsed.error === "payload_too_large" ? 413 : 400,
      origin,
    );
  }
  const payload = parsed.payload;
  const now = Math.floor(Date.now() / 1000);

  try {
    const ipBucket = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `vote-ip:${ipAddress}`,
    );
    if (!(await withinRateLimit(env.DB, ipBucket, now, 20))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }
    const installationHash = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `vote-install:${payload.installation_id}`,
    );
    if (!(await withinRateLimit(env.DB, installationHash, now, 5))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO votes (
        id, pharmacy_id, duty_window_id, vote, installation_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        payload.pharmacy_id,
        payload.duty_window_id,
        payload.vote,
        installationHash,
        now,
      )
      .run();
    if (!result.success) throw new Error("vote_insert_failed");
    if (result.meta?.changes === 0) {
      return json({ error: "vote_already_recorded" }, 409, origin);
    }
    if (typeof result.meta?.changes !== "number") {
      throw new Error("vote_insert_result_missing");
    }
    return json({ accepted: true }, 201, origin);
  } catch {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
}

async function submitFeedback(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  const encryptionKey = env.REPORT_ENCRYPTION_KEY;
  if (
    env.FEEDBACK_ENABLED !== "true" ||
    !env.DB ||
    !env.ADMIN_DIGEST_TOKEN ||
    !env.RATE_LIMIT_SECRET ||
    env.RATE_LIMIT_SECRET.length < 32 ||
    !encryptionKey ||
    !hasValidEncryptionKey(encryptionKey)
  ) {
    return json({ error: "feedback_service_unavailable" }, 503, origin);
  }
  if (!isJsonRequest(request))
    return json({ error: "json_required" }, 415, origin);
  const ipAddress = request.headers.get("CF-Connecting-IP");
  if (!ipAddress) return json({ error: "request_unavailable" }, 503, origin);

  const parsed = await readFeedbackPayload(request);
  if ("error" in parsed) {
    return json(
      { error: parsed.error },
      parsed.error === "payload_too_large" ? 413 : 400,
      origin,
    );
  }
  const payload = parsed.payload;
  const now = Math.floor(Date.now() / 1000);

  try {
    const ipBucket = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `feedback-ip:${ipAddress}`,
    );
    if (!(await withinRateLimit(env.DB, ipBucket, now, 10))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }
    const installationHash = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `feedback-install:${payload.installation_id}`,
    );
    if (!(await withinRateLimit(env.DB, installationHash, now, 3))) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }

    const encryptedMessage = await encryptText(
      payload.message,
      encryptionKey,
    );
    const reference = crypto.randomUUID();
    const result = await env.DB.prepare(
      `INSERT INTO feedback (
        id, message_ciphertext, message_iv, diagnostics_json,
        diagnostics_opt_in, installation_hash, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(
        reference,
        encryptedMessage.ciphertext,
        encryptedMessage.iv,
        JSON.stringify(payload.diagnostics),
        payload.diagnostics_opt_in ? 1 : 0,
        installationHash,
        now,
      )
      .run();
    if (!result.success) throw new Error("feedback_insert_failed");
    return json({ accepted: true, reference }, 201, origin);
  } catch {
    return json({ error: "feedback_service_unavailable" }, 503, origin);
  }
}

async function getVoteSummary(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  if (env.VOTES_ENABLED !== "true") {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
  if (!env.DB || !env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
  const ipAddress = request.headers.get("CF-Connecting-IP");
  if (!ipAddress) return json({ error: "request_unavailable" }, 503, origin);

  const url = new URL(request.url);
  const pharmacyId = url.searchParams.get("pharmacy_id");
  const dutyWindowId = url.searchParams.get("duty_window_id");
  if (
    !pharmacyId ||
    !/^(?:osm:)?(?:node|way|relation)\/\d{1,20}$/.test(pharmacyId) ||
    !dutyWindowId ||
    !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      dutyWindowId,
    )
  ) {
    return json({ error: "invalid_vote_scope" }, 400, origin);
  }

  try {
    const bucket = await hmacHex(
      env.RATE_LIMIT_SECRET,
      `vote-summary-ip:${ipAddress}`,
    );
    if (
      !(await withinRateLimit(
        env.DB,
        bucket,
        Math.floor(Date.now() / 1000),
        60,
      ))
    ) {
      return json({ error: "rate_limited" }, 429, origin, {
        "retry-after": String(RATE_WINDOW_SECONDS),
      });
    }
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS negative_count FROM votes
       WHERE pharmacy_id = ? AND duty_window_id = ? AND vote = 'closed'
       AND created_at >= ?`,
    )
      .bind(
        pharmacyId,
        dutyWindowId,
        Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      )
      .first<{ negative_count: number }>();
    if (!row || typeof row.negative_count !== "number") {
      throw new Error("vote_summary_missing");
    }
    const threshold = voteWarningThreshold(env.NEGATIVE_VOTE_THRESHOLD);
    return json(
      { show_caution: row.negative_count >= threshold, threshold },
      200,
      origin,
      { "cache-control": "no-store" },
    );
  } catch {
    return json({ error: "vote_service_unavailable" }, 503, origin);
  }
}

async function listPendingReports(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  if (!authorizedAdmin(request, env)) {
    return json(
      { error: env.ADMIN_DIGEST_TOKEN ? "unauthorized" : "not_found" },
      env.ADMIN_DIGEST_TOKEN ? 401 : 404,
      origin,
    );
  }
  if (!env.DB)
    return json({ error: "report_service_unavailable" }, 503, origin);

  try {
    const includeDetails =
      new URL(request.url).searchParams.get("include_details") !== "0";
    const result = await env.DB.prepare(
      `SELECT id, pharmacy_id, kind, reasons_json, details_ciphertext, details_iv,
        proposed_lat, proposed_lon,
        created_at, status FROM reports
        WHERE status = 'pending' ORDER BY created_at ASC, id ASC LIMIT 101`,
    ).all<PendingReportRow>();
    if (!result.success) throw new Error("query_failed");
    const pendingRows = result.results ?? [];
    const hasMore = pendingRows.length > 100;
    const reports = await Promise.all(
      pendingRows.slice(0, 100).map(async (report) => {
        let details: string | null = null;
        if (includeDetails && report.details_ciphertext && report.details_iv) {
          if (!env.REPORT_ENCRYPTION_KEY) {
            throw new Error("report_encryption_unavailable");
          }
          details = redactContactLikeText(
            await decryptText(
              report.details_ciphertext,
              report.details_iv,
              env.REPORT_ENCRYPTION_KEY,
            ),
          );
        }
        return {
          id: report.id,
          pharmacy_id: report.pharmacy_id,
          kind: report.kind,
          reasons_json: report.reasons_json,
          details,
          proposed_lat: report.proposed_lat,
          proposed_lon: report.proposed_lon,
          created_at: report.created_at,
          status: report.status,
        };
      }),
    );
    return json({ reports, has_more: hasMore }, 200, origin, {
      "cache-control": "no-store",
    });
  } catch {
    return json({ error: "report_service_unavailable" }, 503, origin);
  }
}

async function listPendingFeedback(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  if (!authorizedAdmin(request, env)) {
    return json(
      { error: env.ADMIN_DIGEST_TOKEN ? "unauthorized" : "not_found" },
      env.ADMIN_DIGEST_TOKEN ? 401 : 404,
      origin,
    );
  }
  if (!env.DB || !env.REPORT_ENCRYPTION_KEY) {
    return json({ error: "feedback_service_unavailable" }, 503, origin);
  }

  try {
    const includeMessage =
      new URL(request.url).searchParams.get("include_details") !== "0";
    const result = await env.DB.prepare(
      `SELECT id, message_ciphertext, message_iv, diagnostics_json,
        diagnostics_opt_in, created_at, status FROM feedback
        WHERE status = 'pending' ORDER BY created_at ASC, id ASC LIMIT 101`,
    ).all<PendingFeedbackRow>();
    if (!result.success) throw new Error("feedback_query_failed");
    const pendingRows = result.results ?? [];
    const hasMore = pendingRows.length > 100;
    const feedback = await Promise.all(
      pendingRows.slice(0, 100).map(async (entry) => {
        let message: string | null = null;
        if (includeMessage) {
          message = redactContactLikeText(
            await decryptText(
              entry.message_ciphertext,
              entry.message_iv,
              env.REPORT_ENCRYPTION_KEY as string,
            ),
          );
        }
        const diagnostics: unknown = JSON.parse(entry.diagnostics_json);
        if (
          !diagnostics ||
          typeof diagnostics !== "object" ||
          Array.isArray(diagnostics)
        ) {
          throw new Error("invalid_stored_diagnostics");
        }
        return {
          id: entry.id,
          message,
          diagnostics,
          diagnostics_opt_in: entry.diagnostics_opt_in === 1,
          created_at: entry.created_at,
          status: entry.status,
        };
      }),
    );
    return json({ feedback, has_more: hasMore }, 200, origin, {
      "cache-control": "no-store",
    });
  } catch {
    return json({ error: "feedback_service_unavailable" }, 503, origin);
  }
}

async function readReportContact(
  request: Request,
  env: Env,
  origin: string | null,
  reference: string,
): Promise<Response> {
  if (!authorizedAdmin(request, env)) {
    return json(
      { error: env.ADMIN_DIGEST_TOKEN ? "unauthorized" : "not_found" },
      env.ADMIN_DIGEST_TOKEN ? 401 : 404,
      origin,
    );
  }
  if (!env.DB || !env.REPORT_ENCRYPTION_KEY) {
    return json({ error: "contact_unavailable" }, 404, origin);
  }

  try {
    const row = await env.DB.prepare(
      `SELECT contact_ciphertext, contact_iv FROM reports WHERE id = ?`,
    )
      .bind(reference)
      .first<{
        contact_ciphertext: string | null;
        contact_iv: string | null;
      }>();
    if (!row?.contact_ciphertext || !row.contact_iv) {
      return json({ error: "contact_not_found" }, 404, origin);
    }
    const phone = await decryptText(
      row.contact_ciphertext,
      row.contact_iv,
      env.REPORT_ENCRYPTION_KEY,
    );
    return json({ reference, contact_phone: phone }, 200, origin, {
      "cache-control": "no-store",
    });
  } catch {
    return json({ error: "contact_unavailable" }, 503, origin);
  }
}

async function updatePendingStatus(
  request: Request,
  env: Env,
  origin: string | null,
  table: "reports" | "feedback",
  reference: string,
): Promise<Response> {
  if (!authorizedAdmin(request, env)) {
    return json(
      { error: env.ADMIN_DIGEST_TOKEN ? "unauthorized" : "not_found" },
      env.ADMIN_DIGEST_TOKEN ? 401 : 404,
      origin,
    );
  }
  if (!env.DB)
    return json({ error: "report_service_unavailable" }, 503, origin);
  if (!isJsonRequest(request))
    return json({ error: "json_required" }, 415, origin);

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 1024) {
    return json({ error: "payload_too_large" }, 413, origin);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1024) {
      return json({ error: "payload_too_large" }, 413, origin);
    }
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }
  const update = body as Record<string, unknown> | null;
  const status = update?.status;
  if (
    !update ||
    typeof update !== "object" ||
    Array.isArray(update) ||
    Object.keys(update).length !== 1 ||
    (status !== "resolved" && status !== "ignored")
  ) {
    return json({ error: "invalid_status" }, 400, origin);
  }

  try {
    const result = await env.DB.prepare(
      `UPDATE ${table} SET status = ? WHERE id = ? AND status = 'pending'`,
    )
      .bind(status, reference)
      .run();
    if (!result.success) throw new Error("status_update_failed");
    if (!result.meta?.changes) {
      return json({ error: "record_not_pending" }, 404, origin);
    }
    return json({ reference, status }, 200, origin, {
      "cache-control": "no-store",
    });
  } catch {
    return json({ error: "moderation_service_unavailable" }, 503, origin);
  }
}

async function withinRateLimit(
  db: D1Database,
  bucket: string,
  now: number,
  limit: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket_hash, window_started_at, hit_count)
       VALUES (?, ?, 1)
       ON CONFLICT(bucket_hash) DO UPDATE SET
         hit_count = CASE
           WHEN rate_limits.window_started_at <= ? THEN 1
           ELSE rate_limits.hit_count + 1
         END,
         window_started_at = CASE
           WHEN rate_limits.window_started_at <= ? THEN excluded.window_started_at
           ELSE rate_limits.window_started_at
         END
       RETURNING hit_count`,
    )
    .bind(bucket, now, now - RATE_WINDOW_SECONDS, now - RATE_WINDOW_SECONDS)
    .first<{ hit_count: number }>();
  if (!row || typeof row.hit_count !== "number") {
    throw new Error("rate_limit_counter_missing");
  }
  return row.hit_count <= limit;
}

async function purgeExpiredRecords(db: D1Database, now: number): Promise<void> {
  const expiredReports = await db
    .prepare(`DELETE FROM reports WHERE created_at < ?`)
    .bind(now - REPORT_RETENTION_SECONDS)
    .run();
  const expiredFeedback = await db
    .prepare(`DELETE FROM feedback WHERE created_at < ?`)
    .bind(now - REPORT_RETENTION_SECONDS)
    .run();
  const expiredVotes = await db
    .prepare(`DELETE FROM votes WHERE created_at < ?`)
    .bind(now - REPORT_RETENTION_SECONDS)
    .run();
  const expiredRateLimits = await db
    .prepare(`DELETE FROM rate_limits WHERE window_started_at < ?`)
    .bind(now - RATE_RETENTION_SECONDS)
    .run();
  if (
    !expiredReports.success ||
    !expiredFeedback.success ||
    !expiredVotes.success ||
    !expiredRateLimits.success
  ) {
    throw new Error("retention_cleanup_failed");
  }
}

async function encryptText(
  value: string,
  encodedKey: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importReportKey(encodedKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

async function decryptText(
  ciphertext: string,
  iv: string,
  encodedKey: string,
): Promise<string> {
  const key = await importReportKey(encodedKey, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

async function importReportKey(
  encodedKey: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const rawKey = base64ToBytes(encodedKey);
  if (rawKey.byteLength !== 32) throw new Error("invalid_key");
  return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, usages);
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const result = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(result));
}

function authorizedAdmin(request: Request, env: Env): boolean {
  const expected = env.ADMIN_DIGEST_TOKEN;
  if (!expected) return false;
  const supplied = request.headers.get("Authorization") ?? "";
  const prefix = "Bearer ";
  return (
    supplied.startsWith(prefix) &&
    constantTimeEqual(supplied.slice(prefix.length), expected)
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function redactContactLikeText(value: string): string {
  return value
    .replace(/(?:\+|00)?\d(?:[\s().-]*\d){6,14}/g, "[contact masqué]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[adresse masquée]");
}

function isJsonRequest(request: Request): boolean {
  return (
    (request.headers.get("Content-Type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase() === "application/json"
  );
}

function parseOrigins(configured?: string): Set<string> {
  return new Set(
    (configured ? configured.split(",") : DEFAULT_ORIGINS)
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function preflight(origin: string | null): Response {
  const headers = securityHeaders();
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, PATCH, POST, OPTIONS");
    headers.set("access-control-allow-headers", "Authorization, Content-Type");
    headers.set("access-control-max-age", "600");
    headers.set("vary", "Origin");
  }
  return new Response(null, { status: 204, headers });
}

function json(
  body: unknown,
  status: number,
  origin?: string | null,
  additionalHeaders?: Record<string, string>,
): Response {
  const headers = securityHeaders();
  headers.set("content-type", "application/json; charset=utf-8");
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  for (const [name, value] of Object.entries(additionalHeaders ?? {})) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function securityHeaders(): Headers {
  return new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
