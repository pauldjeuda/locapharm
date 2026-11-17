import { Injectable, signal } from "@angular/core";
import { Preferences } from "@capacitor/preferences";

export type AppLanguage = "fr" | "en";
export type ThemeMode = "light" | "dark" | "system";
export type DistanceUnit = "km" | "mi";
export type PharmacyFilter = "all" | "on-duty" | "open" | "24-hours";
export type SortOrder = "distance" | "name";

const PREF = {
  onboarding: "locapharm.onboarding.complete",
  language: "locapharm.language",
  theme: "locapharm.theme",
  unit: "locapharm.distance-unit",
  city: "locapharm.city",
  radius: "locapharm.search-radius",
  sort: "locapharm.sort-order",
  phoneOnly: "locapharm.phone-only",
  favorites: "locapharm.favorites",
} as const;

@Injectable({ providedIn: "root" })
export class AppStateService {
  readonly initialized = signal(false);
  readonly onboardingComplete = signal(false);
  readonly language = signal<AppLanguage>("fr");
  readonly themeMode = signal<ThemeMode>("system");
  readonly distanceUnit = signal<DistanceUnit>("km");
  readonly city = signal("");
  readonly radiusKm = signal(5);
  readonly filter = signal<PharmacyFilter>("all");
  readonly sortOrder = signal<SortOrder>("distance");
  readonly phoneOnly = signal(false);
  readonly favoriteIds = signal<string[]>([]);
  readonly locationFix = signal<{ latitude: number; longitude: number } | null>(
    null,
  );

  async initialize(): Promise<void> {
    if (this.initialized()) return;

    const entries = await Promise.all(
      Object.entries(PREF).map(async ([key, preferenceKey]) => {
        try {
          const result = await Preferences.get({ key: preferenceKey });
          return [key, result.value] as const;
        } catch {
          return [key, null] as const;
        }
      }),
    );
    const values = Object.fromEntries(entries);

    this.onboardingComplete.set(values["onboarding"] === "true");
    if (values["language"] === "en") this.language.set("en");
    if (["light", "dark", "system"].includes(values["theme"] ?? "")) {
      this.themeMode.set(values["theme"] as ThemeMode);
    }
    if (values["unit"] === "mi") this.distanceUnit.set("mi");
    this.city.set(values["city"] ?? "");

    const radius = values["radius"] === null ? Number.NaN : Number(values["radius"]);
    if (Number.isFinite(radius)) {
      this.radiusKm.set(Math.max(1, Math.min(20, radius)));
    }
    if (values["sort"] === "name") this.sortOrder.set("name");
    this.phoneOnly.set(values["phoneOnly"] === "true");

    try {
      const parsed: unknown = JSON.parse(values["favorites"] ?? "[]");
      if (
        Array.isArray(parsed) &&
        parsed.every((id) => typeof id === "string")
      ) {
        this.favoriteIds.set(parsed);
      }
    } catch {
      this.favoriteIds.set([]);
    }

    this.applyTheme();
    this.initialized.set(true);
  }

  async completeOnboarding(): Promise<void> {
    this.onboardingComplete.set(true);
    await this.persist(PREF.onboarding, "true");
  }

  async setLanguage(value: AppLanguage): Promise<void> {
    this.language.set(value);
    await this.persist(PREF.language, value);
  }

  async setThemeMode(value: ThemeMode): Promise<void> {
    this.themeMode.set(value);
    this.applyTheme();
    await this.persist(PREF.theme, value);
  }

  async setDistanceUnit(value: DistanceUnit): Promise<void> {
    this.distanceUnit.set(value);
    await this.persist(PREF.unit, value);
  }

  async setCity(value: string): Promise<void> {
    const city = value.trim();
    this.city.set(city);
    await this.persist(PREF.city, city);
  }

  async setRadius(value: number): Promise<void> {
    const radius = Math.max(1, Math.min(20, Math.round(value)));
    this.radiusKm.set(radius);
    await this.persist(PREF.radius, String(radius));
  }

  async setSortOrder(value: SortOrder): Promise<void> {
    this.sortOrder.set(value);
    await this.persist(PREF.sort, value);
  }

  async setPhoneOnly(value: boolean): Promise<void> {
    this.phoneOnly.set(value);
    await this.persist(PREF.phoneOnly, String(value));
  }

  async toggleFavorite(id: string): Promise<void> {
    const current = this.favoriteIds();
    const next = current.includes(id)
      ? current.filter((favorite) => favorite !== id)
      : [...current, id];
    this.favoriteIds.set(next);
    await this.persist(PREF.favorites, JSON.stringify(next));
  }

  private async persist(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch {
      // Preferences are an optional persistence layer on unsupported platforms.
    }
  }

  private applyTheme(): void {
    if (typeof document === "undefined") return;
    const wantsDark =
      this.themeMode() === "dark" ||
      (this.themeMode() === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("theme-dark", wantsDark);
  }
}
