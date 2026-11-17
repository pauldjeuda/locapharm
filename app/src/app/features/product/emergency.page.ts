import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import {
  RemoteConfigService,
  type RemoteEmergencyDirectory,
} from "../../core/data/remote-config.service";
import { AppStateService } from "../../core/state/app-state.service";
import { productPageStyles } from "./product.styles";

@Component({
  selector: "lp-emergency-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain">
      <header class="lp-row lp-emergency-header">
        <a
          class="lp-icon-button"
          routerLink="/tabs/map"
          [attr.aria-label]="english() ? 'Back to map' : 'Retour à la carte'"
          >←</a
        >
        <div class="lp-title-group">
          <p class="lp-eyebrow">
            {{
              english()
                ? "CAMEROON · VERIFIED CONTACTS"
                : "CAMEROUN · CONTACTS SOURCÉS"
            }}
          </p>
          <h1 class="lp-heading">
            {{ english() ? "Emergency numbers" : "Numéros d’urgence" }}
          </h1>
        </div>
      </header>
      <div class="lp-card lp-emergency-warning">
        <strong>{{
          english()
            ? "If someone is in immediate danger, call now."
            : "Si une personne est en danger immédiat, appelez maintenant."
        }}</strong>
        <p class="lp-copy lp-copy--small">
          {{
            english()
              ? "Network coverage and number availability may vary. Use the contact appropriate to your location."
              : "La couverture réseau et la disponibilité des numéros peuvent varier. Choisissez le service correspondant à votre zone."
          }}
        </p>
      </div>

      @if (directory(); as data) {
        <section class="lp-emergency-list" aria-label="Contacts d’urgence">
          @for (contact of data.contacts; track contact.id) {
            <article class="lp-card lp-emergency-card">
              <h2 class="lp-section-title">
                {{ english() ? contact.name_en : contact.name_fr }}
              </h2>
              <p class="lp-copy lp-copy--small">
                {{ english() ? contact.scope_en : contact.scope_fr }}
              </p>
              <div class="lp-emergency-actions">
                <a
                  class="lp-button lp-button--sage"
                  [href]="'tel:' + contact.mobile"
                  >{{ english() ? "Call mobile" : "Appeler mobile" }} ·
                  {{ contact.mobile }}</a
                >
                <a
                  class="lp-button lp-button--light"
                  [href]="'tel:' + contact.landline"
                  >{{ english() ? "Call landline" : "Appeler fixe" }} ·
                  {{ contact.landline }}</a
                >
              </div>
            </article>
          }
        </section>
        <p class="lp-copy lp-copy--small lp-emergency-source">
          {{ english() ? "Source checked" : "Source vérifiée" }} ·
          {{ data.last_checked }} ·
          <a
            [href]="data.source.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ data.source.name }}</a
          >
        </p>
      } @else {
        <div class="lp-card lp-empty" role="status">
          <h2 class="lp-section-title">
            {{
              english()
                ? "Emergency contacts could not be loaded"
                : "Les contacts d’urgence n’ont pas pu être chargés"
            }}
          </h2>
          <p class="lp-copy">
            {{
              english()
                ? "Check the Government source directly."
                : "Consultez directement la source gouvernementale."
            }}
          </p>
          <a
            class="lp-text-link"
            href="https://minat.gov.cm/contacts-generaux/"
            target="_blank"
            rel="noopener noreferrer"
            >MINAT · contacts généraux ↗</a
          >
        </div>
      }

      <a class="lp-button lp-button--full" routerLink="/tabs/map">{{
        english() ? "Back to Locapharm" : "Retour à Locapharm"
      }}</a>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-emergency-header {
        align-items: flex-start;
        margin: 8px 0 22px;
      }
      .lp-emergency-warning {
        margin-bottom: 18px;
        border: 2px solid #c8f000;
      }
      .lp-emergency-warning strong {
        font:
          700 16px/1.3 Syne,
          sans-serif;
      }
      .lp-emergency-warning p {
        margin-top: 8px;
      }
      .lp-emergency-list {
        display: grid;
        gap: 12px;
      }
      .lp-emergency-card {
        display: grid;
        gap: 10px;
      }
      .lp-emergency-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .lp-emergency-actions .lp-button {
        min-height: 46px;
        padding: 0 10px;
        font-size: 12px;
      }
      .lp-emergency-source {
        margin: 18px 0;
        text-align: center;
      }
      .lp-emergency-source a {
        color: inherit;
      }
      .theme-dark .lp-emergency-warning {
        border-color: #caf208;
      }
      @media (max-width: 370px) {
        .lp-emergency-actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class EmergencyPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly state = inject(AppStateService);
  private readonly remoteConfig = inject(RemoteConfigService);
  readonly directory = signal<RemoteEmergencyDirectory | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<EmergencyDirectory>("assets/data/emergency.json"),
      );
      if (
        data.schema_version === 1 &&
        Array.isArray(data.contacts) &&
        data.contacts.every(
          (contact) =>
            /^\d{2,3}$/.test(contact.mobile) &&
            /^\d{2,3}$/.test(contact.landline),
        )
      ) {
        this.directory.set(data);
      }
    } catch {
      this.directory.set(null);
    }

    const remote = await this.remoteConfig.load();
    if (remote?.emergency) this.directory.set(remote.emergency);
  }

  english(): boolean {
    return this.state.language() === "en";
  }
}
