import { Injectable } from "@angular/core";
import { Preferences } from "@capacitor/preferences";

const INSTALLATION_ID_KEY = "locapharm.installation-id";

@Injectable({ providedIn: "root" })
export class InstallationIdService {
  async getOrCreate(): Promise<string> {
    const stored = await Preferences.get({ key: INSTALLATION_ID_KEY });
    if (stored.value && isUuid(stored.value)) return stored.value;

    const generated = createUuid();
    await Preferences.set({ key: INSTALLATION_ID_KEY, value: generated });
    return generated;
  }

  async reset(): Promise<void> {
    await Preferences.remove({ key: INSTALLATION_ID_KEY });
  }
}

function createUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("A secure random generator is unavailable.");
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function isUuid(value: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
    value,
  );
}
