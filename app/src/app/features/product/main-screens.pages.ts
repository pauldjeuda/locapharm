import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { IonRouterOutlet } from "@ionic/angular/standalone";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { firstValueFrom } from "rxjs";
import {
  AppLanguage,
  AppStateService,
  DistanceUnit,
  PharmacyFilter,
  ThemeMode,
} from "../../core/state/app-state.service";
import { productPageStyles } from "./product.styles";
import { PharmacyDataService } from "../../core/data/pharmacy-data.service";
import { PharmacyRecord } from "../../core/data/pharmacy.models";
import {
  PharmacyHoursService,
  PharmacyHoursStatus,
} from "../../core/data/pharmacy-hours.service";
import { APP_VERSION } from "../../core/app-version";

@Component({
  selector: "lp-tabs-page",
  standalone: true,
  imports: [IonRouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="lp-tabs-outlet"><ion-router-outlet /></div>
    <nav class="lp-nav" aria-label="Navigation principale">
      <a routerLink="/tabs/map" routerLinkActive="active" aria-label="Carte">
        <span aria-hidden="true">⌖</span>
      </a>
      <a
        routerLink="/tabs/guards"
        routerLinkActive="active"
        aria-label="Gardes"
      >
        <span aria-hidden="true">✚</span>
      </a>
      <a
        routerLink="/tabs/favorites"
        routerLinkActive="active"
        aria-label="Favoris"
      >
        <span aria-hidden="true">♡</span>
      </a>
      <a
        routerLink="/tabs/settings"
        routerLinkActive="active"
        aria-label="Réglages"
      >
        <span aria-hidden="true">☷</span>
      </a>
    </nav>
    <a class="lp-emergency-shortcut" routerLink="/emergency">
      <span aria-hidden="true">☎</span>{{ emergencyLabel() }}
    </a>
  `,
  styles: [productPageStyles],
})
export class TabsPage {
  private readonly state = inject(AppStateService);
  emergencyLabel(): string {
    return this.state.language() === "en" ? "Emergency" : "Urgences";
  }
}

@Component({
  selector: "lp-map-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-map-screen">
      <header class="lp-row-between lp-map-header">
        <div class="lp-row">
          <img class="lp-small-logo" src="assets/logo-mark.svg" alt="" />
          <div class="lp-title-group">
            <p class="lp-eyebrow">LOCAPHARM · CM</p>
            <h1 class="lp-heading">
              {{
                state.city() ||
                  (english() ? "Choose an area" : "Choisir une zone")
              }}
            </h1>
          </div>
        </div>
        <a
          class="lp-icon-button"
          routerLink="/system"
          aria-label="État du système"
          >⋯</a
        >
      </header>

      <div class="lp-row lp-search-row">
        <a class="lp-search-link" routerLink="/search"
          ><span aria-hidden="true">⌕</span
          >{{
            english()
              ? "Search a pharmacy or area"
              : "Rechercher une pharmacie, un quartier…"
          }}</a
        >
        <a class="lp-icon-button" routerLink="/filters" aria-label="Filtres"
          >☷</a
        >
      </div>

      <section class="lp-map-placeholder" aria-label="Carte OpenStreetMap">
        <div #mapContainer class="lp-map-canvas"></div>
        @if (mapError() && !mapReady()) {
          <div class="lp-map-message">
            <span class="lp-empty-icon" aria-hidden="true">⌖</span>
            <p class="lp-section-title">
              {{
                english()
                  ? "The map could not be loaded"
                  : "La carte n’a pas pu être chargée"
              }}
            </p>
            <p class="lp-copy lp-copy--small">
              {{
                english()
                  ? "The pharmacy list remains available when its data pack is installed."
                  : "La liste des pharmacies reste accessible lorsqu’un pack de données est installé."
              }}
            </p>
          </div>
        }
        <button
          class="lp-icon-button lp-map-location"
          type="button"
          [attr.aria-label]="
            english() ? 'Use my location' : 'Utiliser ma position'
          "
          (click)="locate()"
        >
          ◎
        </button>
      </section>

      <section class="lp-map-sheet" aria-labelledby="nearby-title">
        <div class="lp-sheet-handle" aria-hidden="true"></div>
        <div class="lp-row-between">
          <h2 id="nearby-title" class="lp-section-title">
            {{ sectionTitle() }}
          </h2>
          <span class="lp-muted lp-copy--small">{{
            english()
              ? data.pharmacies().length + " mapped objects"
              : data.pharmacies().length + " objets cartographiés"
          }}</span>
        </div>
        <div class="lp-chip-row" aria-label="Filtrer les pharmacies">
          <button
            class="lp-chip"
            type="button"
            [attr.aria-pressed]="state.filter() === 'all'"
            (click)="setFilter('all')"
          >
            {{ english() ? "All" : "Toutes" }}
          </button>
          <button
            class="lp-chip"
            type="button"
            [attr.aria-pressed]="state.filter() === 'on-duty'"
            (click)="setFilter('on-duty')"
          >
            {{ english() ? "On duty" : "De garde" }}
          </button>
          <button
            class="lp-chip"
            type="button"
            [attr.aria-pressed]="state.filter() === 'open'"
            (click)="setFilter('open')"
          >
            {{ english() ? "Open" : "Ouvertes" }}
          </button>
          <button
            class="lp-chip"
            type="button"
            [attr.aria-pressed]="state.filter() === '24-hours'"
            (click)="setFilter('24-hours')"
          >
            24/24
          </button>
        </div>
        <p class="lp-copy lp-copy--small lp-hours-disclaimer">
          {{
            english()
              ? "Open or closed uses OpenStreetMap hours and is not a live confirmation. Call before travelling."
              : "Ouverte ou fermée repose sur les horaires OpenStreetMap, sans confirmation en direct. Appelez avant de vous déplacer."
          }}
        </p>
        @if (visiblePharmacies().length) {
          <div class="lp-pharmacy-list">
            @for (pharmacy of visiblePharmacies(); track pharmacy.id) {
              <a
                class="lp-card lp-pharmacy-row"
                [routerLink]="['/pharmacy', pharmacy.id]"
              >
                <span class="lp-pharmacy-pin" aria-hidden="true">✚</span>
                <span class="lp-pharmacy-copy">
                  <strong>{{ pharmacy.name }}</strong>
                  <span class="lp-copy lp-copy--small"
                    >{{
                      pharmacy.city ||
                        pharmacy.neighbourhood ||
                        (english()
                          ? "Location not supplied"
                          : "Localisation non renseignée")
                    }}
                    @if (state.locationFix()) {
                      · {{ distanceText(pharmacy) }}
                    }
                  </span>
                </span>
                @let hoursStatus = statusFor(pharmacy);
                <span
                  class="lp-badge"
                  [class.lp-badge--open]="hoursStatus.state === 'open'"
                  >{{ statusLabel(hoursStatus) }}</span
                >
              </a>
            }
          </div>
        } @else {
          <div class="lp-card lp-empty">
            <span class="lp-empty-icon" aria-hidden="true">＋</span>
            <h3 class="lp-section-title">
              {{ emptyMessage() }}
            </h3>
            <p class="lp-copy">
              {{ emptyDescription() }}
            </p>
            <a class="lp-button lp-button--sage" routerLink="/tabs/settings">{{
              english()
                ? "Install the data pack"
                : "Installer le pack de données"
            }}</a>
            <p class="lp-copy lp-copy--small">
              {{
                english()
                  ? "Call before travelling."
                  : "Appelez avant de vous déplacer."
              }}
            </p>
          </div>
        }
        <p class="lp-source-line">
          {{
            english()
              ? "© OpenStreetMap contributors · map requests reveal the viewed area; GPS stays on this device"
              : "© OpenStreetMap contributors · la carte révèle la zone affichée; le GPS reste sur cet appareil"
          }}
        </p>
      </section>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-map-screen {
        display: grid;
        grid-template-rows: auto auto minmax(250px, 1fr) auto;
        gap: 16px;
        min-height: 100dvh;
        padding-bottom: 300px;
      }
      .lp-map-header {
        margin: 0;
      }
      .lp-small-logo {
        width: 36px;
        height: 36px;
      }
      .lp-search-row {
        gap: 10px;
      }
      .lp-search-link {
        display: flex;
        min-width: 0;
        min-height: 54px;
        flex: 1;
        align-items: center;
        gap: 10px;
        padding: 0 18px;
        border-radius: 9999px;
        color: #73796e;
        background: #fff;
        font-size: 13px;
        text-decoration: none;
      }
      .lp-search-link span {
        color: #12161a;
        font-size: 22px;
      }
      .lp-map-placeholder {
        position: relative;
        display: block;
        min-height: 250px;
        overflow: hidden;
        border-radius: 28px;
        background: #dfe2e5;
      }
      .lp-map-canvas {
        position: absolute;
        inset: 0;
      }
      .lp-map-message {
        position: absolute;
        z-index: 2;
        top: 50%;
        left: 50%;
        display: grid;
        max-width: 260px;
        justify-items: center;
        gap: 8px;
        padding: 18px;
        border-radius: 22px;
        text-align: center;
        background: rgb(255 255 255 / 92%);
        box-shadow: 0 8px 24px rgb(18 22 26 / 8%);
        transform: translate(-50%, -50%);
      }
      .lp-map-message .lp-button {
        min-height: 40px;
        font-size: 12px;
      }
      .lp-map-location {
        position: absolute;
        right: 14px;
        bottom: 14px;
      }
      .lp-pharmacy-list {
        display: grid;
        gap: 10px;
      }
      .lp-pharmacy-row {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 12px;
        color: inherit;
        text-decoration: none;
      }
      .lp-pharmacy-pin {
        display: grid;
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        place-items: center;
        border: 2px solid #0f1110;
        border-radius: 50%;
        color: #0f1110;
        background: #c8f000;
      }
      .lp-pharmacy-copy {
        display: grid;
        min-width: 0;
        flex: 1;
        gap: 4px;
      }
      .lp-pharmacy-copy strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lp-pharmacy-row .lp-badge {
        font-size: 9px;
      }
      .lp-map-sheet {
        display: grid;
        gap: 12px;
      }
      .lp-hours-disclaimer {
        margin: 0 4px;
      }
      .lp-sheet-handle {
        width: 36px;
        height: 4px;
        justify-self: center;
        border-radius: 99px;
        background: #c3c8bc;
      }
      .lp-map-sheet .lp-card {
        min-height: 180px;
      }
      .lp-source-line {
        margin: 0;
        color: #73796e;
        font-size: 10px;
        text-align: center;
      }
      .theme-dark .lp-search-link {
        color: #d7dae0;
        background: #1f2522;
      }
      .theme-dark .lp-search-link span {
        color: #fff;
      }
      .theme-dark .lp-map-placeholder {
        background: #1f2522;
      }
      .theme-dark .lp-map-message {
        background: rgb(31 37 34 / 95%);
      }
    `,
  ],
})
export class MapPage implements AfterViewInit, OnDestroy {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly hours = inject(PharmacyHoursService);
  private readonly router = inject(Router);
  readonly mapReady = signal(false);
  readonly mapError = signal(false);
  @ViewChild("mapContainer", { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;
  private map?: import("maplibre-gl").Map;

  constructor() {
    effect(() => {
      this.data.pharmacies();
      if (this.mapReady()) this.syncMapPharmacies();
    });
    effect(() => {
      void this.hours.prepare(this.data.pharmacies());
    });
    effect(() => {
      const location = this.state.locationFix();
      const city = this.state.city();
      const pharmacies = this.data.pharmacies();
      if (this.mapReady()) this.centerOnSelection(location, city, pharmacies);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.data.loadInstalledPharmacies().catch(() => []);
    await this.initializeMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private async initializeMap(): Promise<void> {
    try {
      const maplibre = await import("maplibre-gl");
      maplibre.setWorkerUrl(
        new URL(
          "assets/maplibre/maplibre-gl-worker.mjs",
          document.baseURI,
        ).toString(),
      );
      this.map = new maplibre.Map({
        container: this.mapContainer.nativeElement,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [12.2, 5.7],
        zoom: 5.4,
        attributionControl: false,
        cooperativeGestures: true,
      });
      this.map.addControl(
        new maplibre.NavigationControl({ showCompass: false }),
        "top-right",
      );
      this.map.addControl(
        new maplibre.AttributionControl({
          compact: true,
          customAttribution:
            '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
        }),
        "bottom-right",
      );
      this.map.once("load", () => {
        this.mapError.set(false);
        this.mapReady.set(true);
        this.syncMapPharmacies();
      });
      this.map.on("error", () => {
        if (!this.mapReady()) this.mapError.set(true);
      });
    } catch {
      this.mapError.set(true);
    }
  }

  private syncMapPharmacies(): void {
    if (!this.map || !this.mapReady()) return;
    const collection = {
      type: "FeatureCollection" as const,
      features: this.matchingPharmacies().map((pharmacy) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [pharmacy.lon, pharmacy.lat] as [number, number],
        },
        properties: { id: pharmacy.id, name: pharmacy.name },
      })),
    };
    const source = this.map.getSource("pharmacies");
    if (source?.type === "geojson") {
      source.setData(collection);
      return;
    }
    this.map.addSource("pharmacies", {
      type: "geojson",
      data: collection,
      cluster: true,
      clusterRadius: 44,
      clusterMaxZoom: 13,
    });
    this.map.addLayer({
      id: "pharmacy-clusters",
      type: "circle",
      source: "pharmacies",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#c8f000",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 40, 27],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0f1110",
      },
    });
    this.map.addLayer({
      id: "pharmacy-cluster-count",
      type: "symbol",
      source: "pharmacies",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Bold"],
      },
      paint: { "text-color": "#0f1110" },
    });
    this.map.addLayer({
      id: "pharmacy-points",
      type: "circle",
      source: "pharmacies",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 8,
        "circle-color": "#c8f000",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0f1110",
      },
    });
    this.map.on("click", "pharmacy-points", (event) => {
      const pharmacyId = event.features?.[0]?.properties?.["id"];
      if (typeof pharmacyId === "string") {
        void this.router.navigate(["/pharmacy", pharmacyId]);
      }
    });
  }

  visiblePharmacies(): PharmacyRecord[] {
    return this.matchingPharmacies().slice(0, 20);
  }

  private matchingPharmacies(): PharmacyRecord[] {
    const location = this.state.locationFix();
    const selectedCity = normalizeText(this.state.city());
    let records = this.data.pharmacies();
    if (this.state.filter() === "on-duty") return [];
    if (this.state.filter() === "open") {
      records = records.filter(
        (record) => this.hours.status(record).state === "open",
      );
    }
    if (this.state.filter() === "24-hours") {
      records = records.filter((record) =>
        this.hours.isOpenTwentyFourSeven(record),
      );
    }
    if (this.state.phoneOnly())
      records = records.filter((record) => record.phones?.length);
    if (location) {
      records = records
        .map((record) => ({
          record,
          distance: distanceKm(
            location.latitude,
            location.longitude,
            record.lat,
            record.lon,
          ),
        }))
        .filter(({ distance }) => distance <= this.state.radiusKm())
        .sort((a, b) => a.distance - b.distance)
        .map(({ record }) => record);
    } else if (selectedCity) {
      records = records.filter((record) =>
        normalizeText(
          `${record.city ?? ""} ${record.neighbourhood ?? ""}`,
        ).includes(selectedCity),
      );
    } else {
      records = [];
    }
    if (this.state.sortOrder() === "name")
      records = [...records].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return records;
  }

  private centerOnSelection(
    location: { latitude: number; longitude: number } | null,
    city: string,
    pharmacies: PharmacyRecord[],
  ): void {
    if (!this.map || (!location && !city.trim())) return;
    if (location) {
      this.map.easeTo({
        center: [location.longitude, location.latitude],
        zoom: 14,
      });
      return;
    }
    const query = normalizeText(city);
    const matches = pharmacies.filter((pharmacy) =>
      normalizeText(
        `${pharmacy.city ?? ""} ${pharmacy.neighbourhood ?? ""}`,
      ).includes(query),
    );
    if (!matches.length) return;
    const bounds: [[number, number], [number, number]] = [
      [
        Math.min(...matches.map((pharmacy) => pharmacy.lon)),
        Math.min(...matches.map((pharmacy) => pharmacy.lat)),
      ],
      [
        Math.max(...matches.map((pharmacy) => pharmacy.lon)),
        Math.max(...matches.map((pharmacy) => pharmacy.lat)),
      ],
    ];
    this.map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 500 });
  }

  emptyMessage(): string {
    if (!this.data.pharmacies().length)
      return this.english()
        ? "No regional pharmacy pack is installed"
        : "Aucun pack régional de pharmacies n’est installé";
    if (this.state.filter() === "on-duty")
      return this.english()
        ? "No current verified status is available"
        : "Aucun statut actuel vérifié n’est disponible";
    if (this.state.filter() === "open")
      return this.english()
        ? "No mapped pharmacy is confirmed open by its listed hours right now"
        : "Aucune fiche n’indique des horaires la confirmant ouverte actuellement";
    if (this.state.filter() === "24-hours")
      return this.english()
        ? "No pharmacy is explicitly listed as open 24/7 in this area"
        : "Aucune pharmacie n’est explicitement indiquée ouverte 24 h/24 dans cette zone";
    if (!this.state.locationFix() && !this.state.city())
      return this.english()
        ? "Choose an area or share your location"
        : "Choisissez une zone ou utilisez votre position";
    return this.english()
      ? "No mapped pharmacy matched this area"
      : "Aucune pharmacie cartographiée ne correspond à cette zone";
  }

  sectionTitle(): string {
    if (this.english()) {
      return this.state.locationFix()
        ? "Nearest pharmacies"
        : "Pharmacies in this area";
    }
    return this.state.locationFix()
      ? "Les plus proches"
      : "Pharmacies de la zone";
  }

  distanceText(record: PharmacyRecord): string {
    const location = this.state.locationFix();
    if (!location) return "";
    const distance = distanceKm(
      location.latitude,
      location.longitude,
      record.lat,
      record.lon,
    );
    if (this.state.distanceUnit() === "mi") {
      const miles = distance / 1.609344;
      return `${miles < 0.1 ? Math.round(miles * 5280) + " ft" : miles.toFixed(1) + " mi"}`;
    }
    return distance < 1
      ? `${Math.round(distance * 1000)} m`
      : `${distance.toFixed(1)} km`;
  }

  emptyDescription(): string {
    return this.english()
      ? "A missing result does not mean no pharmacy exists here. Map entries are not verified duty schedules."
      : "Une absence de résultat ne signifie pas qu’il n’existe aucune pharmacie ici. Les données cartographiques ne constituent pas un calendrier de garde vérifié.";
  }

  english(): boolean {
    return this.state.language() === "en";
  }

  setFilter(filter: PharmacyFilter): void {
    this.state.filter.set(filter);
  }

  statusFor(record: PharmacyRecord): PharmacyHoursStatus {
    return this.hours.status(record);
  }

  statusLabel(status: PharmacyHoursStatus): string {
    if (status.state === "open")
      return this.english() ? "OPEN · OSM" : "OUVERTE · OSM";
    if (status.state === "closed")
      return this.english() ? "CLOSED · OSM" : "FERMÉE · OSM";
    return this.english() ? "HOURS UNKNOWN" : "HORAIRES INCONNUS";
  }

  async locate(): Promise<void> {
    const { Geolocation } = await import("@capacitor/geolocation");
    try {
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== "granted") {
        permission = await Geolocation.requestPermissions();
      }
      if (permission.location !== "granted") return;
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12_000,
      });
      this.state.locationFix.set({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      this.state.locationFix.set(null);
    }
  }
}

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

@Component({
  selector: "lp-guards-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen">
      <header class="lp-title-group lp-page-header">
        <p class="lp-eyebrow">
          {{ english() ? "PHARMACY DUTY" : "PHARMACIES DE GARDE" }}
        </p>
        <h1 class="lp-heading lp-heading--large">
          {{ english() ? "On duty" : "De garde" }}
        </h1>
        <p class="lp-copy">
          {{
            english()
              ? "Duty schedules are shown only when their source and validity dates can be confirmed."
              : "Les tours de garde ne sont affichés que si leur source et leurs dates de validité peuvent être confirmées."
          }}
        </p>
      </header>
      <div class="lp-card lp-card--sage lp-duty-warning">
        <span class="lp-badge lp-badge--light">{{
          english() ? "NO VERIFIED SCHEDULE" : "AUCUN CALENDRIER VÉRIFIÉ"
        }}</span>
        <p>
          {{
            english()
              ? "No current duty list is available for this area."
              : "Aucune liste de garde en cours n’est disponible pour cette zone."
          }}
        </p>
        <p class="lp-duty-call">
          {{
            english()
              ? "Call before travelling."
              : "Appelez avant de vous déplacer."
          }}
        </p>
      </div>
      <section class="lp-section">
        <div class="lp-row-between">
          <h2 class="lp-section-title">{{ english() ? "Area" : "Zone" }}</h2>
          <a class="lp-text-link" routerLink="/search"
            >{{ english() ? "Choose" : "Choisir" }} ↗</a
          >
        </div>
        <button
          class="lp-input lp-city-button"
          type="button"
          routerLink="/search"
        >
          {{
            state.city() ||
              (english()
                ? "Choose a city or area"
                : "Choisir une ville ou un quartier")
          }}
          <span>⌄</span>
        </button>
      </section>
      <div class="lp-card lp-empty lp-guard-empty">
        <span class="lp-empty-icon" aria-hidden="true">✚</span>
        <h2 class="lp-section-title">
          {{ english() ? "No duty list yet" : "Pas encore de liste de garde" }}
        </h2>
        <p class="lp-copy">
          {{
            english()
              ? "We will not label a pharmacy as on duty without a traceable, current source."
              : "Aucune pharmacie ne sera déclarée de garde sans source actuelle et traçable."
          }}
        </p>
      </div>
      <section class="lp-section" aria-labelledby="open-nearby-title">
        <h2 id="open-nearby-title" class="lp-section-title">
          {{
            english() ? "Listed as open now" : "Indiquées ouvertes actuellement"
          }}
        </h2>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "These are OpenStreetMap opening hours, not duty schedules or live confirmations. Call before travelling."
              : "Ces horaires proviennent d’OpenStreetMap; ils ne constituent ni un calendrier de garde ni une confirmation en direct. Appelez avant de vous déplacer."
          }}
        </p>
        @if (openPharmacies().length) {
          <div class="lp-pharmacy-list">
            @for (pharmacy of openPharmacies(); track pharmacy.id) {
              <a
                class="lp-card lp-pharmacy-row"
                [routerLink]="['/pharmacy', pharmacy.id]"
              >
                <span class="lp-pharmacy-pin" aria-hidden="true">✚</span>
                <span class="lp-pharmacy-copy">
                  <strong>{{ pharmacy.name }}</strong>
                  <span class="lp-copy lp-copy--small">{{
                    pharmacy.city ||
                      pharmacy.neighbourhood ||
                      (english()
                        ? "Location not supplied"
                        : "Localisation non renseignée")
                  }}</span>
                </span>
                <span class="lp-badge lp-badge--open">{{
                  english() ? "OPEN · OSM" : "OUVERTE · OSM"
                }}</span>
              </a>
            }
          </div>
        } @else {
          <div class="lp-card lp-copy lp-copy--small">
            {{
              english()
                ? "No installed record in this area has hours that the app can currently evaluate as open."
                : "Aucune fiche installée dans cette zone n’a des horaires actuellement interprétables comme ouverts."
            }}
          </div>
        }
      </section>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-page-header {
        margin: 12px 0 26px;
      }
      .lp-page-header .lp-heading {
        max-width: 310px;
      }
      .lp-duty-warning {
        display: grid;
        gap: 10px;
        border-radius: 28px;
      }
      .lp-duty-warning p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
      }
      .lp-duty-warning .lp-duty-call {
        color: #e8ffd9;
        font-weight: 700;
      }
      .lp-badge--light {
        justify-self: start;
        color: #0f1110;
        background: #c8f000;
      }
      .lp-text-link {
        color: #3f5a36;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
      }
      .lp-city-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: left;
        cursor: pointer;
      }
      .lp-guard-empty {
        margin-top: 22px;
      }
      .theme-dark .lp-text-link {
        color: #caf208;
      }
    `,
  ],
})
export class GuardsPage implements OnInit {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly hours = inject(PharmacyHoursService);

  async ngOnInit(): Promise<void> {
    const records = await this.data.loadInstalledPharmacies().catch(() => []);
    await this.hours.prepare(records);
  }

  openPharmacies(): PharmacyRecord[] {
    const location = this.state.locationFix();
    const selectedCity = normalizeSearch(this.state.city());
    let records = this.data
      .pharmacies()
      .filter((record) => this.hours.status(record).state === "open");
    if (location) {
      records = records
        .map((record) => ({
          record,
          distance: distanceKm(
            location.latitude,
            location.longitude,
            record.lat,
            record.lon,
          ),
        }))
        .filter(({ distance }) => distance <= this.state.radiusKm())
        .sort((a, b) => a.distance - b.distance)
        .map(({ record }) => record);
    } else if (selectedCity) {
      records = records.filter((record) =>
        normalizeSearch(
          `${record.city ?? ""} ${record.neighbourhood ?? ""}`,
        ).includes(selectedCity),
      );
    } else {
      return [];
    }
    return records.slice(0, 10);
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-favorites-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen">
      <header class="lp-title-group lp-page-header">
        <p class="lp-eyebrow">
          {{
            english() ? "SAVED ON THIS DEVICE" : "ENREGISTRÉ SUR CET APPAREIL"
          }}
        </p>
        <h1 class="lp-heading lp-heading--large">
          {{ english() ? "Favorites" : "Favoris" }}
        </h1>
        <p class="lp-copy">
          {{
            english()
              ? "Your favorites stay on this phone."
              : "Vos favoris restent sur ce téléphone."
          }}
        </p>
      </header>
      @if (favoriteRecords().length) {
        <div class="lp-pharmacy-list">
          @for (pharmacy of favoriteRecords(); track pharmacy.id) {
            <a
              class="lp-card lp-pharmacy-row"
              [routerLink]="['/pharmacy', pharmacy.id]"
            >
              <span class="lp-pharmacy-pin" aria-hidden="true">♥</span>
              <span class="lp-pharmacy-copy"
                ><strong>{{ pharmacy.name }}</strong
                ><span class="lp-copy lp-copy--small">{{
                  pharmacy.city ||
                    pharmacy.neighbourhood ||
                    (english()
                      ? "Location not supplied"
                      : "Localisation non renseignée")
                }}</span></span
              >
              @let hoursStatus = hours.status(pharmacy);
              <span
                class="lp-badge"
                [class.lp-badge--open]="hoursStatus.state === 'open'"
                >{{
                  hoursStatus.state === "open"
                    ? english()
                      ? "OPEN · OSM"
                      : "OUVERTE · OSM"
                    : hoursStatus.state === "closed"
                      ? english()
                        ? "CLOSED · OSM"
                        : "FERMÉE · OSM"
                      : english()
                        ? "HOURS UNKNOWN"
                        : "HORAIRES INCONNUS"
                }}</span
              >
            </a>
          }
        </div>
      } @else {
        <div class="lp-card lp-empty lp-favorites-empty">
          <span class="lp-empty-icon" aria-hidden="true">♡</span>
          <h2 class="lp-section-title">
            {{ english() ? "No favorites yet" : "Aucun favori pour le moment" }}
          </h2>
          <p class="lp-copy">
            {{
              english()
                ? "Save a pharmacy from its details. Favorites stay on this device."
                : "Enregistrez une pharmacie depuis sa fiche. Les favoris restent sur cet appareil."
            }}
          </p>
          <a class="lp-button" routerLink="/tabs/map"
            >{{ english() ? "Explore the map" : "Explorer la carte" }} ↗</a
          >
        </div>
      }
      <div class="lp-card lp-offline-note">
        <div class="lp-row">
          <span aria-hidden="true">◌</span>
          <div class="lp-setting-copy">
            <strong>{{
              english() ? "Offline availability" : "Disponibilité hors ligne"
            }}</strong
            ><span class="lp-copy lp-copy--small">{{
              english()
                ? data.syncStatus().state === "ready"
                  ? "Saved pharmacies remain on this device."
                  : "No pharmacy data pack is installed."
                : data.syncStatus().state === "ready"
                  ? "Les pharmacies favorites restent sur cet appareil."
                  : "Aucun pack de pharmacies n’est installé."
            }}</span>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-page-header {
        margin: 12px 0 26px;
      }
      .lp-favorites-empty {
        min-height: 340px;
      }
      .lp-offline-note {
        margin-top: 14px;
      }
      .lp-offline-note .lp-row {
        align-items: flex-start;
      }
      .lp-offline-note strong {
        font-size: 13px;
      }
    `,
  ],
})
export class FavoritesPage {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly hours = inject(PharmacyHoursService);

  constructor() {
    void this.data
      .loadInstalledPharmacies()
      .then((records) => this.hours.prepare(records))
      .catch(() => []);
  }

  favoriteRecords(): PharmacyRecord[] {
    const favorites = new Set(this.state.favoriteIds());
    return this.data
      .pharmacies()
      .filter((pharmacy) => favorites.has(pharmacy.id));
  }
  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-settings-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen">
      <header class="lp-title-group lp-page-header">
        <p class="lp-eyebrow">{{ english() ? "LOCAPHARM" : "LOCAPHARM" }}</p>
        <h1 class="lp-heading lp-heading--large">
          {{ english() ? "Settings" : "Réglages" }}
        </h1>
      </header>

      <section
        class="lp-section lp-settings-section"
        aria-labelledby="preferences-title"
      >
        <h2 id="preferences-title" class="lp-section-title">
          {{ english() ? "Preferences" : "Préférences" }}
        </h2>
        <div class="lp-card lp-settings-card">
          <label class="lp-setting"
            ><span class="lp-setting-copy"
              ><strong>{{ english() ? "Language" : "Langue" }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english() ? "App display language" : "Langue de l’application"
              }}</span></span
            ><select
              class="lp-select"
              [value]="state.language()"
              (change)="setLanguage($event)"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select></label
          >
          <hr class="lp-separator" />
          <label class="lp-setting"
            ><span class="lp-setting-copy"
              ><strong>{{ english() ? "Appearance" : "Apparence" }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Light, dark, or device setting"
                  : "Clair, sombre ou réglage système"
              }}</span></span
            ><select
              class="lp-select"
              [value]="state.themeMode()"
              (change)="setTheme($event)"
            >
              <option value="system">
                {{ english() ? "System" : "Système" }}
              </option>
              <option value="light">{{ english() ? "Light" : "Clair" }}</option>
              <option value="dark">{{ english() ? "Dark" : "Sombre" }}</option>
            </select></label
          >
          <hr class="lp-separator" />
          <label class="lp-setting"
            ><span class="lp-setting-copy"
              ><strong>{{
                english() ? "Distance units" : "Unités de distance"
              }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Used for routes and distance"
                  : "Utilisées pour les trajets et distances"
              }}</span></span
            ><select
              class="lp-select"
              [value]="state.distanceUnit()"
              (change)="setUnit($event)"
            >
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select></label
          >
        </div>
      </section>

      <section
        class="lp-section lp-settings-section"
        aria-labelledby="updates-title"
      >
        <h2 id="updates-title" class="lp-section-title">
          {{ english() ? "App updates" : "Mises à jour de l’application" }}
        </h2>
        <div class="lp-card lp-pack-card">
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "Installed version: " + appVersion
                : "Version installée : " + appVersion
            }}
          </p>
          <button
            class="lp-button lp-button--full"
            type="button"
            [disabled]="updateCheck() === 'checking'"
            (click)="checkForUpdates()"
          >
            {{ updateCheckLabel() }}
          </button>
          @if (updateCheck() === "update") {
            @if (updateManifest(); as update) {
              <p class="lp-copy lp-copy--small">
                {{
                  english()
                    ? "Version " +
                      update.version +
                      " is available. Verify the APK checksum before installing."
                    : "La version " +
                      update.version +
                      " est disponible. Vérifiez son empreinte avant installation."
                }}
              </p>
              <p class="lp-copy lp-copy--small lp-update-hash">
                SHA-256 · {{ update.sha256 }}
              </p>
              <a
                class="lp-button lp-button--full"
                [href]="update.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{
                  english() ? "Open GitHub release" : "Ouvrir la release GitHub"
                }}
                ↗
              </a>
            }
          }
          @if (
            updateCheck() === "current" ||
            updateCheck() === "no-release" ||
            updateCheck() === "error"
          ) {
            <p class="lp-copy lp-copy--small" role="status">
              {{ updateMessage() }}
            </p>
          }
        </div>
      </section>

      <section
        class="lp-section lp-settings-section"
        aria-labelledby="packs-title"
      >
        <h2 id="packs-title" class="lp-section-title">
          {{ english() ? "Offline packs" : "Packs hors ligne" }}
        </h2>
        <div class="lp-card lp-pack-card">
          <div class="lp-row-between">
            <div class="lp-setting-copy">
              <strong>{{
                english()
                  ? "Cameroon pharmacy directory"
                  : "Annuaire des pharmacies du Cameroun"
              }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Regional OpenStreetMap pack"
                  : "Pack régional OpenStreetMap"
              }}</span>
            </div>
            <span class="lp-badge">{{
              data.syncStatus().state === "ready"
                ? english()
                  ? "INSTALLED"
                  : "INSTALLÉ"
                : data.syncStatus().state === "downloading" ||
                    data.syncStatus().state === "verifying" ||
                    data.syncStatus().state === "installing"
                  ? english()
                    ? "IN PROGRESS"
                    : "EN COURS"
                  : english()
                    ? "NOT INSTALLED"
                    : "NON INSTALLÉ"
            }}</span>
          </div>
          <p class="lp-copy lp-copy--small">
            {{ packSummary() }}
          </p>
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "OSM map entries are not verified duty schedules. Call before travelling."
                : "Les fiches OSM ne sont pas des calendriers de garde vérifiés. Appelez avant de vous déplacer."
            }}
          </p>
          <button
            class="lp-button lp-button--full"
            type="button"
            [disabled]="
              data.syncStatus().state === 'downloading' ||
              data.syncStatus().state === 'verifying' ||
              data.syncStatus().state === 'installing'
            "
            (click)="downloadPack()"
          >
            {{ packActionLabel() }}
          </button>
          @if (data.syncStatus().state === "ready") {
            <button
              class="lp-text-button lp-pack-remove"
              type="button"
              (click)="removePack()"
            >
              {{
                english()
                  ? "Remove offline pack"
                  : "Supprimer le pack hors ligne"
              }}
            </button>
          }
          @if (data.syncStatus().state === "error") {
            <p class="lp-pack-error" role="alert">
              {{ data.syncStatus().message }}
            </p>
          }
        </div>
      </section>

      <section
        class="lp-section lp-settings-section"
        aria-labelledby="about-title"
      >
        <h2 id="about-title" class="lp-section-title">
          {{ english() ? "About and information" : "À propos et informations" }}
        </h2>
        <div class="lp-card lp-settings-card">
          <a class="lp-setting lp-setting-link" routerLink="/system"
            ><span class="lp-setting-copy"
              ><strong>{{
                english() ? "System status" : "État du système"
              }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Network and data status"
                  : "Réseau et état des données"
              }}</span></span
            ><span>›</span></a
          >
          <hr class="lp-separator" />
          <a class="lp-setting lp-setting-link" routerLink="/privacy"
            ><span class="lp-setting-copy"
              ><strong>{{ english() ? "Privacy" : "Confidentialité" }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "How location, map tiles, calls, and offline data work"
                  : "Utilisation du GPS, des cartes, des appels et des données hors ligne"
              }}</span></span
            ><span>›</span></a
          >
          <hr class="lp-separator" />
          <a
            class="lp-setting lp-setting-link"
            href="/licenses/THIRD_PARTY_NOTICES.txt"
            target="_blank"
            rel="noopener noreferrer"
            ><span class="lp-setting-copy"
              ><strong>{{
                english() ? "Open-source licences" : "Licences des logiciels"
              }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Third-party software notices"
                  : "Avis sur les logiciels tiers"
              }}</span></span
            ><span>↗</span></a
          >
          <hr class="lp-separator" />
          <a class="lp-setting lp-setting-link" routerLink="/feedback"
            ><span class="lp-setting-copy"
              ><strong>{{ english() ? "Report a bug" : "Signaler un bug" }}</strong
              ><span class="lp-copy lp-copy--small">{{
                english()
                  ? "Send optional feedback without your location"
                  : "Envoyer un retour sans transmettre votre position"
              }}</span></span
            ><span>›</span></a
          >
        </div>
      </section>
      <p class="lp-copy lp-settings-disclaimer">
        {{
          english()
            ? "No pharmacy is labelled on duty without a current, traceable schedule. Call before travelling."
            : "Aucune pharmacie n’est indiquée de garde sans calendrier actuel et traçable. Appelez avant de vous déplacer."
        }}
      </p>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-page-header {
        margin: 12px 0 20px;
      }
      .lp-settings-section {
        margin-top: 22px;
      }
      .lp-settings-card {
        padding: 8px 16px;
      }
      .lp-settings-card .lp-setting {
        min-height: 66px;
      }
      .lp-setting strong {
        font-size: 13px;
      }
      .lp-setting-link {
        color: inherit;
        text-decoration: none;
      }
      .lp-pack-card {
        display: grid;
        gap: 14px;
      }
      .lp-pack-card .lp-badge {
        font-size: 9px;
      }
      .lp-pack-error {
        margin: 0;
        color: #a32727;
        font-size: 12px;
        line-height: 1.45;
      }
      .lp-pack-remove {
        justify-self: center;
        border: 0;
        padding: 8px 12px;
        color: #5b7a4e;
        background: transparent;
        font:
          600 12px Inter,
          sans-serif;
      }
      .theme-dark .lp-pack-error {
        color: #ffaaaa;
      }
      .lp-settings-disclaimer {
        margin-top: 22px;
        text-align: center;
      }
      .lp-update-hash {
        overflow-wrap: anywhere;
        font-family: monospace;
      }
    `,
  ],
})
export class SettingsPage {
  readonly appVersion = APP_VERSION;
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  private readonly http = inject(HttpClient);
  readonly updateCheck = signal<
    "idle" | "checking" | "update" | "current" | "no-release" | "error"
  >("idle");
  readonly updateManifest = signal<{
    version: string;
    url: string;
    sha256: string;
  } | null>(null);

  constructor() {
    void this.data.loadInstalledPharmacies().catch(() => []);
  }

  english(): boolean {
    return this.state.language() === "en";
  }

  packActionLabel(): string {
    const status = this.data.syncStatus().state;
    if (status === "downloading")
      return this.english() ? "Downloading…" : "Téléchargement…";
    if (status === "verifying")
      return this.english() ? "Checking integrity…" : "Vérification…";
    if (status === "installing")
      return this.english()
        ? "Installing offline pack…"
        : "Installation hors ligne…";
    return status === "ready"
      ? this.english()
        ? "Check for an update"
        : "Vérifier les mises à jour"
      : this.english()
        ? "Download Cameroon pack"
        : "Télécharger le pack Cameroun";
  }

  packSummary(): string {
    const status = this.data.syncStatus().state;
    if (status !== "idle" && status !== "error")
      return this.data.syncStatus().message;
    if (status === "error") {
      return this.english()
        ? "The last download failed. Your installed offline data, if any, remain available."
        : "Le dernier téléchargement a échoué. Les données hors ligne déjà installées restent disponibles.";
    }
    return this.english()
      ? "No local copy has been checked yet. Check for a published pack when connected."
      : "Aucune copie locale n’a encore été détectée. Recherchez un pack publié lorsque vous êtes connecté.";
  }

  async downloadPack(): Promise<void> {
    await this.data.installCameroonPack().catch(() => undefined);
  }

  async removePack(): Promise<void> {
    await this.data.removeCameroonPack().catch(() => undefined);
  }

  async checkForUpdates(): Promise<void> {
    this.updateCheck.set("checking");
    this.updateManifest.set(null);
    try {
      const value: unknown = await firstValueFrom(
        this.http.get<unknown>(
          `https://pauldjeuda.github.io/locapharm/version.json?check=${Date.now()}`,
        ),
      );
      if (!isUpdateManifest(value)) throw new Error("Invalid update manifest");
      if (!value.available) {
        this.updateCheck.set("no-release");
        return;
      }
      this.updateManifest.set(value);
      this.updateCheck.set(
        compareVersions(value.version, this.appVersion) > 0
          ? "update"
          : "current",
      );
    } catch {
      this.updateCheck.set("error");
    }
  }

  updateCheckLabel(): string {
    if (this.updateCheck() === "checking")
      return this.english() ? "Checking…" : "Vérification…";
    return this.english() ? "Check for updates" : "Rechercher une mise à jour";
  }

  updateMessage(): string {
    const status = this.updateCheck();
    if (status === "current")
      return this.english()
        ? "No newer release is available."
        : "Aucune version plus récente n’est disponible.";
    if (status === "no-release")
      return this.english()
        ? "No downloadable release has been published yet."
        : "Aucune release téléchargeable n’a encore été publiée.";
    return this.english()
      ? "The update service could not be reached. Try again when connected."
      : "Le service de mise à jour est injoignable. Réessayez avec une connexion.";
  }

  async setLanguage(event: Event): Promise<void> {
    await this.state.setLanguage(
      (event.target as HTMLSelectElement).value as AppLanguage,
    );
  }
  async setTheme(event: Event): Promise<void> {
    await this.state.setThemeMode(
      (event.target as HTMLSelectElement).value as ThemeMode,
    );
  }
  async setUnit(event: Event): Promise<void> {
    await this.state.setDistanceUnit(
      (event.target as HTMLSelectElement).value as DistanceUnit,
    );
  }
}

function isUpdateManifest(
  value: unknown,
): value is
  | { available: false }
  | { available: true; version: string; url: string; sha256: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["available"] === "boolean" &&
    (!record["available"] ||
      (typeof record["version"] === "string" &&
        /^\d+\.\d+\.\d+$/.test(record["version"]) &&
        typeof record["url"] === "string" &&
        record["url"].startsWith(
          "https://github.com/pauldjeuda/locapharm/releases/download/",
        ) &&
        typeof record["sha256"] === "string" &&
        /^[a-f0-9]{64}$/i.test(record["sha256"])))
  );
}

function compareVersions(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return 0;
}
