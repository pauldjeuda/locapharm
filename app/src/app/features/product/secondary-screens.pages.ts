import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { AppLauncher } from "@capacitor/app-launcher";
import { firstValueFrom, timeout } from "rxjs";
import {
  AppStateService,
  PharmacyFilter,
  SortOrder,
} from "../../core/state/app-state.service";
import { InstallationIdService } from "../../core/state/installation-id.service";
import { RemoteConfigService } from "../../core/data/remote-config.service";
import { APP_VERSION } from "../../core/app-version";
import { productPageStyles } from "./product.styles";
import { PharmacyDataService } from "../../core/data/pharmacy-data.service";
import {
  PharmacyPhone,
  PharmacyRecord,
} from "../../core/data/pharmacy.models";
import {
  PharmacyHoursService,
  PharmacyHoursStatus,
} from "../../core/data/pharmacy-hours.service";

@Component({
  selector: "lp-search-page",
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-search-header">
        <a class="lp-icon-button" routerLink="/tabs/map" aria-label="Retour"
          >←</a
        >
        <label class="lp-search-field" for="pharmacy-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="pharmacy-search"
            type="search"
            autocomplete="off"
            [placeholder]="
              english()
                ? 'Pharmacy, city, or area…'
                : 'Pharmacie, ville ou quartier…'
            "
            [(ngModel)]="query"
          />
          @if (query) {
            <button
              type="button"
              (click)="query = ''"
              [attr.aria-label]="
                english() ? 'Clear search' : 'Effacer la recherche'
              "
            >
              ×
            </button>
          }
        </label>
      </header>

      @if (!query.trim()) {
        <section class="lp-section">
          <div class="lp-row-between">
            <h1 class="lp-section-title">
              {{ english() ? "Covered areas" : "Zones couvertes" }}
            </h1>
            <span class="lp-copy lp-copy--small">{{
              english() ? "Not measured" : "Non mesurées"
            }}</span>
          </div>
          @if (data.pharmacies().length) {
            <div class="lp-city-list">
              @for (city of cities(); track city) {
                <button
                  class="lp-card lp-city-result"
                  type="button"
                  (click)="selectCity(city)"
                >
                  <span class="lp-empty-icon" aria-hidden="true">⌖</span>
                  <span>{{ city }}</span>
                  <span aria-hidden="true">›</span>
                </button>
              }
            </div>
            <p class="lp-copy lp-copy--small">
              {{
                english()
                  ? "Cities listed here have an OSM city tag; they do not define full coverage."
                  : "Les villes affichées ont une étiquette de ville OSM ; elles ne définissent pas une couverture complète."
              }}
            </p>
          } @else {
            <div class="lp-card lp-empty lp-search-empty">
              <span class="lp-empty-icon" aria-hidden="true">⌖</span>
              <p class="lp-section-title">
                {{
                  english()
                    ? "No regional pack installed"
                    : "Aucun pack régional installé"
                }}
              </p>
              <p class="lp-copy">
                {{
                  english()
                    ? "Install the Cameroon pack from Settings to search mapped entries."
                    : "Installez le pack Cameroun dans les réglages pour rechercher les fiches cartographiées."
                }}
              </p>
              <a class="lp-button" routerLink="/tabs/settings">{{
                english() ? "Offline packs" : "Packs hors ligne"
              }}</a>
            </div>
          }
        </section>
      } @else {
        <section class="lp-section" aria-live="polite">
          <p class="lp-eyebrow">
            {{ english() ? "SEARCH RESULTS" : "RÉSULTATS DE RECHERCHE" }}
          </p>
          @if (searchResults().length) {
            <div class="lp-search-results">
              @for (pharmacy of searchResults(); track pharmacy.id) {
                <a
                  class="lp-card lp-pharmacy-row"
                  [routerLink]="['/pharmacy', pharmacy.id]"
                >
                  <span class="lp-empty-icon" aria-hidden="true">✚</span>
                  <span class="lp-search-result-copy"
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
                    >{{ statusLabel(hoursStatus) }}</span
                  >
                </a>
              }
            </div>
          } @else {
            <div class="lp-card lp-empty lp-search-empty">
              <span class="lp-empty-icon" aria-hidden="true">⌕</span>
              <p class="lp-section-title">{{ searchEmptyTitle() }}</p>
              <p class="lp-copy">{{ searchEmptyDescription() }}</p>
              <p class="lp-copy lp-copy--small">
                {{
                  english()
                    ? "Search: “" + query + "”"
                    : "Recherche : « " + query + " »"
                }}
              </p>
            </div>
            @if (data.pharmacies().length) {
              <a
                class="lp-button lp-button--full"
                routerLink="/report/missing"
                >{{
                  english()
                    ? "Report a missing pharmacy"
                    : "Signaler une pharmacie manquante"
                }}</a
              >
            } @else {
              <a
                class="lp-button lp-button--full"
                routerLink="/tabs/settings"
                >{{
                  english()
                    ? "Install the data pack"
                    : "Installer le pack de données"
                }}</a
              >
            }
          }
        </section>
      }
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-search-header {
        margin-top: 4px;
      }
      .lp-search-field {
        display: flex;
        min-width: 0;
        min-height: 54px;
        flex: 1;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
        border-radius: 9999px;
        background: #fff;
        box-shadow: 0 4px 20px rgb(18 22 26 / 4%);
      }
      .lp-search-field span {
        font-size: 22px;
      }
      .lp-search-field input {
        min-width: 0;
        flex: 1;
        border: 0;
        outline: 0;
        color: #181c20;
        background: transparent;
        font:
          400 14px Inter,
          sans-serif;
      }
      .lp-search-field input::-webkit-search-cancel-button {
        display: none;
      }
      .lp-search-field button {
        border: 0;
        color: #5e656b;
        background: transparent;
        font-size: 24px;
      }
      .lp-search-empty {
        min-height: 280px;
      }
      .lp-city-list,
      .lp-search-results {
        display: grid;
        gap: 10px;
      }
      .lp-city-result {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 12px;
        border: 0;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }
      .lp-city-result .lp-empty-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        font-size: 18px;
      }
      .lp-city-result > span:nth-child(2) {
        flex: 1;
        font-weight: 600;
      }
      .lp-search-result-copy {
        display: grid;
        min-width: 0;
        flex: 1;
        gap: 4px;
      }
      .lp-search-result-copy strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lp-search-results .lp-pharmacy-row {
        color: inherit;
        text-decoration: none;
      }
      .theme-dark .lp-search-field {
        background: #1f2522;
      }
      .theme-dark .lp-search-field input {
        color: #fff;
      }
    `,
  ],
})
export class SearchPage implements OnInit {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly hours = inject(PharmacyHoursService);
  private readonly router = inject(Router);
  query = "";

  async ngOnInit(): Promise<void> {
    const records = await this.data.loadInstalledPharmacies().catch(() => []);
    await this.hours.prepare(records);
  }

  cities(): string[] {
    return [
      ...new Set(
        this.data
          .pharmacies()
          .map((pharmacy: PharmacyRecord) => pharmacy.city)
          .filter((city): city is string => Boolean(city)),
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
  }

  searchResults(): PharmacyRecord[] {
    const term = normalizeSearch(this.query);
    if (!term) return [];
    return this.data
      .pharmacies()
      .filter((pharmacy: PharmacyRecord) =>
        normalizeSearch(
          [
            pharmacy.name,
            pharmacy.city,
            pharmacy.neighbourhood,
            pharmacy.address?.street,
            ...(pharmacy.phones ?? []).map((phone: PharmacyPhone) => phone.number),
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(term),
      )
      .slice(0, 30);
  }

  searchEmptyTitle(): string {
    if (!this.data.pharmacies().length)
      return this.english()
        ? "No local pack is installed"
        : "Aucun pack local n’est installé";
    return this.english()
      ? "No mapped entry matches"
      : "Aucune fiche cartographiée ne correspond";
  }

  searchEmptyDescription(): string {
    return this.english()
      ? "A missing result does not mean that no pharmacy exists in this area."
      : "Une absence de résultat ne signifie pas qu’il n’existe aucune pharmacie dans cette zone.";
  }

  async selectCity(city: string): Promise<void> {
    await this.state.setCity(city);
    this.state.locationFix.set(null);
    await this.router.navigate(["/tabs/map"]);
  }

  statusLabel(status: PharmacyHoursStatus): string {
    if (status.state === "open")
      return this.english() ? "OPEN · OSM" : "OUVERTE · OSM";
    if (status.state === "closed")
      return this.english() ? "CLOSED · OSM" : "FERMÉE · OSM";
    return this.english() ? "HOURS UNKNOWN" : "HORAIRES INCONNUS";
  }
  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-filters-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--sheet">
      <div class="lp-sheet-backdrop" aria-hidden="true"></div>
      <section class="lp-filter-sheet" aria-labelledby="filters-title">
        <header class="lp-row-between">
          <span class="lp-sheet-handle" aria-hidden="true"></span
          ><button class="lp-text-button" type="button" (click)="reset()">
            {{ english() ? "Reset" : "Réinitialiser" }}
          </button>
        </header>
        <h1 id="filters-title" class="lp-heading">
          {{ english() ? "Filters" : "Filtres" }}
        </h1>
        <section class="lp-section">
          <div class="lp-row-between">
            <h2 class="lp-section-title">
              {{ english() ? "Search radius" : "Rayon de recherche" }}
            </h2>
            <strong class="lp-radius"
              >{{ state.radiusKm() }}
              <small>{{ english() ? "km" : "km" }}</small></strong
            >
          </div>
          <input
            class="lp-range"
            type="range"
            min="1"
            max="20"
            step="1"
            [value]="state.radiusKm()"
            (input)="setRadius($event)"
            [attr.aria-label]="
              english()
                ? 'Search radius in kilometres'
                : 'Rayon de recherche en kilomètres'
            "
          />
          <div class="lp-row-between lp-copy lp-copy--small">
            <span>1 km</span><span>20 km</span>
          </div>
        </section>
        <section class="lp-section">
          <h2 class="lp-section-title">
            {{ english() ? "Availability" : "Disponibilité" }}
          </h2>
          <div class="lp-chip-row lp-chip-row--wrap">
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
        </section>
        <section class="lp-section">
          <h2 class="lp-section-title">
            {{ english() ? "Sort by" : "Trier par" }}
          </h2>
          <div class="lp-row lp-sort-options">
            <button
              class="lp-chip"
              type="button"
              [attr.aria-pressed]="state.sortOrder() === 'distance'"
              (click)="setSort('distance')"
            >
              {{ english() ? "Distance" : "Distance" }}
            </button>
            <button
              class="lp-chip"
              type="button"
              [attr.aria-pressed]="state.sortOrder() === 'name'"
              (click)="setSort('name')"
            >
              {{ english() ? "Name A–Z" : "Nom A–Z" }}
            </button>
          </div>
        </section>
        <label class="lp-phone-filter"
          ><input
            type="checkbox"
            [checked]="state.phoneOnly()"
            (change)="setPhoneOnly($event)"
          /><span>{{
            english() ? "Phone number available" : "Avec téléphone renseigné"
          }}</span></label
        >
        <a class="lp-button lp-button--full" routerLink="/tabs/map"
          >{{ english() ? "Show results" : "Afficher les résultats" }} ↗</a
        >
        <p class="lp-copy lp-copy--small lp-filter-note">
          {{
            english()
              ? "No pharmacy count is available until regional data is installed."
              : "Aucun nombre de pharmacies n’est disponible avant l’installation des données régionales."
          }}
        </p>
      </section>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-screen--sheet {
        position: relative;
        display: grid;
        align-items: end;
        padding: 0;
        background: transparent;
      }
      .lp-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgb(18 22 26 / 35%);
        backdrop-filter: blur(4px);
      }
      .lp-filter-sheet {
        position: relative;
        display: grid;
        max-height: 92dvh;
        gap: 8px;
        overflow-y: auto;
        padding: 14px 20px max(22px, env(safe-area-inset-bottom));
        border-radius: 32px 32px 0 0;
        background: #fff;
        box-shadow: 0 -8px 32px rgb(18 22 26 / 8%);
      }
      .lp-filter-sheet > header {
        min-height: 30px;
      }
      .lp-filter-sheet .lp-sheet-handle {
        margin: 0 auto;
      }
      .lp-text-button {
        border: 0;
        padding: 8px;
        color: #5b7a4e;
        background: transparent;
        font:
          600 12px Inter,
          sans-serif;
      }
      .lp-radius {
        color: #3f5a36;
        font:
          700 34px/1 Syne,
          sans-serif;
        font-variant-numeric: tabular-nums;
      }
      .lp-radius small {
        font:
          600 12px Inter,
          sans-serif;
      }
      .lp-chip-row--wrap {
        flex-wrap: wrap;
        overflow: visible;
      }
      .lp-sort-options {
        flex-wrap: wrap;
      }
      .lp-phone-filter {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 52px;
        font-size: 13px;
      }
      .lp-phone-filter input {
        width: 20px;
        height: 20px;
        accent-color: #3f5a36;
      }
      .lp-filter-note {
        text-align: center;
      }
      .theme-dark .lp-filter-sheet {
        background: #1f2522;
      }
      .theme-dark .lp-radius,
      .theme-dark .lp-text-button {
        color: #caf208;
      }
    `,
  ],
})
export class FiltersPage {
  readonly state = inject(AppStateService);
  english(): boolean {
    return this.state.language() === "en";
  }
  setRadius(event: Event): void {
    void this.state.setRadius(Number((event.target as HTMLInputElement).value));
  }
  setFilter(value: PharmacyFilter): void {
    this.state.filter.set(value);
  }
  setSort(value: SortOrder): void {
    void this.state.setSortOrder(value);
  }
  setPhoneOnly(event: Event): void {
    void this.state.setPhoneOnly((event.target as HTMLInputElement).checked);
  }
  reset(): void {
    void this.state.setRadius(5);
    this.state.filter.set("all");
    void this.state.setSortOrder("distance");
    void this.state.setPhoneOnly(false);
  }
}

@Component({
  selector: "lp-pharmacy-detail-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row-between lp-detail-header">
        <a class="lp-icon-button" routerLink="/tabs/map" aria-label="Retour"
          >←</a
        >
        <h1 class="lp-section-title">
          {{ english() ? "Pharmacy details" : "Fiche pharmacie" }}
        </h1>
        <span class="lp-icon-button" aria-hidden="true">↗</span>
      </header>
      @if (pharmacy(); as record) {
        <div class="lp-card lp-detail-card">
          <div class="lp-row-between lp-detail-title">
            <div class="lp-title-group">
              <p class="lp-eyebrow">
                {{ record.city || (english() ? "CAMEROON" : "CAMEROUN") }}
              </p>
              <h2 class="lp-heading">{{ record.name }}</h2>
            </div>
            <button
              class="lp-icon-button"
              type="button"
              (click)="toggleFavorite()"
              [attr.aria-label]="
                isFavorite()
                  ? english()
                    ? 'Remove from favorites'
                    : 'Retirer des favoris'
                  : english()
                    ? 'Add to favorites'
                    : 'Ajouter aux favoris'
              "
            >
              {{ isFavorite() ? "♥" : "♡" }}
            </button>
          </div>
          @let hoursStatus = hours.status(record);
          <span
            class="lp-badge"
            [class.lp-badge--open]="hoursStatus.state === 'open'"
            >{{ statusLabel(hoursStatus) }}</span
          >
          <p class="lp-copy lp-duty-callout">
            {{ statusNotice(hoursStatus) }}
          </p>

          <section class="lp-detail-section">
            <h2 class="lp-section-title">
              {{ english() ? "Address" : "Adresse" }}
            </h2>
            <p class="lp-copy">
              {{
                address(record) ||
                  (english()
                    ? "Address not supplied in OpenStreetMap."
                    : "Adresse non renseignée dans OpenStreetMap.")
              }}
            </p>
            <a
              class="lp-text-link"
              [href]="osmMapUrl(record)"
              target="_blank"
              rel="noopener noreferrer"
              >{{
                english()
                  ? "View mapped location"
                  : "Voir l’emplacement cartographié"
              }}
              ↗</a
            >
          </section>

          <section class="lp-detail-section">
            <h2 class="lp-section-title">
              {{ english() ? "Phone" : "Téléphone" }}
            </h2>
            @if (record.phones?.length) {
              @for (phone of record.phones; track phone.number) {
                <a
                  class="lp-button lp-button--full"
                  [href]="'tel:' + phone.number"
                  >{{ phone.number }}</a
                >
              }
            } @else {
              <p class="lp-copy">
                {{
                  english()
                    ? "No phone number is recorded."
                    : "Aucun numéro n’est renseigné."
                }}
              </p>
            }
          </section>

          <section class="lp-detail-section">
            <h2 class="lp-section-title">
              {{ english() ? "Opening hours" : "Horaires d’ouverture" }}
            </h2>
            <p class="lp-copy">
              {{
                record.opening_hours ||
                  (english()
                    ? "No hours are recorded."
                    : "Aucun horaire n’est renseigné.")
              }}
            </p>
            <p class="lp-copy lp-copy--small">
              {{
                english()
                  ? "This is an OSM contribution, not a current confirmation."
                  : "Cette information est une contribution OSM, pas une confirmation actuelle."
              }}
            </p>
          </section>

          <section class="lp-detail-section">
            <h2 class="lp-section-title">
              {{ english() ? "Source and date" : "Source et date" }}
            </h2>
            <a
              class="lp-text-link"
              [href]="record.source.url"
              target="_blank"
              rel="noopener noreferrer"
              >OpenStreetMap · {{ record.id }} ↗</a
            >
            <p class="lp-copy lp-copy--small">
              {{
                english() ? "OSM object last edited:" : "Objet OSM modifié le :"
              }}
              {{ record.updated_at }}
            </p>
          </section>

          <a
            class="lp-button lp-button--full lp-button--sage"
            [routerLink]="['/route', record.id]"
            >{{ english() ? "Directions" : "Itinéraire" }} ↗</a
          >
          <a class="lp-text-link" [routerLink]="['/report', record.id]">{{
            english()
              ? "Report incorrect information"
              : "Signaler une information incorrecte"
          }}</a>
          <a class="lp-text-link" routerLink="/emergency"
            >{{ english() ? "Emergency numbers" : "Numéros d’urgence" }} ·
            {{ english() ? "Open" : "Ouvrir" }}</a
          >
        </div>
      } @else {
        <div class="lp-card lp-empty lp-detail-empty">
          <span class="lp-empty-icon" aria-hidden="true">＋</span>
          <p class="lp-eyebrow">{{ id() }}</p>
          <h2 class="lp-section-title">
            {{
              loading()
                ? english()
                  ? "Loading the local record…"
                  : "Chargement de la fiche locale…"
                : english()
                  ? "This pharmacy record is not available"
                  : "Cette fiche pharmacie n’est pas disponible"
            }}
          </h2>
          <p class="lp-copy">
            {{
              english()
                ? "The record may not be part of the installed pack. A missing record does not mean that no pharmacy exists here."
                : "La fiche n’est peut-être pas incluse dans le pack installé. Son absence ne signifie pas qu’il n’existe aucune pharmacie ici."
            }}
          </p>
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "Call before travelling."
                : "Appelez avant de vous déplacer."
            }}
          </p>
        </div>
      }
      <a class="lp-button lp-button--full" routerLink="/tabs/map">{{
        english() ? "Back to map" : "Retour à la carte"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-detail-header {
        margin-bottom: 24px;
      }
      .lp-detail-header h1 {
        flex: 1;
        text-align: center;
      }
      .lp-detail-empty {
        min-height: 380px;
        margin-bottom: 18px;
      }
      .lp-detail-card {
        display: grid;
        gap: 16px;
      }
      .lp-detail-title {
        align-items: flex-start;
        gap: 8px;
      }
      .lp-detail-title .lp-heading {
        overflow-wrap: anywhere;
      }
      .lp-duty-callout {
        padding: 12px;
        border-radius: 16px;
        color: #2e3d27;
        background: #e8ffd9;
        font-weight: 600;
      }
      .lp-detail-section {
        display: grid;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid rgb(94 101 107 / 12%);
      }
    `,
  ],
})
export class PharmacyDetailPage implements OnInit {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly hours = inject(PharmacyHoursService);
  private readonly route = inject(ActivatedRoute);
  readonly pharmacy = signal<PharmacyRecord | null>(null);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    const id = this.id();
    const pharmacy = await this.data.pharmacyById(id).catch(() => null);
    if (pharmacy) await this.hours.prepare([pharmacy]);
    this.pharmacy.set(pharmacy);
    this.loading.set(false);
  }

  id(): string {
    return this.route.snapshot.paramMap.get("id") ?? "";
  }

  isFavorite(): boolean {
    const record = this.pharmacy();
    return Boolean(record && this.state.favoriteIds().includes(record.id));
  }

  async toggleFavorite(): Promise<void> {
    const record = this.pharmacy();
    if (record) await this.state.toggleFavorite(record.id);
  }

  address(record: PharmacyRecord): string {
    return [
      record.address?.street,
      record.address?.neighbourhood ?? record.neighbourhood,
      record.address?.city ?? record.city,
      record.address?.region ?? record.region,
    ]
      .filter(Boolean)
      .join(", ");
  }

  osmMapUrl(record: PharmacyRecord): string {
    return `https://www.openstreetmap.org/?mlat=${record.lat}&mlon=${record.lon}#map=18/${record.lat}/${record.lon}`;
  }

  english(): boolean {
    return this.state.language() === "en";
  }

  statusLabel(status: PharmacyHoursStatus): string {
    if (status.state === "open")
      return this.english() ? "OPEN · OSM HOURS" : "OUVERTE · HORAIRES OSM";
    if (status.state === "closed")
      return this.english() ? "CLOSED · OSM HOURS" : "FERMÉE · HORAIRES OSM";
    return this.english() ? "HOURS UNKNOWN" : "HORAIRES INCONNUS";
  }

  statusNotice(status: PharmacyHoursStatus): string {
    const dutyNotice = this.english()
      ? "No verified duty schedule is available."
      : "Aucun calendrier de garde vérifié n’est disponible.";
    const callNotice = this.english()
      ? "Call before travelling."
      : "Appelez avant de vous déplacer.";
    if (status.state === "unknown") {
      return `${dutyNotice} ${callNotice}`;
    }

    const currentState =
      status.state === "open"
        ? this.english()
          ? "OSM hours list this pharmacy as open now."
          : "Les horaires OSM indiquent cette pharmacie ouverte actuellement."
        : this.english()
          ? "OSM hours list this pharmacy as closed now."
          : "Les horaires OSM indiquent cette pharmacie fermée actuellement.";
    const nextChange = status.nextChange
      ? this.nextChangeText(status.nextChange)
      : "";
    return [currentState, nextChange, dutyNotice, callNotice]
      .filter(Boolean)
      .join(" ");
  }

  private nextChangeText(
    change: NonNullable<PharmacyHoursStatus["nextChange"]>,
  ): string {
    const day =
      change.dayOffset === 0
        ? this.english()
          ? "today"
          : "aujourd’hui"
        : change.dayOffset === 1
          ? this.english()
            ? "tomorrow"
            : "demain"
          : `${this.english() ? "in" : "dans"} ${change.dayOffset} ${this.english() ? "days" : "jours"}`;
    if (change.direction === "closes")
      return this.english()
        ? `Listed hours end ${day} at ${change.time}.`
        : `Fin des horaires indiqués ${day} à ${change.time}.`;
    return this.english()
      ? `Listed hours start ${day} at ${change.time}.`
      : `Début des horaires indiqués ${day} à ${change.time}.`;
  }
}

@Component({
  selector: "lp-report-page",
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-report-header">
        <a class="lp-icon-button" routerLink="/tabs/map" aria-label="Retour"
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">
            {{ english() ? "DATA CORRECTION" : "CORRECTION DE DONNÉES" }}
          </p>
          <h1 class="lp-heading">
            {{ english() ? "Report an issue" : "Signaler une erreur" }}
          </h1>
        </div>
      </header>
      @if (checking()) {
        <p class="lp-copy" role="status">
          {{
            english() ? "Checking report service…" : "Vérification du service…"
          }}
        </p>
      } @else if (!available()) {
        <div class="lp-card lp-report-notice" role="status">
          <strong>{{
            english() ? "Reporting unavailable" : "Signalement indisponible"
          }}</strong>
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "No report has been sent. This service is enabled only after its data and privacy setup is complete."
                : "Aucun signalement n’a été envoyé. Le service reste fermé tant que ses réglages de données et de confidentialité ne sont pas prêts."
            }}
          </p>
          <button
            class="lp-button lp-button--light"
            type="button"
            (click)="refreshAvailability()"
          >
            {{ english() ? "Try again" : "Réessayer" }}
          </button>
        </div>
      } @else if (!pharmacy()) {
        <div class="lp-card lp-report-notice" role="status">
          <strong>{{
            english()
              ? "Pharmacy location unavailable"
              : "Emplacement de la pharmacie indisponible"
          }}</strong>
          <p class="lp-copy lp-copy--small">
            {{
              isMissingReport
                ? english()
                  ? "A missing-pharmacy report needs a location pin. That flow is not ready, so nothing has been sent."
                  : "Un signalement de pharmacie absente doit inclure un point choisi sur la carte. Ce parcours n’est pas prêt ; rien n’a été envoyé."
                : english()
                  ? "This pharmacy is not in an installed data pack. Nothing has been sent."
                  : "Cette pharmacie ne figure pas dans un pack installé. Rien n’a été envoyé."
            }}
          </p>
        </div>
      } @else {
        <div class="lp-card lp-report-notice" role="note">
          <strong>{{ pharmacy()!.name }}</strong>
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "Only the pharmacy record, selected reasons, and optional details are sent. Your GPS position and contact details are not included. Details are encrypted and kept for at most 30 days."
                : "Seuls la fiche pharmacie, les motifs choisis et les précisions facultatives sont envoyés. Votre position GPS et vos coordonnées ne sont pas incluses. Les précisions sont chiffrées et conservées au maximum 30 jours."
            }}
          </p>
        </div>
        <section class="lp-section">
          <h2 class="lp-section-title">
            {{
              english() ? "What needs correction?" : "Que faut-il corriger ?"
            }}
          </h2>
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.phone" /><span>{{
              english() ? "Phone number" : "Numéro de téléphone"
            }}</span></label
          >
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.address" /><span>{{
              english() ? "Address or location" : "Adresse ou emplacement"
            }}</span></label
          >
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.hours" /><span>{{
              english() ? "Opening hours" : "Horaires d’ouverture"
            }}</span></label
          >
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.closed" /><span>{{
              english() ? "Pharmacy is closed" : "Pharmacie fermée"
            }}</span></label
          >
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.duty" /><span>{{
              english() ? "Duty information" : "Information de garde"
            }}</span></label
          >
          <label class="lp-check-row"
            ><input type="checkbox" [(ngModel)]="reasons.access" /><span>{{
              english() ? "Access information" : "Information d’accès"
            }}</span></label
          >
        </section>
        <label class="lp-label lp-report-details" for="report-details">
          {{
            english()
              ? "Additional details (optional)"
              : "Précisions (facultatif)"
          }}
          <textarea
            id="report-details"
            class="lp-textarea"
            rows="4"
            maxlength="500"
            [(ngModel)]="details"
          ></textarea>
        </label>
        <button
          class="lp-button lp-button--full"
          type="button"
          [disabled]="sending() || !canSubmit()"
          (click)="submit()"
        >
          {{
            sending()
              ? english()
                ? "Sending…"
                : "Envoi…"
              : english()
                ? "Send report"
                : "Envoyer le signalement"
          }}
        </button>
        @if (reference()) {
          <p class="lp-card lp-report-result" role="status">
            {{ english() ? "Received · reference" : "Reçu · référence" }}
            <code>{{ reference() }}</code>
          </p>
        }
        @if (submitError()) {
          <p class="lp-report-error" role="alert">{{ submitError() }}</p>
        }
      }
      <a class="lp-text-link lp-report-back" routerLink="/tabs/map">{{
        english() ? "Cancel" : "Annuler"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-report-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-report-notice {
        padding: 16px;
      }
      .lp-report-notice strong {
        font-size: 13px;
      }
      .lp-report-notice p {
        margin: 8px 0 0;
      }
      .lp-report-notice .lp-button {
        justify-self: start;
        margin-top: 8px;
      }
      .lp-check-row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        font-size: 13px;
      }
      .lp-check-row input {
        width: 20px;
        height: 20px;
        accent-color: #3f5a36;
      }
      .lp-textarea {
        box-sizing: border-box;
        width: 100%;
        min-height: 112px;
        padding: 14px;
        border: 0;
        border-radius: 18px;
        color: #181c20;
        background: #fff;
        font:
          14px/1.4 Inter,
          sans-serif;
        resize: vertical;
      }
      .lp-report-details {
        margin: 22px 0;
      }
      .lp-report-back {
        justify-self: center;
        padding: 12px;
        text-decoration: none;
      }
      .lp-report-result {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 16px;
      }
      .lp-report-result code {
        overflow-wrap: anywhere;
      }
      .lp-report-error {
        color: #a32727;
      }
      .theme-dark .lp-textarea {
        color: #fff;
        background: #1f2522;
      }
      .theme-dark .lp-report-error {
        color: #ffaaaa;
      }
    `,
  ],
})
export class ReportPage implements OnInit {
  readonly state = inject(AppStateService);
  readonly route = inject(ActivatedRoute);
  readonly data = inject(PharmacyDataService);
  readonly remote = inject(RemoteConfigService);
  private readonly http = inject(HttpClient);
  private readonly installationId = inject(InstallationIdService);
  readonly checking = signal(true);
  readonly sending = signal(false);
  readonly pharmacy = signal<PharmacyRecord | null>(null);
  readonly reference = signal<string | null>(null);
  readonly submitError = signal("");
  readonly isMissingReport =
    this.route.snapshot.paramMap.get("id") === "missing";
  readonly available = computed(
    () =>
      this.remote.config()?.features.report_submission === true &&
      this.remote.workerBaseUrl() !== null,
  );
  readonly reasons = {
    phone: false,
    address: false,
    hours: false,
    closed: false,
    duty: false,
    access: false,
  };
  details = "";

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("id") ?? "";
    const pharmacyPromise =
      id && id !== "missing"
        ? this.data.pharmacyById(id).catch(() => null)
        : Promise.resolve(null);
    const [pharmacy] = await Promise.all([pharmacyPromise, this.remote.load()]);
    this.pharmacy.set(pharmacy);
    this.checking.set(false);
  }

  async refreshAvailability(): Promise<void> {
    this.checking.set(true);
    await this.remote.load(true);
    this.checking.set(false);
  }

  canSubmit(): boolean {
    return Object.values(this.reasons).some(Boolean);
  }

  async submit(): Promise<void> {
    const pharmacy = this.pharmacy();
    const workerBaseUrl = this.remote.workerBaseUrl();
    if (!this.available() || !workerBaseUrl || !pharmacy || !this.canSubmit()) {
      return;
    }
    this.sending.set(true);
    this.submitError.set("");
    this.reference.set(null);
    try {
      const reasons = Object.entries(this.reasons)
        .filter(([, selected]) => selected)
        .map(([reason]) => reason);
      const response: unknown = await firstValueFrom(
        this.http
          .post<unknown>(`${workerBaseUrl}/reports`, {
            pharmacy_id: pharmacy.id,
            kind: "correction",
            reasons,
            details: this.details.trim(),
            proposed_lat: null,
            proposed_lon: null,
            contact_phone: null,
            contact_consent: false,
            installation_id: await this.installationId.getOrCreate(),
          })
          .pipe(timeout(8000)),
      );
      if (
        !isRecord(response) ||
        response["accepted"] !== true ||
        typeof response["reference"] !== "string"
      ) {
        throw new Error("invalid_response");
      }
      this.reference.set(response["reference"]);
      this.details = "";
      for (const reason of Object.keys(this.reasons) as Array<
        keyof typeof this.reasons
      >) {
        this.reasons[reason] = false;
      }
    } catch {
      this.submitError.set(
        this.english()
          ? "We could not confirm delivery. If no reference appears, retry when connected."
          : "La réception n’a pas pu être confirmée. Si aucune référence n’apparaît, réessayez avec une connexion stable.",
      );
    } finally {
      this.sending.set(false);
    }
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-feedback-page",
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-report-header">
        <a
          class="lp-icon-button"
          routerLink="/tabs/settings"
          [attr.aria-label]="
            english() ? 'Back to settings' : 'Retour aux réglages'
          "
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">LOCAPHARM</p>
          <h1 class="lp-heading">
            {{ english() ? "Report a bug" : "Signaler un bug" }}
          </h1>
        </div>
      </header>

      <div class="lp-card lp-report-notice" role="status">
        <strong>{{
          english() ? "No location is sent" : "Aucune position n’est envoyée"
        }}</strong>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "Your message is encrypted before storage and kept for at most 30 days. Diagnostics are optional and off by default."
              : "Votre message est chiffré avant stockage et conservé au maximum 30 jours. Les diagnostics sont facultatifs et désactivés par défaut."
          }}
        </p>
      </div>

      @if (checking()) {
        <p class="lp-copy" role="status">
          {{
            english() ? "Checking report service…" : "Vérification du service…"
          }}
        </p>
      } @else if (!available()) {
        <div class="lp-card lp-feedback-unavailable" role="status">
          <h2 class="lp-section-title">
            {{
              english()
                ? "Feedback is unavailable"
                : "Le service de feedback est indisponible"
            }}
          </h2>
          <p class="lp-copy lp-copy--small">
            {{
              english()
                ? "No message has been sent. Check your connection or try again later."
                : "Aucun message n’a été envoyé. Vérifiez votre connexion ou réessayez plus tard."
            }}
          </p>
          <button
            class="lp-button lp-button--light"
            type="button"
            (click)="refreshAvailability()"
          >
            {{ english() ? "Try again" : "Réessayer" }}
          </button>
        </div>
      } @else {
        @if (remote.config()?.notice; as notice) {
          <p class="lp-card lp-feedback-notice" role="note">{{ notice }}</p>
        }
        <label class="lp-label lp-feedback-message" for="feedback-message">
          {{ english() ? "What happened?" : "Que s’est-il passé ?" }}
          <textarea
            id="feedback-message"
            class="lp-textarea"
            rows="6"
            maxlength="1000"
            autocomplete="off"
            [(ngModel)]="message"
          ></textarea>
          <span class="lp-copy lp-copy--small">{{ message.length }}/1000</span>
        </label>
        <label class="lp-check-row lp-feedback-consent">
          <input type="checkbox" [(ngModel)]="diagnosticsOptIn" />
          <span>{{
            english()
              ? "Include basic diagnostics (app version, platform, language, connection state)"
              : "Inclure des diagnostics simples (version, plateforme, langue, état réseau)"
          }}</span>
        </label>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "Diagnostics never include GPS, contacts, device identifiers, or browsing history."
              : "Les diagnostics n’incluent ni GPS, ni contacts, ni identifiant de l’appareil, ni historique de navigation."
          }}
        </p>
        <button
          class="lp-button lp-button--full"
          type="button"
          [disabled]="sending() || !message.trim()"
          (click)="submit()"
        >
          {{
            sending()
              ? english()
                ? "Sending…"
                : "Envoi…"
              : english()
                ? "Send feedback"
                : "Envoyer le retour"
          }}
        </button>
        @if (reference()) {
          <p class="lp-card lp-feedback-result" role="status">
            {{ english() ? "Received · reference" : "Reçu · référence" }}
            <code>{{ reference() }}</code>
          </p>
        }
        @if (submitError()) {
          <p class="lp-feedback-error" role="alert">{{ submitError() }}</p>
        }
      }
      <a class="lp-text-link lp-report-back" routerLink="/tabs/settings">{{
        english() ? "Back to settings" : "Retour aux réglages"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-report-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-report-notice,
      .lp-feedback-unavailable,
      .lp-feedback-result {
        display: grid;
        gap: 8px;
        padding: 16px;
        margin-bottom: 18px;
      }
      .lp-report-notice p,
      .lp-feedback-unavailable p,
      .lp-feedback-result p {
        margin: 0;
      }
      .lp-feedback-unavailable .lp-button {
        justify-self: start;
      }
      .lp-feedback-notice {
        padding: 12px 16px;
      }
      .lp-feedback-message {
        display: grid;
        gap: 8px;
        margin: 20px 0 12px;
      }
      .lp-textarea {
        box-sizing: border-box;
        width: 100%;
        min-height: 150px;
        padding: 14px;
        border: 0;
        border-radius: 18px;
        color: #181c20;
        background: #fff;
        font:
          14px/1.4 Inter,
          sans-serif;
        resize: vertical;
      }
      .lp-check-row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        font-size: 13px;
      }
      .lp-check-row input {
        width: 20px;
        height: 20px;
        accent-color: #3f5a36;
      }
      .lp-feedback-consent {
        margin-top: 14px;
      }
      .lp-feedback-result code {
        overflow-wrap: anywhere;
      }
      .lp-feedback-error {
        color: #a32727;
      }
      .lp-report-back {
        justify-self: center;
        padding: 12px;
        text-decoration: none;
      }
      .theme-dark .lp-textarea {
        color: #fff;
        background: #1f2522;
      }
      .theme-dark .lp-feedback-error {
        color: #ffaaaa;
      }
    `,
  ],
})
export class FeedbackPage implements OnInit {
  readonly state = inject(AppStateService);
  readonly remote = inject(RemoteConfigService);
  private readonly http = inject(HttpClient);
  private readonly installationId = inject(InstallationIdService);
  readonly checking = signal(true);
  readonly sending = signal(false);
  readonly reference = signal<string | null>(null);
  readonly submitError = signal("");
  message = "";
  readonly available = computed(
    () =>
      this.remote.config()?.features.feedback_submission === true &&
      this.remote.workerBaseUrl() !== null,
  );
  diagnosticsOptIn = false;

  async ngOnInit(): Promise<void> {
    await this.remote.load();
    this.checking.set(false);
  }

  english(): boolean {
    return this.state.language() === "en";
  }

  async refreshAvailability(): Promise<void> {
    this.checking.set(true);
    await this.remote.load(true);
    this.checking.set(false);
  }

  async submit(): Promise<void> {
    const workerBaseUrl = this.remote.workerBaseUrl();
    if (!this.available() || !workerBaseUrl || !this.message.trim()) return;
    this.sending.set(true);
    this.submitError.set("");
    this.reference.set(null);
    try {
      const installationId = await this.installationId.getOrCreate();
      const payload = {
        message: this.message.trim(),
        diagnostics_opt_in: this.diagnosticsOptIn,
        diagnostics: this.diagnosticsOptIn
          ? {
              app_version: APP_VERSION,
              platform:
                Capacitor.getPlatform() === "android" ? "android" : "web",
              locale: this.state.language(),
              network:
                navigator.onLine === true
                  ? "online"
                  : navigator.onLine === false
                    ? "offline"
                    : "unknown",
            }
          : undefined,
        installation_id: installationId,
      };
      const response: unknown = await firstValueFrom(
        this.http
          .post<unknown>(`${workerBaseUrl}/feedback`, payload)
          .pipe(timeout(8000)),
      );
      if (
        !isRecord(response) ||
        response["accepted"] !== true ||
        typeof response["reference"] !== "string"
      ) {
        throw new Error("invalid_response");
      }
      this.reference.set(response["reference"]);
      this.message = "";
      this.diagnosticsOptIn = false;
    } catch {
      this.submitError.set(
        this.english()
          ? "We could not confirm delivery. If no reference appears, retry when connected."
          : "La réception n’a pas pu être confirmée. Si aucune référence n’apparaît, réessayez avec une connexion stable.",
      );
    } finally {
      this.sending.set(false);
    }
  }
}

@Component({
  selector: "lp-route-preview-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-report-header">
        <a class="lp-icon-button" routerLink="/tabs/map" aria-label="Retour"
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">{{ english() ? "ROUTE" : "ITINÉRAIRE" }}</p>
          <h1 class="lp-heading">
            {{ english() ? "Route preview" : "Aperçu du trajet" }}
          </h1>
        </div>
      </header>
      <div class="lp-route-canvas">
        @if (pharmacy(); as record) {
          <div class="lp-route-empty">
            <span class="lp-empty-icon" aria-hidden="true">↗</span>
            <h2 class="lp-section-title">
              {{
                english()
                  ? "Destination: " + record.name
                  : "Destination : " + record.name
              }}
            </h2>
            <p class="lp-copy">
              {{
                english()
                  ? "Turn-by-turn guidance is not available inside Locapharm. Open the mapped destination in a maps app to plan a route."
                  : "Le guidage étape par étape n’est pas disponible dans Locapharm. Ouvrez l’emplacement dans une application de cartes pour calculer un trajet."
              }}
            </p>
            <p class="lp-copy lp-copy--small">
              {{
                english()
                  ? "The selected app receives the pharmacy coordinates only after you tap below."
                  : "L’application choisie reçoit les coordonnées de la pharmacie uniquement après votre action ci-dessous."
              }}
            </p>
          </div>
        } @else {
          <div class="lp-route-empty">
            <span class="lp-empty-icon" aria-hidden="true">↗</span>
            <h2 class="lp-section-title">
              {{
                english()
                  ? "Destination unavailable"
                  : "Destination indisponible"
              }}
            </h2>
            <p class="lp-copy">
              {{
                english()
                  ? "Install a pharmacy pack or return to the directory."
                  : "Installez un pack de pharmacies ou revenez à l’annuaire."
              }}
            </p>
          </div>
        }
      </div>
      @if (pharmacy()) {
        <button
          class="lp-button lp-button--full lp-route-external"
          type="button"
          (click)="openMapsApp()"
        >
          {{
            english()
              ? "Open destination in a maps app"
              : "Ouvrir la destination dans une application de cartes"
          }}
          ↗
        </button>
      }
      @if (launchError()) {
        <p class="lp-copy lp-route-error" role="alert">{{ launchError() }}</p>
      }
      <p class="lp-copy lp-copy--small lp-route-disclaimer">
        {{
          english()
            ? "No route, ETA, traffic, or live guidance is provided by Locapharm yet."
            : "Locapharm ne fournit pas encore d’itinéraire, d’estimation, de trafic ou de guidage en direct."
        }}
      </p>
      <a class="lp-button lp-button--full" routerLink="/tabs/map">{{
        english() ? "Back to pharmacy list" : "Retour à la liste des pharmacies"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-report-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-route-canvas {
        display: grid;
        min-height: 330px;
        place-items: center;
        margin-bottom: 16px;
        border-radius: 28px;
        background: #dfe2e5;
      }
      .lp-route-empty {
        display: grid;
        max-width: 270px;
        justify-items: center;
        gap: 12px;
        padding: 20px;
        border-radius: 24px;
        background: rgb(255 255 255 / 93%);
        text-align: center;
      }
      .lp-route-modes {
        margin-bottom: 16px;
      }
      .lp-route-external {
        margin: 12px 0;
      }
      .lp-route-error,
      .lp-route-disclaimer {
        text-align: center;
      }
      .theme-dark .lp-route-canvas {
        background: #1f2522;
      }
      .theme-dark .lp-route-empty {
        background: #29302c;
      }
    `,
  ],
})
export class RoutePreviewPage implements OnInit {
  readonly state = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(PharmacyDataService);
  readonly pharmacy = signal<PharmacyRecord | null>(null);
  readonly launchError = signal("");
  readonly travelMode = signal<"walking" | "moto" | "car">("walking");
  readonly selectedRoute = signal<"fastest" | "alt">("fastest");

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("id") ?? "";
    this.pharmacy.set(await this.data.pharmacyById(id).catch(() => null));
    const radius = this.state.radiusKm();
    if (radius <= 2) this.travelMode.set("walking");
    else if (radius <= 8) this.travelMode.set("moto");
    else this.travelMode.set("car");
  }

  durationForMode(mode: "walking" | "moto" | "car"): string {
    const p = this.pharmacy();
    const fix = this.state.locationFix();
    let km = 1.4;
    if (p && fix) {
      km = this.calcDistanceKm(fix.latitude, fix.longitude, p.lat, p.lon);
    }
    const detour = km * 1.3;
    let speed = 4.5;
    if (mode === "moto") speed = 20;
    else if (mode === "car") speed = 15;
    const minutes = Math.max(1, Math.round((detour / speed) * 60));
    return `${minutes} min`;
  }

  currentDuration(): string {
    return this.durationForMode(this.travelMode());
  }

  distanceText(): string {
    const p = this.pharmacy();
    const fix = this.state.locationFix();
    let km = 1.4;
    if (p && fix) {
      km = this.calcDistanceKm(fix.latitude, fix.longitude, p.lat, p.lon);
    }
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  altDistanceText(): string {
    const p = this.pharmacy();
    const fix = this.state.locationFix();
    let km = 1.7;
    if (p && fix) {
      km = this.calcDistanceKm(fix.latitude, fix.longitude, p.lat, p.lon) + 0.3;
    }
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  etaText(): string {
    const dStr = this.currentDuration();
    const min = parseInt(dStr, 10) || 15;
    const arrivalDate = new Date(Date.now() + min * 60000);
    const hh = String(arrivalDate.getHours()).padStart(2, "0");
    const mm = String(arrivalDate.getMinutes()).padStart(2, "0");
    return this.english() ? `Estimated arrival around ${hh}:${mm}` : `Arrivée estimée vers ${hh}:${mm}`;
  }

  private calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  async shareRoute(): Promise<void> {
    const p = this.pharmacy();
    if (!p) return;
    const shareText = `Locapharm: Itinéraire vers ${p.name} (${p.city || p.neighbourhood || ""})`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: shareText, url: `https://pauldjeuda.github.io/locapharm/p/${p.id}` });
      } catch {
        // user cancelled share
      }
    }
  }

  async openMapsApp(): Promise<void> {
    const pharmacy = this.pharmacy();
    if (!pharmacy) return;
    this.launchError.set("");
    const label = encodeURIComponent(pharmacy.name);
    const url = `geo:${pharmacy.lat},${pharmacy.lon}?q=${pharmacy.lat},${pharmacy.lon}(${label})`;
    try {
      await AppLauncher.openUrl({ url });
    } catch {
      this.launchError.set(
        this.english()
          ? "No compatible maps app could be opened. Use the source link on the pharmacy details page."
          : "Aucune application de cartes compatible n’a pu être ouverte. Utilisez le lien source de la fiche pharmacie.",
      );
    }
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-navigation-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain lp-nav-live-screen">
      <!-- Maneuver Banner (Top) -->
      <header class="lp-maneuver-banner" [class.lp-maneuver-banner--reroute]="navState() === 'rerouting'" [class.lp-maneuver-banner--weak]="navState() === 'weak_gps'">
        <div class="lp-maneuver-left">
          <span class="lp-maneuver-icon" aria-hidden="true">
            {{ navState() === 'rerouting' ? '↻' : navState() === 'weak_gps' ? '🛰️' : '↱' }}
          </span>
          <div class="lp-maneuver-text">
            @if (navState() === 'rerouting') {
              <p class="lp-maneuver-dist">{{ english() ? "Rerouting…" : "Recalcul…" }}</p>
              <p class="lp-maneuver-sub">{{ english() ? "You left the planned route" : "Vous avez quitté l'itinéraire" }}</p>
            } @else if (navState() === 'weak_gps') {
              <p class="lp-maneuver-dist">{{ english() ? "Weak GPS" : "Signal GPS faible" }}</p>
              <p class="lp-maneuver-sub">{{ english() ? "Searching for satellites…" : "Recherche de satellites…" }}</p>
            } @else {
              <p class="lp-maneuver-dist">120 m</p>
              <p class="lp-maneuver-sub">{{ english() ? "Turn right onto Bd de la Liberté" : "Tournez à droite sur Bd de la Liberté" }}</p>
            }
          </div>
        </div>
        <div class="lp-maneuver-next">
          <span>{{ english() ? "Then straight 400 m" : "Puis tout droit 400 m" }}</span>
        </div>
      </header>

      <!-- 3D Perspective Road Map -->
      <div class="lp-nav-perspective-container">
        <div class="lp-nav-tilted-ground">
          <svg class="lp-nav-svg-ground" viewBox="0 0 400 700" fill="none" preserveAspectRatio="none">
            <rect x="15" y="40" width="105" height="130" rx="6" fill="#CED3DA" />
            <rect x="135" y="20" width="130" height="90" rx="8" fill="#D7DCE2" />
            <rect x="280" y="50" width="100" height="140" rx="6" fill="#CED3DA" />
            <rect x="20" y="210" width="95" height="170" rx="6" fill="#CBD0D8" />
            <rect x="290" y="225" width="95" height="155" rx="6" fill="#C6CCD4" />
            <path d="M0 190 L400 190" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" />
            <path d="M0 400 L400 400" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />
            <path d="M 200 700 L 200 490" stroke="#9EA4AD" stroke-width="22" stroke-linecap="round" />
            <path d="M 200 700 L 200 490" stroke="#D3D8E0" stroke-width="14" stroke-linecap="round" />
            <path d="M 200 490 L 200 190 Q 200 135 245 135 L 400 135" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 195 440 L 200 432 L 205 440 M 195 340 L 200 332 L 205 340 M 195 240 L 200 232 L 205 240" stroke="#73796E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 200 490 L 200 190 Q 200 135 245 135 L 400 135" stroke="#181C20" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
            <path class="lp-dash-animated" d="M 200 490 L 200 190 Q 200 135 245 135 L 400 135" stroke="#C7EF00" stroke-width="8" stroke-dasharray="12 10" stroke-linecap="round" stroke-linejoin="round" />
            <g transform="translate(355, 115)">
              <circle cx="16" cy="16" r="15" fill="#3F5A36" />
              <path d="M16 9 V23 M9 16 H23" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
            </g>
          </svg>
          <div class="lp-nav-user-puck">
            <div class="lp-nav-beam-cone"></div>
            <div class="lp-nav-radar-halo animate-ping"></div>
            <div class="lp-nav-core-puck">
              <span class="lp-nav-heading-arrow">▲</span>
            </div>
          </div>
        </div>

        <!-- Simulation state switcher pills (dev / demo) -->
        <div class="lp-nav-state-switcher">
          <button class="lp-chip" type="button" [attr.aria-pressed]="navState() === 'normal'" (click)="navState.set('normal')">
            {{ english() ? "Normal" : "Normal" }}
          </button>
          <button class="lp-chip" type="button" [attr.aria-pressed]="navState() === 'rerouting'" (click)="navState.set('rerouting')">
            {{ english() ? "Reroute" : "Recalcul" }}
          </button>
          <button class="lp-chip" type="button" [attr.aria-pressed]="navState() === 'weak_gps'" (click)="navState.set('weak_gps')">
            GPS
          </button>
        </div>
      </div>

      <!-- Bottom Floating Dashboard Panel -->
      <div class="lp-nav-bottom-panel">
        <div class="lp-nav-metrics-bar">
          <div class="lp-nav-speed-badge">
            <span class="lp-nav-speed-val">{{ currentSpeed() }}</span>
            <span class="lp-nav-speed-unit">km/h</span>
          </div>
          <div class="lp-nav-time-group">
            <div class="lp-row">
              <strong class="lp-nav-big-eta">{{ remainingDuration() }}</strong>
              <span class="lp-muted">· {{ remainingDistance() }}</span>
            </div>
            <span class="lp-copy--small lp-muted">{{ etaText() }}</span>
          </div>
          <button class="lp-icon-button" type="button" (click)="toggleMute()" [attr.aria-label]="isMuted() ? 'Activer le son' : 'Couper le son'">
            {{ isMuted() ? '🔇' : '🔊' }}
          </button>
        </div>

        @if (pharmacy()) {
          <div class="lp-nav-dest-card">
            <div class="lp-row">
              <span class="lp-pharmacy-pin" aria-hidden="true">✚</span>
              <div class="lp-nav-dest-copy">
                <strong>{{ pharmacy()!.name }}</strong>
                <span class="lp-copy--small lp-muted">{{ pharmacy()!.city || pharmacy()!.neighbourhood || "Douala" }}</span>
              </div>
            </div>
            @if (pharmacy()!.phones?.length) {
              <a class="lp-icon-button" [href]="'tel:' + pharmacy()!.phones[0]" [attr.aria-label]="english() ? 'Call' : 'Appeler'">☎</a>
            }
          </div>
        }

        <div class="lp-row-between" style="gap: 10px; margin-top: 4px;">
          <button class="lp-button lp-button--sage" type="button" style="flex: 1;" (click)="simulateArrival()">
            {{ english() ? "Arrive" : "Arriver" }} ↗
          </button>
          <button class="lp-button lp-button--dark" type="button" (click)="exitNavigation()">
            {{ english() ? "End Trip" : "Terminer" }}
          </button>
        </div>
      </div>
    </main>
  `,
  styles: [productPageStyles],
})
export class NavigationPage implements OnInit {
  readonly state = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(PharmacyDataService);

  readonly pharmacy = signal<PharmacyRecord | null>(null);
  readonly navState = signal<"normal" | "rerouting" | "weak_gps">("normal");
  readonly isMuted = signal(false);
  readonly currentSpeed = signal(18);
  readonly remainingDuration = signal("4 min");
  readonly remainingDistance = signal("850 m");

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("id") ?? "";
    this.pharmacy.set(await this.data.pharmacyById(id).catch(() => null));
  }

  toggleMute(): void {
    this.isMuted.update((m: boolean) => !m);
  }

  etaText(): string {
    const arrivalDate = new Date(Date.now() + 4 * 60000);
    const hh = String(arrivalDate.getHours()).padStart(2, "0");
    const mm = String(arrivalDate.getMinutes()).padStart(2, "0");
    return this.english() ? `Arrival around ${hh}:${mm}` : `Arrivée vers ${hh}:${mm}`;
  }

  simulateArrival(): void {
    const p = this.pharmacy();
    if (p) {
      void this.router.navigate(["/arrival", p.id]);
    } else {
      void this.router.navigate(["/tabs/map"]);
    }
  }

  exitNavigation(): void {
    void this.router.navigate(["/tabs/map"]);
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-arrival-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain lp-arrival-screen-full">
      <!-- Top Precision Bar -->
      <div class="lp-row-between lp-arrival-topbar">
        <div class="lp-pill">
          <span class="lp-dot animate-pulse"></span>
          <span>{{ english() ? "High Precision GPS · Douala" : "GPS Haute Précision · Douala" }}</span>
        </div>
        <a class="lp-icon-button" routerLink="/tabs/map" [attr.aria-label]="english() ? 'Close' : 'Fermer'">×</a>
      </div>

      <!-- 3D Destination Map Viewport Area -->
      <div class="lp-arrival-viewport">
        <div class="lp-arrival-ripple-cluster">
          <span class="lp-arrival-ping-1"></span>
          <span class="lp-arrival-ping-2"></span>
          <div class="lp-arrival-glow-halo"></div>
          <div class="lp-arrival-marker-anchor">
            <div class="lp-pill lp-arrival-dest-pill">
              <span class="lp-dot"></span>
              <span>{{ english() ? "DESTINATION REACHED" : "DESTINATION ATTEINTE" }}</span>
            </div>
            <div class="lp-arrival-building-marker">
              <span class="lp-arrival-cross">✚</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Sheet -->
      <section class="lp-arrival-sheet">
        <div class="lp-sheet-handle" aria-hidden="true"></div>

        <div class="lp-arrival-header-block">
          <div class="lp-arrival-big-check">
            <span aria-hidden="true">✓</span>
          </div>
          <h1 class="lp-heading lp-heading--large">{{ english() ? "You have arrived" : "Vous êtes arrivé" }}</h1>
          <div class="lp-arrival-pharmacy-info">
            <h2 class="lp-section-title">{{ pharmacy()?.name || (english() ? "Pharmacy" : "Pharmacie") }}</h2>
            <p class="lp-copy lp-copy--small lp-muted">
              {{ pharmacy()?.city || pharmacy()?.neighbourhood || (english() ? "Location verified" : "Emplacement vérifié") }}
            </p>
          </div>
        </div>

        <div class="lp-card lp-card--soft lp-arrival-notice">
          <strong>🛡️ {{ english() ? "Safety verification" : "Vérification de sécurité" }}</strong>
          <p class="lp-copy lp-copy--small">
            {{ english() ? "Check that the pharmacy is open and the night duty window is operational before parking or leaving your ride." : "Vérifiez que la pharmacie est bien ouverte et que le guichet de garde est opérationnel." }}
          </p>
        </div>

        <div class="lp-stack" style="gap: 10px;">
          @if (pharmacy()?.phones?.length) {
            <a class="lp-button lp-button--full lp-row-between" [href]="'tel:' + pharmacy()!.phones[0]">
              <span class="lp-row"><span>☎</span><strong>{{ english() ? "Call the pharmacy" : "Appeler la pharmacie" }}</strong></span>
              <span>↗</span>
            </a>
          }
          <button class="lp-button lp-button--full lp-button--light" type="button" (click)="finishCourse()">
            {{ english() ? "Complete Trip" : "Terminer la course" }}
          </button>
        </div>

        <!-- Community Verification Block -->
        <div class="lp-card lp-arrival-community-card">
          <div class="lp-row" style="gap: 6px;">
            <span aria-hidden="true">👥</span>
            <span class="lp-eyebrow">{{ english() ? "COMMUNITY MUTUAL AID" : "ENTRAIDE COMMUNAUTAIRE" }}</span>
          </div>
          <p class="lp-section-title" style="margin-top: 4px;">
            {{ english() ? "Was this pharmacy actually on duty?" : "Cette pharmacie était-elle bien de garde ?" }}
          </p>

          <div class="lp-arrival-vote-buttons">
            <button class="lp-chip lp-chip--vote-yes" type="button" [class.voted]="voted() === 'yes'" [disabled]="voteSending()" (click)="submitVote(true)">
              <span>👍 {{ english() ? "Yes, on duty" : "Oui, de garde" }}</span>
            </button>
            <button class="lp-chip lp-chip--vote-no" type="button" [class.voted]="voted() === 'no'" [disabled]="voteSending()" (click)="submitVote(false)">
              <span>👎 {{ english() ? "No, closed" : "Non, fermée" }}</span>
            </button>
          </div>

          @if (voteAcknowledged()) {
            <div class="lp-arrival-vote-thanks" role="status">
              <span>🎉</span>
              <strong>{{ english() ? "Thank you! Information transmitted to the community." : "Merci ! Information transmise à la communauté." }}</strong>
            </div>
          }
        </div>

        <div class="lp-arrival-footer-link">
          <a class="lp-text-link" [routerLink]="pharmacy() ? ['/report', pharmacy()!.id] : '/tabs/map'">
            ⚠️ {{ english() ? "Report an access problem" : "Signaler un problème d'accès" }}
          </a>
        </div>
      </section>
    </main>
  `,
  styles: [productPageStyles],
})
export class ArrivalPage implements OnInit {
  readonly state = inject(AppStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(PharmacyDataService);
  private readonly http = inject(HttpClient);
  private readonly remote = inject(RemoteConfigService);
  private readonly installationId = inject(InstallationIdService);

  readonly pharmacy = signal<PharmacyRecord | null>(null);
  readonly voted = signal<"yes" | "no" | null>(null);
  readonly voteSending = signal(false);
  readonly voteAcknowledged = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("id") ?? "";
    this.pharmacy.set(await this.data.pharmacyById(id).catch(() => null));
  }

  async submitVote(isYes: boolean): Promise<void> {
    const pharmacy = this.pharmacy();
    if (!pharmacy || this.voteSending()) return;
    this.voted.set(isYes ? "yes" : "no");
    this.voteSending.set(true);
    try {
      const config = await this.remote.load();
      const baseUrl = this.remote.workerBaseUrl();
      if (config?.features?.community_votes && baseUrl) {
        const installId = await this.installationId.get();
        const dutyWindow = new Date().toISOString().slice(0, 10);
        await firstValueFrom(
          this.http.post(`${baseUrl}/votes`, {
            installation_id: installId,
            pharmacy_id: pharmacy.id,
            duty_window_id: dutyWindow,
            vote: isYes ? "yes" : "no",
            honeypot: "",
          }),
        );
      }
      this.voteAcknowledged.set(true);
    } catch {
      this.voteAcknowledged.set(true);
    } finally {
      this.voteSending.set(false);
    }
  }

  finishCourse(): void {
    void this.router.navigate(["/tabs/map"]);
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}

@Component({
  selector: "lp-system-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-report-header">
        <a
          class="lp-icon-button"
          routerLink="/tabs/settings"
          aria-label="Retour"
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">LOCAPHARM</p>
          <h1 class="lp-heading">
            {{ english() ? "System status" : "État du système" }}
          </h1>
        </div>
      </header>
      <section class="lp-card lp-status-card" aria-live="polite">
        <div class="lp-row-between">
          <strong>{{ english() ? "Network" : "Réseau" }}</strong
          ><span class="lp-badge" [class.lp-badge--duty]="connected()">{{
            connected()
              ? english()
                ? "CONNECTED"
                : "CONNECTÉ"
              : english()
                ? "OFFLINE"
                : "HORS LIGNE"
          }}</span>
        </div>
        <p class="lp-copy lp-copy--small">{{ networkType() }}</p>
      </section>
      <section class="lp-card lp-status-card">
        <div class="lp-row-between">
          <strong>{{
            english() ? "Pharmacy data" : "Données pharmacies"
          }}</strong
          ><span
            class="lp-badge"
            [class.lp-badge--duty]="data.syncStatus().state === 'ready'"
            >{{ packStatusLabel() }}</span
          >
        </div>
        <p class="lp-copy lp-copy--small">{{ packDetails() }}</p>
        @if (data.syncStatus().state !== "ready") {
          <a class="lp-text-link" routerLink="/tabs/settings"
            >{{
              english() ? "Manage offline pack" : "Gérer le pack hors ligne"
            }}
            ↗</a
          >
        }
      </section>
      <section class="lp-card lp-status-card">
        <div class="lp-row-between">
          <strong>{{
            english() ? "Duty schedules" : "Calendriers de garde"
          }}</strong
          ><span class="lp-badge">{{
            english() ? "UNAVAILABLE" : "INDISPONIBLES"
          }}</span>
        </div>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "No current schedule source has been authorized."
              : "Aucune source de calendrier en cours n’a été autorisée."
          }}
        </p>
      </section>
      <section class="lp-card lp-status-card">
        <div class="lp-row-between">
          <strong>{{
            english() ? "Map and routing" : "Carte et itinéraire"
          }}</strong
          ><span class="lp-badge">{{
            english()
              ? "ONLINE MAP · NO ROUTING"
              : "CARTE EN LIGNE · SANS ITINÉRAIRE"
          }}</span>
        </div>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "OpenFreeMap tiles load online. Offline map tiles and in-app route calculation are unavailable. A pharmacy destination can be opened in another maps app."
              : "Les tuiles OpenFreeMap sont chargées en ligne. Les tuiles hors ligne et le calcul d’itinéraire intégré sont indisponibles. Une destination pharmacie peut être ouverte dans une autre application de cartes."
          }}
        </p>
      </section>
      <a class="lp-text-link lp-status-back" routerLink="/tabs/settings">{{
        english() ? "Back to settings" : "Retour aux réglages"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-report-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-status-card {
        margin-bottom: 12px;
        padding: 16px;
      }
      .lp-status-card strong {
        font-size: 13px;
      }
      .lp-status-card p {
        margin: 10px 0 0;
      }
      .lp-status-back {
        display: inline-block;
        padding: 16px 0;
        text-decoration: none;
      }
    `,
  ],
})
export class SystemPage implements OnDestroy {
  readonly state = inject(AppStateService);
  readonly data = inject(PharmacyDataService);
  readonly connected = signal(false);
  readonly networkType = signal("—");
  readonly packLoading = signal(true);
  private handle?: PluginListenerHandle;
  private destroyed = false;

  constructor() {
    void this.refreshNetwork();
    void this.data
      .loadInstalledPharmacies()
      .catch(() => [])
      .finally(() => this.packLoading.set(false));
    void Network.addListener(
      "networkStatusChange",
      (status: { connected: boolean; connectionType: string }) => {
        this.connected.set(status.connected);
        this.networkType.set(status.connectionType);
      },
    )
      .then((handle: { remove: () => Promise<void> }) => {
        if (this.destroyed) void handle.remove();
        else this.handle = handle;
      })
      .catch(() => undefined);
  }

  english(): boolean {
    return this.state.language() === "en";
  }

  packStatusLabel(): string {
    if (this.packLoading()) return this.english() ? "CHECKING" : "VÉRIFICATION";
    const status = this.data.syncStatus().state;
    if (status === "ready") return this.english() ? "INSTALLED" : "INSTALLÉES";
    if (status === "error") return this.english() ? "ERROR" : "ERREUR";
    return this.english() ? "NOT INSTALLED" : "NON INSTALLÉES";
  }

  packDetails(): string {
    if (this.packLoading()) {
      return this.english()
        ? "Checking local storage for a regional dataset…"
        : "Recherche d’une base régionale dans le stockage local…";
    }
    const status = this.data.syncStatus();
    if (status.state === "ready") {
      const count = status.pharmacyCount ?? this.data.pharmacies().length;
      const generatedAt = this.data.packGeneratedAt()?.slice(0, 10);
      return this.english()
        ? `${count} mapped records are stored on this device.${generatedAt ? ` Data snapshot: ${generatedAt}.` : ""}`
        : `${count} fiches cartographiées sont stockées sur cet appareil.${generatedAt ? ` Données extraites le : ${generatedAt}.` : ""}`;
    }
    if (status.state === "error") {
      return this.english()
        ? `The last pack operation failed: ${status.message}`
        : `La dernière opération du pack a échoué : ${status.message}`;
    }
    return this.english()
      ? "No regional dataset is installed on this device."
      : "Aucune base régionale n’est installée sur cet appareil.";
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.handle?.remove();
  }

  private async refreshNetwork(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.connected.set(status.connected);
      this.networkType.set(status.connectionType);
    } catch {
      this.connected.set(false);
      this.networkType.set(this.english() ? "Unavailable" : "Indisponible");
    }
  }
}

@Component({
  selector: "lp-privacy-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-report-header">
        <a
          class="lp-icon-button"
          routerLink="/tabs/settings"
          aria-label="Retour"
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">LOCAPHARM</p>
          <h1 class="lp-heading">
            {{ english() ? "Privacy" : "Confidentialité" }}
          </h1>
        </div>
      </header>

      <section class="lp-card lp-privacy-card">
        <h2 class="lp-section-title">
          {{ english() ? "Stored on this device" : "Stocké sur cet appareil" }}
        </h2>
        <p class="lp-copy">
          {{
            english()
              ? "Nearby search, distance sorting, filters, favorites, and the downloaded pharmacy pack are processed or stored locally. Locapharm has no account and does not send your GPS fix to its server for nearby search."
              : "La recherche à proximité, le tri par distance, les filtres, les favoris et le pack de pharmacies téléchargé sont traités ou stockés localement. Locapharm ne demande pas de compte et n’envoie pas votre position GPS à son serveur pour la recherche à proximité."
          }}
        </p>
      </section>

      <section class="lp-card lp-privacy-card">
        <h2 class="lp-section-title">
          {{ english() ? "Online map" : "Carte en ligne" }}
        </h2>
        <p class="lp-copy">
          {{
            english()
              ? "When the map is displayed, OpenFreeMap receives requests for the visible map tiles, which disclose the approximate area being viewed. GPS stays on the device unless you explicitly open a pharmacy destination in another maps app."
              : "Lorsque la carte est affichée, OpenFreeMap reçoit les demandes de tuiles visibles, qui révèlent la zone approximative consultée. Le GPS reste sur l’appareil, sauf si vous ouvrez explicitement la destination d’une pharmacie dans une autre application de cartes."
          }}
        </p>
        <a
          class="lp-text-link"
          href="https://openfreemap.org/"
          target="_blank"
          rel="noopener noreferrer"
          >OpenFreeMap ↗</a
        >
      </section>

      <section class="lp-card lp-privacy-card">
        <h2 class="lp-section-title">
          {{ english() ? "Calls and directions" : "Appels et itinéraires" }}
        </h2>
        <p class="lp-copy">
          {{
            english()
              ? "Tapping a phone number opens the device dialer. Tapping directions passes the pharmacy destination to a compatible maps app. Locapharm does not yet provide in-app routing or live guidance."
              : "Toucher un numéro ouvre le composeur du téléphone. L’action d’itinéraire transmet la destination de la pharmacie à une application de cartes compatible. Locapharm ne fournit pas encore de calcul d’itinéraire intégré ni de guidage en direct."
          }}
        </p>
      </section>

      <section class="lp-card lp-privacy-card">
        <h2 class="lp-section-title">
          {{
            english()
              ? "Reports and analytics"
              : "Signalements et mesure d’audience"
          }}
        </h2>
        <p class="lp-copy">
          {{
            english()
              ? "Pharmacy reports are unavailable until the service is enabled. A submitted correction does not include your GPS location; optional details are encrypted and kept for at most 30 days. Bug feedback appears only when its service is enabled; submitted messages are encrypted and kept for at most 30 days. Basic app, platform, language, and connection diagnostics are sent only if you opt in. GPS and contacts are not included. This app has no behavioral analytics or advertising. A reviewed public privacy notice is still required before release."
              : "Les signalements de pharmacies sont indisponibles tant que le service n’est pas activé. Une correction envoyée ne contient pas votre position GPS ; ses précisions facultatives sont chiffrées et conservées au maximum 30 jours. Le formulaire de bug n’apparaît que si son service est activé ; ses messages sont chiffrés et conservés au maximum 30 jours. Les diagnostics simples (version, plateforme, langue et réseau) ne sont transmis qu’avec votre accord. Ni GPS ni contacts ne sont inclus. L’application ne comporte ni mesure d’audience comportementale ni publicité. Une notice publique doit être relue avant publication."
          }}
        </p>
      </section>

      <a class="lp-text-link lp-status-back" routerLink="/tabs/settings">{{
        english() ? "Back to settings" : "Retour aux réglages"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-report-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-privacy-card {
        display: grid;
        gap: 12px;
        margin-bottom: 12px;
      }
      .lp-privacy-card .lp-text-link {
        justify-self: start;
      }
      .lp-status-back {
        display: inline-block;
        padding: 16px 0;
        text-decoration: none;
      }
    `,
  ],
})
export class PrivacyPage {
  readonly state = inject(AppStateService);

  english(): boolean {
    return this.state.language() === "en";
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
