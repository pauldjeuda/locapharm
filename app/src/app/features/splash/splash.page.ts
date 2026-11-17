import { Component } from "@angular/core";

@Component({
  selector: "lp-splash-page",
  standalone: true,
  template: `
    <main class="splash" aria-labelledby="brand-title">
      <div class="brand-lockup">
        <img src="assets/logo-mark.svg" alt="" width="72" height="72" />
        <h1 id="brand-title">LOCAPHARM</h1>
        <p class="brand-caption">
          <span aria-hidden="true"></span> PHARMACIES DU CAMEROUN
          <span aria-hidden="true"></span>
        </p>
      </div>
      <p class="splash-note">
        Une base de pharmacies utile, pensée pour le Cameroun.
      </p>
    </main>
  `,
})
export class SplashPage {}
