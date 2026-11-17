import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { AppStateService } from "../../core/state/app-state.service";
import { productPageStyles } from "./product.styles";

const steps = [
  {
    label: "CARTOGRAPHIE RAPIDE",
    title: "Trouvez une pharmacie près de vous",
    copy: "Repérez les officines et consultez les informations réellement disponibles pour votre zone.",
    icon: "⌖",
  },
  {
    label: "DISPONIBILITÉ VÉRIFIÉE",
    title: "Consultez les gardes avec prudence",
    copy: "Une garde n’est affichée que si une source et une période de validité sont renseignées.",
    icon: "✚",
  },
  {
    label: "REPÈRES HORS LIGNE",
    title: "Gardez vos repères sur votre téléphone",
    copy: "Les packs de données installés restent consultables sans réseau. Leur couverture sera toujours indiquée.",
    icon: "⬡",
  },
];

@Component({
  selector: "lp-onboarding-page",
  standalone: true,
  template: `
    <main class="lp-screen--immersive">
      <section class="lp-onboarding-card" aria-labelledby="onboarding-title">
        <header class="lp-row-between">
          <span class="lp-pill"
            ><span class="lp-dot"></span> LOCAPHARM · CM</span
          >
          <button class="lp-text-button" type="button" (click)="skip()">
            Passer
          </button>
        </header>
        <div class="lp-onboarding-content" aria-live="polite">
          <div class="lp-illustration" aria-hidden="true">
            <svg viewBox="0 0 250 220" fill="none">
              <path d="M35 143 126 91l89 50-91 55-89-53Z" fill="#E9EAEB" />
              <path d="m57 142 69-40 66 38-69 41-66-39Z" fill="#D7DAE0" />
              <path d="m81 128 44-26 44 25-45 27-43-26Z" fill="#fff" />
              <path
                d="m101 87 25-15 25 15v39l-25 15-25-15V87Z"
                fill="#5B7A4E"
              />
              <path
                d="M121 92h10v10h10v10h-10v10h-10v-10h-10v-10h10V92Z"
                fill="#C8F000"
              />
              <path d="m42 125 20-12 20 12v29l-20 12-20-12v-29Z" fill="#fff" />
              <path
                d="m168 139 18-11 18 11v25l-18 11-18-11v-25Z"
                fill="#3F5A36"
              />
              <circle cx="187" cy="75" r="18" fill="#C8F000" />
              <path
                d="M187 65c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9Zm0 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                fill="#0F1110"
              />
            </svg>
          </div>
          <div class="lp-step-copy">
            <p class="lp-eyebrow">{{ current().label }}</p>
            <h1 id="onboarding-title" class="lp-heading lp-heading--large">
              {{ current().title }}
            </h1>
            <p class="lp-copy">{{ current().copy }}</p>
          </div>
          <div class="lp-progress" aria-label="Étape {{ step() + 1 }} sur 3">
            @for (item of steps; track $index) {
              <span [class.active]="$index === step()"></span>
            }
          </div>
        </div>
        <footer class="lp-onboarding-actions">
          <button
            class="lp-icon-button"
            type="button"
            aria-label="Étape précédente"
            [disabled]="step() === 0"
            (click)="previous()"
          >
            ←
          </button>
          <button
            class="lp-button lp-button--full"
            type="button"
            (click)="next()"
          >
            {{ step() === 2 ? "Commencer" : "Suivant" }} <span>↗</span>
          </button>
        </footer>
      </section>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-text-button {
        border: 0;
        padding: 8px;
        color: #43483f;
        background: transparent;
        font:
          600 12px Inter,
          sans-serif;
      }
      .lp-step-copy {
        display: grid;
        gap: 12px;
      }
    `,
  ],
})
export class OnboardingPage {
  readonly steps = steps;
  readonly step = signal(0);
  readonly current = signal(steps[0]);
  private readonly router = inject(Router);
  private readonly appState = inject(AppStateService);

  previous(): void {
    this.setStep(Math.max(0, this.step() - 1));
  }

  async next(): Promise<void> {
    if (this.step() < steps.length - 1) {
      this.setStep(this.step() + 1);
      return;
    }
    await this.finish();
  }

  async skip(): Promise<void> {
    await this.finish();
  }

  private async finish(): Promise<void> {
    await this.appState.completeOnboarding();
    await this.router.navigateByUrl("/permission");
  }

  private setStep(step: number): void {
    this.step.set(step);
    this.current.set(steps[step]);
  }
}
