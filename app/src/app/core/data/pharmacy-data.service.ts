import { HttpClient } from "@angular/common/http";
import { Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  PackSyncStatus,
  PharmacyPack,
  PharmacyPackManifest,
  PharmacyPackManifestEntry,
  PharmacyRecord,
} from "./pharmacy.models";
import { PharmacyDatabaseService } from "./pharmacy-database.service";

const DATA_BASE_URL = "https://pauldjeuda.github.io/locapharm/data/packs";
const MAX_PACK_BYTES = 50 * 1024 * 1024;

@Injectable({ providedIn: "root" })
export class PharmacyDataService {
  readonly syncStatus = signal<PackSyncStatus>({
    state: "idle",
    message: "Aucun pack installé",
  });
  readonly pharmacies = signal<PharmacyRecord[]>([]);
  readonly manifest = signal<PharmacyPackManifest | null>(null);
  readonly packGeneratedAt = signal<string | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly database: PharmacyDatabaseService,
  ) {}

  async refreshManifest(): Promise<PharmacyPackManifest> {
    const raw: unknown = await firstValueFrom(
      this.http.get<unknown>(
        `${DATA_BASE_URL}/manifest.json?check=${Date.now()}`,
      ),
    );
    const parsed = parseManifest(raw);
    this.manifest.set(parsed);
    return parsed;
  }

  async installCameroonPack(): Promise<void> {
    try {
      this.syncStatus.set({
        state: "downloading",
        message: "Recherche du pack Cameroun…",
      });
      const manifest = await this.refreshManifest();
      const entry = manifest.packs.find((pack) => pack.id === "cm");
      if (!entry)
        throw new Error("Le manifeste ne contient pas le pack Cameroun.");
      validatePackEntry(entry);

      const installed = await this.database.installedPack();
      if (installed?.sha256 === entry.sha256) {
        this.pharmacies.set(await this.database.allPharmacies());
        this.packGeneratedAt.set(installed.generatedAt);
        this.syncStatus.set({
          state: "ready",
          message: "Le pack publié est déjà installé.",
          pharmacyCount: installed.count,
        });
        return;
      }

      const response = await firstValueFrom(
        this.http.get(entry.url, {
          observe: "response",
          responseType: "arraybuffer",
        }),
      );
      const bytes = response.body;
      if (!bytes) throw new Error("Le serveur a renvoyé un pack vide.");
      const byteLength = bytes.byteLength;
      if (byteLength > MAX_PACK_BYTES) {
        throw new Error("Le pack dépasse la limite de 50 Mo.");
      }
      if (byteLength !== entry.bytes) {
        throw new Error("La taille du pack ne correspond pas au manifeste.");
      }
      this.syncStatus.set({
        state: "verifying",
        message: "Vérification de l’intégrité du pack…",
        downloadedBytes: byteLength,
        totalBytes: entry.bytes,
      });
      const digest = await sha256(new Uint8Array(bytes));
      if (digest !== entry.sha256) {
        throw new Error(
          "La signature SHA-256 du pack ne correspond pas au manifeste.",
        );
      }
      let raw: unknown;
      try {
        raw = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
      } catch {
        throw new Error("Le pack n’est pas un document JSON UTF-8 valide.");
      }
      const pack = parsePack(raw, entry.id);
      if (pack.pharmacies.length !== entry.pharmacies_count) {
        throw new Error(
          "Le nombre de pharmacies ne correspond pas au manifeste.",
        );
      }

      this.syncStatus.set({
        state: "installing",
        message: "Installation hors ligne…",
        pharmacyCount: pack.pharmacies.length,
      });
      await this.database.installPack(pack, digest);
      this.pharmacies.set(await this.database.allPharmacies());
      this.packGeneratedAt.set(pack.generated_at);
      this.syncStatus.set({
        state: "ready",
        message: `Pack installé : ${pack.pharmacies.length} objets OSM cartographiés. La couverture réelle n’est pas garantie.`,
        pharmacyCount: pack.pharmacies.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Téléchargement impossible.";
      this.syncStatus.set({ state: "error", message });
      throw error;
    }
  }

  async loadInstalledPharmacies(): Promise<PharmacyRecord[]> {
    try {
      const records = await this.database.allPharmacies();
      this.pharmacies.set(records);
      const installed = await this.database.installedPack();
      if (installed) {
        this.packGeneratedAt.set(installed.generatedAt);
        this.syncStatus.set({
          state: "ready",
          message: `Pack installé · ${installed.generatedAt.slice(0, 10)}`,
          pharmacyCount: installed.count,
        });
      } else {
        this.packGeneratedAt.set(null);
      }
      return records;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lecture du pack impossible.";
      this.syncStatus.set({ state: "error", message });
      throw error;
    }
  }

  async removeCameroonPack(): Promise<void> {
    try {
      await this.database.deletePack();
      this.pharmacies.set([]);
      this.packGeneratedAt.set(null);
      this.syncStatus.set({
        state: "idle",
        message: "Pack supprimé de cet appareil.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Suppression du pack impossible.";
      this.syncStatus.set({ state: "error", message });
      throw error;
    }
  }

  async pharmacyById(id: string): Promise<PharmacyRecord | null> {
    const records = await this.loadInstalledPharmacies();
    return records.find((pharmacy) => pharmacy.id === id) ?? null;
  }
}

function parseManifest(value: unknown): PharmacyPackManifest {
  if (
    !isRecord(value) ||
    value["schema_version"] !== 1 ||
    !Array.isArray(value["packs"])
  ) {
    throw new Error("Le manifeste de données est invalide.");
  }
  const manifest = value as unknown as PharmacyPackManifest;
  for (const entry of manifest.packs) validatePackEntry(entry);
  return manifest;
}

function validatePackEntry(value: PharmacyPackManifestEntry): void {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.url !== "string" ||
    !value.url.startsWith("https://") ||
    !/^[a-f0-9]{64}$/i.test(value.sha256) ||
    !Number.isInteger(value.bytes) ||
    value.bytes <= 0 ||
    value.bytes > MAX_PACK_BYTES ||
    !Number.isInteger(value.pharmacies_count) ||
    value.pharmacies_count < 1
  ) {
    throw new Error("L’entrée du pack régional est invalide.");
  }
}

function parsePack(value: unknown, id: string): PharmacyPack {
  if (
    !isRecord(value) ||
    value["schema_version"] !== 1 ||
    value["region"] !== "CM" ||
    !Array.isArray(value["pharmacies"]) ||
    value["pharmacies"].length === 0 ||
    !Array.isArray(value["guards"]) ||
    value["guards"].length !== 0 ||
    !isRecord(value["quality"])
  ) {
    throw new Error(`Le contenu du pack ${id} est invalide.`);
  }
  const pack = value as unknown as PharmacyPack;
  for (const pharmacy of pack.pharmacies) {
    if (
      !pharmacy ||
      typeof pharmacy.id !== "string" ||
      typeof pharmacy.name !== "string" ||
      !Number.isFinite(pharmacy.lat) ||
      !Number.isFinite(pharmacy.lon) ||
      !pharmacy.source?.url ||
      pharmacy.source.license !== "ODbL-1.0" ||
      pharmacy.source.official !== false
    ) {
      throw new Error("Une fiche du pack ne respecte pas le schéma attendu.");
    }
  }
  return pack;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Le contrôle d’intégrité n’est pas disponible sur cet appareil.",
    );
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
