import { Component, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AppStateService } from "../core/state/app-state.service";
import { productPageStyles } from "../features/product/product.styles";

interface ScreenStateScenario {
  id: string;
  screenNum: number;
  screenName: string;
  folder: string;
  route: string;
  description: string;
  action?: () => void;
}

@Component({
  selector: "lp-dev-states-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="lp-screen lp-screen--plain lp-dev-states-screen">
      <header class="lp-row-between">
        <div class="lp-title-group">
          <p class="lp-eyebrow">LOCAPHARM · DEV LAB</p>
          <h1 class="lp-heading">Interrupteurs d'états (17 Écrans)</h1>
        </div>
        <a class="lp-icon-button" routerLink="/tabs/map" aria-label="Fermer">×</a>
      </header>

      <p class="lp-copy lp-copy--small">
        Laboratoire d'inspection des 17 écrans Stitch avec données et conditions figées pour recette visuelle et tests automatisés.
      </p>

      <div class="lp-stack" style="gap: 12px; margin-top: 14px;">
        @for (scenario of scenarios; track scenario.id) {
          <div class="lp-card lp-scenario-card">
            <div class="lp-row-between">
              <div class="lp-row" style="gap: 8px;">
                <span class="lp-badge lp-badge--duty">#{{ scenario.screenNum }}</span>
                <strong>{{ scenario.screenName }}</strong>
              </div>
              <a class="lp-button lp-button--sage" style="min-height: 38px; padding: 0 14px; font-size: 12px;" [routerLink]="scenario.route" (click)="scenario.action ? scenario.action() : null">
                Voir ↗
              </a>
            </div>
            <p class="lp-copy lp-copy--small lp-muted" style="margin-top: 4px;">
              {{ scenario.description }}
            </p>
            <span class="lp-eyebrow" style="font-size: 9px; margin-top: 4px;">{{ scenario.folder }}</span>
          </div>
        }
      </div>
    </main>
  `,
  styles: [
    productPageStyles,
    `
      .lp-dev-states-screen {
        max-width: 600px;
        margin: 0 auto;
        padding-bottom: 48px;
      }
      .lp-scenario-card {
        display: grid;
        gap: 4px;
        padding: 14px 18px;
        border-radius: 20px;
      }
    `,
  ],
})
export class DevStatesPage {
  private readonly router = inject(Router);
  readonly state = inject(AppStateService);

  readonly scenarios: ScreenStateScenario[] = [
    {
      id: "splash",
      screenNum: 1,
      screenName: "Splash Screen",
      folder: "splash_screen_locapharm",
      route: "/splash",
      description: "Anneaux radar pulsants, logo central, réseau national actif, villes couvertes.",
    },
    {
      id: "onboarding",
      screenNum: 2,
      screenName: "Onboarding (3 étapes)",
      folder: "onboarding_3_tapes",
      route: "/onboarding",
      description: "Carrousel 3 étapes interactif, illustration isométrique, progression.",
    },
    {
      id: "permission",
      screenNum: 3,
      screenName: "Permission Localisation",
      folder: "permission_localisation",
      route: "/permission",
      description: "Feuille sauge, autorisation GPS ou sélection manuelle de ville.",
    },
    {
      id: "map-main",
      screenNum: 4,
      screenName: "Carte des pharmacies",
      folder: "carte_des_pharmacies",
      route: "/tabs/map",
      description: "Carte vectorielle, feuille 'Les plus proches', contrôles 3D, boussole, SAMU.",
    },
    {
      id: "map-skeleton",
      screenNum: 5,
      screenName: "Feuille dépliée 85% & Squelettes",
      folder: "carte_liste_d_pli_e_85_skeleton",
      route: "/tabs/map",
      description: "Chargement squelettes animés, pastille N trouvées, pagination.",
    },
    {
      id: "map-dark",
      screenNum: 6,
      screenName: "Carte en mode sombre",
      folder: "carte_mode_sombre_dark_theme",
      route: "/tabs/map",
      description: "Palette sombre #161b19, néon lime sur tracé, GPS haute précision.",
      action: () => void this.state.setThemeMode("dark"),
    },
    {
      id: "filters",
      screenNum: 7,
      screenName: "Filtres Bottom Sheet",
      folder: "filtres_bottom_sheet",
      route: "/filters",
      description: "Curseur rayon 1-20km, statut de garde, tri par distance, avec téléphone.",
    },
    {
      id: "search",
      screenNum: 8,
      screenName: "Recherche & Suggestions",
      folder: "recherche_suggestions",
      route: "/search",
      description: "Villes couvertes, recherches récentes, résultats locaux ou 0 résultat.",
    },
    {
      id: "detail",
      screenNum: 9,
      screenName: "Détail Officine",
      folder: "d_tail_pharmacie_du_centre",
      route: "/pharmacy/osm:sample-centre",
      description: "Héros carte, horaires hebdomadaires, période de garde, appel direct.",
    },
    {
      id: "guards",
      screenNum: 10,
      screenName: "Pharmacies de garde",
      folder: "pharmacies_de_garde_s_lecteur",
      route: "/tabs/guards",
      description: "Service d'urgence 24/7, sélecteur de ville, bandeau de fraîcheur / périmé.",
    },
    {
      id: "favorites",
      screenNum: 11,
      screenName: "Favoris / Carnet d'urgence",
      folder: "favoris_gestion_des_officines",
      route: "/tabs/favorites",
      description: "Officines favorites hors-ligne, balayage pour retirer, état vide.",
    },
    {
      id: "settings",
      screenNum: 12,
      screenName: "Paramètres & Réglages",
      folder: "param_tres_r_glages",
      route: "/tabs/settings",
      description: "Langue FR/EN, thème clair/sombre, unités km/mi, packs régionaux hors-ligne.",
    },
    {
      id: "report",
      screenNum: 13,
      screenName: "Signaler une erreur",
      folder: "signaler_une_erreur",
      route: "/report/osm:sample-centre",
      description: "Formulaire citoyen à motifs multiples, précisions, numéro facultatif.",
    },
    {
      id: "route-3d",
      screenNum: 14,
      screenName: "Aperçu d'itinéraire 3D",
      folder: "aper_u_d_itin_raire_3d",
      route: "/route/osm:sample-centre",
      description: "Carte 3D isométrique, tracé animé dash-flow, 3 modes, alternatives.",
    },
    {
      id: "navigation",
      screenNum: 15,
      screenName: "Guidage GPS en direct",
      folder: "guidage_gps_en_direct",
      route: "/navigate/osm:sample-centre",
      description: "Bandeau manœuvres, suivi 3D vue perspective, vitesse, recalcul, signal faible.",
    },
    {
      id: "arrival",
      screenNum: 16,
      screenName: "Arrivée & Confirmation",
      folder: "cran_d_arriv_e_confirmation",
      route: "/arrival/osm:sample-centre",
      description: "Validation d'arrivée, sécurité, appel direct, entraide citoyenne vote 👍/👎.",
    },
    {
      id: "system-states",
      screenNum: 17,
      screenName: "États système & Réseau",
      folder: "tats_syst_me_r_seau",
      route: "/system",
      description: "Hors ligne (cache actif), incident réseau (503), synchronisation du pack.",
    },
  ];
}
