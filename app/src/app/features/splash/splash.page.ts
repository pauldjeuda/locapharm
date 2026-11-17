import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AppStateService } from "../../core/state/app-state.service";
import { productPageStyles } from "../product/product.styles";

@Component({
  selector: "lp-splash-page",
  standalone: true,
  template: `
    <main class="lp-screen--immersive lp-splash" aria-labelledby="brand-title">
      <div class="lp-radar" aria-hidden="true"><span></span><span></span></div>
      <div class="lp-brand">
        <div class="lp-brand-mark">
          <img src="assets/logo-mark.svg" alt="" width="52" height="52" />
        </div>
        <h1 id="brand-title" class="lp-brand-name">LOCAPHARM</h1>
        <p class="lp-caption">
          <span aria-hidden="true">•</span> PHARMACIES DU CAMEROUN
          <span aria-hidden="true">•</span>
        </p>
      </div>
      <div class="lp-splash-status">
        <span class="lp-dot"></span
        >{{ english() ? "NO DATA PACK INSTALLED" : "AUCUN PACK INSTALLÉ" }}
      </div>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-splash {
        position: relative;
        grid-template-rows: 1fr auto 1fr;
        justify-items: center;
        text-align: center;
      }
      .lp-radar {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 210px;
        height: 210px;
        transform: translate(-50%, -58%);
      }
      .lp-radar span {
        position: absolute;
        inset: 0;
        border: 1px solid rgb(200 240 0 / 22%);
        border-radius: 50%;
        animation: lp-radar-pulse 2.4s ease-out infinite;
      }
      .lp-radar span:nth-child(2) {
        animation-delay: 1.2s;
      }
      .lp-brand {
        position: relative;
        align-self: center;
        gap: 18px;
      }
      .lp-brand-mark {
        width: 88px;
        height: 88px;
        border-radius: 30px;
      }
      .lp-splash-status {
        align-self: end;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        padding: 11px 14px;
        border: 1px solid rgb(255 255 255 / 16%);
        border-radius: 999px;
        color: #e8ffd9;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.13em;
      }
      @keyframes lp-radar-pulse {
        0% {
          opacity: 0.8;
          transform: scale(0.72);
        }
        100% {
          opacity: 0;
          transform: scale(1.25);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .lp-radar span {
          animation: none;
        }
      }
    `,
  ],
})
export class SplashPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(AppStateService);

  english(): boolean {
    return this.state.language() === "en";
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.has("preview")) return;
    void this.continueAfterSplash();
  }

  private async continueAfterSplash(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const destination = this.state.onboardingComplete()
      ? "/tabs/map"
      : "/onboarding";
    await this.router.navigateByUrl(destination, { replaceUrl: true });
  }
}
