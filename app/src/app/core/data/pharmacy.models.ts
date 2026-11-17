export interface PharmacyPhone {
  number: string;
  primary: boolean;
}

export interface PharmacySource {
  id: string;
  url: string;
  fetched_at: string;
  license: "ODbL-1.0";
  official: false;
}

export interface PharmacyRecord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: {
    street?: string;
    neighbourhood?: string;
    city?: string;
    region?: string;
  };
  neighbourhood?: string;
  city?: string;
  region?: string;
  phones?: PharmacyPhone[];
  opening_hours?: string;
  source: PharmacySource;
  quality: { score: number; flags: string[] };
  updated_at: string;
}

export interface PharmacyPack {
  schema_version: 1;
  region: string;
  generated_at: string;
  pharmacies: PharmacyRecord[];
  guards: [];
  quality: {
    pharmacies_count: number;
    phone_coverage: number;
    opening_hours_coverage: number;
    city_tag_coverage: number;
    guards_available: false;
    source_snapshot_at: string;
    source_extract_url: string;
    source_extract_sha256?: string;
    source_extract_bytes?: number;
    source_snapshot_age_days: number;
    completeness_note: string;
  };
}

export interface PharmacyPackManifestEntry {
  id: string;
  name: { fr: string; en: string };
  cities: string[];
  url: string;
  sha256: string;
  bytes: number;
  pharmacies_count: number;
  guards_valid_until: string | null;
  guards_updated_at: string | null;
}

export interface PharmacyPackManifest {
  schema_version: 1;
  generated_at: string;
  data_version: string;
  packs: PharmacyPackManifestEntry[];
  emergency: [];
  app_min_version: string;
}

export type PackSyncState =
  | "idle"
  | "downloading"
  | "verifying"
  | "installing"
  | "ready"
  | "error";

export interface PackSyncStatus {
  state: PackSyncState;
  message: string;
  downloadedBytes?: number;
  totalBytes?: number;
  pharmacyCount?: number;
}
