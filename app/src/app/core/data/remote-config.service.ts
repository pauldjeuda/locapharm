import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom, timeout } from "rxjs";

const RUNTIME_CONFIG_URL = "runtime-config.json";
const REQUEST_TIMEOUT_MS = 3500;

export interface RemoteEmergencyContact {
  id: string;
  name_fr: string;
  name_en: string;
  mobile: string;
  landline: string;
  scope_fr: string;
  scope_en: string;
}

export interface RemoteEmergencyDirectory {
  schema_version: 1;
  last_checked: string;
  source: { name: string; url: string };
  contacts: RemoteEmergencyContact[];
}

export interface PublicAppConfig {
  schema_version: 1;
  worker_version: string;
  emergency: RemoteEmergencyDirectory;
  thresholds: {
    duty_warning_days: number;
    max_search_radius_km: number;
    negative_votes_24h: number;
  };
  features: {
    report_submission: boolean;
    community_votes: boolean;
    feedback_submission: boolean;
    routing: boolean;
  };
  minimum_app_version: string | null;
  notice: string | null;
}

@Injectable({ providedIn: "root" })
export class RemoteConfigService {
  private readonly http = inject(HttpClient);
  private loading: Promise<PublicAppConfig | null> | null = null;

  readonly config = signal<PublicAppConfig | null>(null);
  readonly workerBaseUrl = signal<string | null>(null);

  load(force = false): Promise<PublicAppConfig | null> {
    const current = this.config();
    if (current && !force) return Promise.resolve(current);
    if (this.loading && !force) return this.loading;
    this.loading = this.fetchConfig();
    return this.loading;
  }

  private async fetchConfig(): Promise<PublicAppConfig | null> {
    try {
      const runtime = await firstValueFrom(
        this.http
          .get<unknown>(RUNTIME_CONFIG_URL)
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
      const baseUrl = parseWorkerBaseUrl(runtime);
      this.workerBaseUrl.set(baseUrl);
      if (!baseUrl) {
        this.config.set(null);
        return null;
      }

      const raw = await firstValueFrom(
        this.http
          .get<unknown>(`${baseUrl}/config`)
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
      const parsed = parsePublicConfig(raw);
      if (!parsed) return this.config();
      this.config.set(parsed);
      return parsed;
    } catch {
      return this.config();
    } finally {
      this.loading = null;
    }
  }
}

function parseWorkerBaseUrl(value: unknown): string | null {
  if (!isRecord(value) || value["schema_version"] !== 1) return null;
  const configured = value["worker_base_url"];
  if (typeof configured !== "string") return null;
  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function parsePublicConfig(value: unknown): PublicAppConfig | null {
  if (
    !isRecord(value) ||
    value["schema_version"] !== 1 ||
    typeof value["worker_version"] !== "string" ||
    !isEmergencyDirectory(value["emergency"]) ||
    !isRecord(value["thresholds"]) ||
    !isRecord(value["features"])
  ) {
    return null;
  }

  const thresholds = value["thresholds"];
  if (
    !isIntegerInRange(thresholds["duty_warning_days"], 1, 30) ||
    !isIntegerInRange(thresholds["max_search_radius_km"], 1, 20) ||
    !isIntegerInRange(thresholds["negative_votes_24h"], 1, 20)
  ) {
    return null;
  }

  const features = value["features"];
  if (
    typeof features["report_submission"] !== "boolean" ||
    typeof features["community_votes"] !== "boolean" ||
    typeof features["feedback_submission"] !== "boolean" ||
    typeof features["routing"] !== "boolean"
  ) {
    return null;
  }

  const minimumAppVersion = value["minimum_app_version"];
  if (
    minimumAppVersion !== null &&
    (typeof minimumAppVersion !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(minimumAppVersion))
  ) {
    return null;
  }
  const notice = value["notice"];
  if (
    notice !== null &&
    (typeof notice !== "string" || notice.length > 240)
  ) {
    return null;
  }

  return value as unknown as PublicAppConfig;
}

function isEmergencyDirectory(value: unknown): value is RemoteEmergencyDirectory {
  if (
    !isRecord(value) ||
    value["schema_version"] !== 1 ||
    typeof value["last_checked"] !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value["last_checked"]) ||
    !isRecord(value["source"]) ||
    typeof value["source"]["name"] !== "string" ||
    value["source"]["url"] !== "https://minat.gov.cm/contacts-generaux/" ||
    !Array.isArray(value["contacts"]) ||
    value["contacts"].length < 1 ||
    value["contacts"].length > 12
  ) {
    return false;
  }

  return value["contacts"].every(
    (contact) =>
      isRecord(contact) &&
      typeof contact["id"] === "string" &&
      /^[a-z-]{1,32}$/.test(contact["id"]) &&
      typeof contact["name_fr"] === "string" &&
      contact["name_fr"].length <= 120 &&
      typeof contact["name_en"] === "string" &&
      contact["name_en"].length <= 120 &&
      typeof contact["mobile"] === "string" &&
      /^\d{2,15}$/.test(contact["mobile"]) &&
      typeof contact["landline"] === "string" &&
      /^\d{2,15}$/.test(contact["landline"]) &&
      typeof contact["scope_fr"] === "string" &&
      contact["scope_fr"].length <= 240 &&
      typeof contact["scope_en"] === "string" &&
      contact["scope_en"].length <= 240,
  );
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
