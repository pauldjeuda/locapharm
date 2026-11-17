import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { PharmacyPack, PharmacyRecord } from "./pharmacy.models";

const DATABASE_NAME = "locapharm";
const REGION_CODE = "CM";
const BATCH_SIZE = 250;

@Injectable({ providedIn: "root" })
export class PharmacyDatabaseService {
  private connectionPromise?: Promise<
    import("@capacitor-community/sqlite").SQLiteDBConnection
  >;
  private browserRecords: PharmacyRecord[] = [];
  private browserPack: {
    sha256: string;
    generatedAt: string;
    count: number;
  } | null = null;

  async installedPack(): Promise<{
    sha256: string;
    generatedAt: string;
    count: number;
  } | null> {
    if (!Capacitor.isNativePlatform()) return this.browserPack;
    const db = await this.database();
    const result = await db.query(
      "SELECT sha256, generated_at, pharmacy_count FROM packs WHERE region = ?",
      [REGION_CODE],
    );
    const row = result.values?.[0];
    if (!row) return null;
    return {
      sha256: String(row["sha256"]),
      generatedAt: String(row["generated_at"]),
      count: Number(row["pharmacy_count"]),
    };
  }

  async installPack(pack: PharmacyPack, sha256: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.browserRecords = [...pack.pharmacies];
      this.browserPack = {
        sha256,
        generatedAt: pack.generated_at,
        count: pack.pharmacies.length,
      };
      return;
    }

    const db = await this.database();
    await db.beginTransaction();
    try {
      await db.run(
        "DELETE FROM pharmacies WHERE region = ?",
        [REGION_CODE],
        false,
      );
      await db.run("DELETE FROM packs WHERE region = ?", [REGION_CODE], false);

      for (
        let offset = 0;
        offset < pack.pharmacies.length;
        offset += BATCH_SIZE
      ) {
        const batch = pack.pharmacies.slice(offset, offset + BATCH_SIZE);
        const set = batch.map((pharmacy) => ({
          statement:
            "INSERT INTO pharmacies (region, id, city, name, latitude, longitude, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
          values: [
            REGION_CODE,
            pharmacy.id,
            pharmacy.city ?? null,
            pharmacy.name,
            pharmacy.lat,
            pharmacy.lon,
            JSON.stringify(pharmacy),
          ],
        }));
        await db.executeSet(set, false);
      }

      await db.run(
        "INSERT INTO packs (region, sha256, generated_at, pharmacy_count) VALUES (?, ?, ?, ?)",
        [REGION_CODE, sha256, pack.generated_at, pack.pharmacies.length],
        false,
      );
      await db.commitTransaction();
    } catch (error) {
      try {
        await db.rollbackTransaction();
      } catch {
        // Preserve the import error if the native connection is already closed.
      }
      throw error;
    }
  }

  async deletePack(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.browserRecords = [];
      this.browserPack = null;
      return;
    }

    const db = await this.database();
    await db.beginTransaction();
    try {
      await db.run(
        "DELETE FROM pharmacies WHERE region = ?",
        [REGION_CODE],
        false,
      );
      await db.run("DELETE FROM packs WHERE region = ?", [REGION_CODE], false);
      await db.commitTransaction();
    } catch (error) {
      try {
        await db.rollbackTransaction();
      } catch {
        // Preserve the deletion error if the native connection is already closed.
      }
      throw error;
    }
  }

  async allPharmacies(): Promise<PharmacyRecord[]> {
    if (!Capacitor.isNativePlatform()) return [...this.browserRecords];
    const db = await this.database();
    const result = await db.query(
      "SELECT raw_json FROM pharmacies WHERE region = ? ORDER BY city, name",
      [REGION_CODE],
    );
    return (result.values ?? []).map(
      (row: Record<string, unknown>) =>
        JSON.parse(String(row["raw_json"])) as PharmacyRecord,
    );
  }

  private database(): Promise<
    import("@capacitor-community/sqlite").SQLiteDBConnection
  > {
    this.connectionPromise ??= this.openDatabase();
    return this.connectionPromise;
  }

  private async openDatabase(): Promise<
    import("@capacitor-community/sqlite").SQLiteDBConnection
  > {
    const { CapacitorSQLite, SQLiteConnection } = await import(
      "@capacitor-community/sqlite"
    );
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const existing = await sqlite.isConnection(DATABASE_NAME, false);
    const db = existing.result
      ? await sqlite.retrieveConnection(DATABASE_NAME, false)
      : await sqlite.createConnection(
          DATABASE_NAME,
          false,
          "no-encryption",
          1,
          false,
        );

    if (!(await db.isDBOpen()).result) await db.open();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        region TEXT NOT NULL,
        id TEXT NOT NULL,
        city TEXT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        raw_json TEXT NOT NULL,
        PRIMARY KEY (region, id)
      );
      CREATE INDEX IF NOT EXISTS pharmacies_region_city ON pharmacies(region, city);
      CREATE INDEX IF NOT EXISTS pharmacies_region_name ON pharmacies(region, name);
      CREATE TABLE IF NOT EXISTS packs (
        region TEXT PRIMARY KEY,
        sha256 TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        pharmacy_count INTEGER NOT NULL
      );
    `);
    return db;
  }
}
