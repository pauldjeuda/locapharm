import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Geolocation } from "@capacitor/geolocation";
import { AppStateService } from "../../core/state/app-state.service";
import { productPageStyles } from "./product.styles";

@Component({
  selector: "lp-permission-page",
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="lp-screen--immersive lp-permission">
      <a
        class="lp-permission-logo"
        routerLink="/onboarding"
        aria-label="Retour"
      >
        <img src="assets/logo-mark.svg" alt="" />
      </a>
      <section class="lp-permission-sheet" aria-labelledby="permission-title">
        <p class="lp-eyebrow">
          {{ english() ? "YOUR CHOICE" : "VOTRE CHOIX" }}
        </p>
        <h1 id="permission-title" class="lp-heading lp-heading--large">
          {{
            english()
              ? "Around you, right away"
              : "Autour de vous, tout de suite"
          }}
        </h1>
        <p class="lp-copy">
          {{
            english()
              ? "Your location stays on this phone for nearby search. It is sent only if you request a route."
              : "Votre position reste sur ce téléphone pour la recherche à proximité. Elle n’est transmise que si vous demandez un itinéraire."
          }}
        </p>
        <div class="lp-row lp-permission-badges">
          <span class="lp-pill"
            ><span class="lp-dot"></span>
            {{ english() ? "ON DEVICE" : "SUR L’APPAREIL" }}</span
          >
          <span class="lp-pill">{{
            english() ? "OPTIONAL" : "FACULTATIF"
          }}</span>
        </div>

        @if (error()) {
          <p class="lp-inline-error" role="alert">{{ error() }}</p>
        }
        <button
          class="lp-button lp-button--full"
          type="button"
          [disabled]="busy()"
          (click)="requestLocation()"
        >
          {{
            busy()
              ? english()
                ? "Checking…"
                : "Vérification…"
              : english()
                ? "Allow location"
                : "Autoriser la localisation"
          }}
          <span>↗</span>
        </button>

        <hr class="lp-separator" />
        <label class="lp-label" for="manual-city">
          {{
            english() ? "Choose a city instead" : "Choisir une ville à la place"
          }}
          <input
            id="manual-city"
            class="lp-input"
            type="text"
            autocomplete="address-level2"
            [placeholder]="
              english() ? 'Enter a city name' : 'Saisir le nom d’une ville'
            "
            [(ngModel)]="manualCity"
            (keyup.enter)="useCity()"
          />
        </label>
        <button
          class="lp-button lp-button--sage lp-button--full"
          type="button"
          [disabled]="!manualCity.trim()"
          (click)="useCity()"
        >
          {{
            english() ? "Continue with this city" : "Continuer avec cette ville"
          }}
        </button>
        <button
          class="lp-skip"
          type="button"
          (click)="continueWithoutLocation()"
        >
          {{
            english()
              ? "Continue without location"
              : "Continuer sans localisation"
          }}
        </button>
      </section>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-permission {
        display: grid;
        grid-template-rows: 1fr auto;
        gap: 20px;
        min-height: 100dvh;
      }
      .lp-permission-logo {
        align-self: center;
        justify-self: center;
        width: 56px;
        height: 56px;
      }
      .lp-permission-logo img {
        width: 100%;
        height: 100%;
      }
      .lp-permission-sheet {
        display: grid;
        gap: 16px;
        margin: 0 -20px -20px;
        padding: 30px 24px max(24px, env(safe-area-inset-bottom));
        border-radius: 32px 32px 0 0;
        color: #181c20;
        background: #fff;
      }
      .lp-permission-sheet .lp-eyebrow {
        color: #5b7a4e;
      }
      .lp-permission-sheet .lp-heading {
        font-size: 30px;
      }
      .lp-permission-badges {
        flex-wrap: wrap;
      }
      .lp-skip {
        justify-self: center;
        border: 0;
        padding: 8px;
        color: #5e656b;
        background: transparent;
        font:
          600 12px Inter,
          sans-serif;
      }
      .lp-inline-error {
        margin: 0;
        padding: 12px 14px;
        border-radius: 14px;
        color: #93000a;
        background: #ffdad6;
        font-size: 13px;
      }
      @media (max-width: 380px) {
        .lp-permission-sheet {
          margin-right: -16px;
          margin-left: -16px;
          padding-right: 18px;
          padding-left: 18px;
        }
      }
    `,
  ],
})
export class PermissionPage {
  manualCity = "";
  readonly busy = signal(false);
  readonly error = signal("");
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  english(): boolean {
    return this.state.language() === "en";
  }

  async requestLocation(): Promise<void> {
    this.busy.set(true);
    this.error.set("");
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== "granted") {
        this.error.set(
          this.english()
            ? "Location was not allowed. You can enter a city instead."
            : "La localisation n’a pas été autorisée. Vous pouvez saisir une ville à la place.",
        );
        return;
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000,
      });
      this.state.locationFix.set({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      await this.router.navigateByUrl("/tabs/map");
    } catch {
      this.error.set(
        this.english()
          ? "The device could not provide a location. Try choosing a city."
          : "L’appareil n’a pas pu fournir de position. Essayez de choisir une ville.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  async useCity(): Promise<void> {
    const city = this.manualCity.trim();
    if (!city) return;
    await this.state.setCity(city);
    this.state.locationFix.set(null);
    await this.router.navigateByUrl("/tabs/map");
  }

  async continueWithoutLocation(): Promise<void> {
    this.state.locationFix.set(null);
    await this.router.navigateByUrl("/tabs/map");
  }
}
