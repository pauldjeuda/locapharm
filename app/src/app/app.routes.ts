import { Routes } from "@angular/router";
import { SplashPage } from "./features/splash/splash.page";
import { OnboardingPage } from "./features/product/onboarding.page";
import { PermissionPage } from "./features/product/permission.page";
import { EmergencyPage } from "./features/product/emergency.page";
import {
  FavoritesPage,
  GuardsPage,
  MapPage,
  SettingsPage,
  TabsPage,
} from "./features/product/main-screens.pages";
import {
  ArrivalPage,
  FiltersPage,
  FeedbackPage,
  NavigationPage,
  PharmacyDetailPage,
  PrivacyPage,
  ReportPage,
  RoutePreviewPage,
  SearchPage,
  SystemPage,
} from "./features/product/secondary-screens.pages";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "splash" },
  { path: "splash", component: SplashPage },
  { path: "onboarding", component: OnboardingPage },
  { path: "permission", component: PermissionPage },
  { path: "emergency", component: EmergencyPage },
  {
    path: "tabs",
    component: TabsPage,
    children: [
      { path: "", pathMatch: "full", redirectTo: "map" },
      { path: "map", component: MapPage },
      { path: "guards", component: GuardsPage },
      { path: "favorites", component: FavoritesPage },
      { path: "settings", component: SettingsPage },
    ],
  },
  { path: "search", component: SearchPage },
  { path: "filters", component: FiltersPage },
  { path: "pharmacy/:id", component: PharmacyDetailPage },
  { path: "report/:id", component: ReportPage },
  { path: "feedback", component: FeedbackPage },
  { path: "route/:id", component: RoutePreviewPage },
  { path: "navigate/:id", component: NavigationPage },
  { path: "arrival/:id", component: ArrivalPage },
  { path: "system", component: SystemPage },
  { path: "privacy", component: PrivacyPage },
  {
    path: "dev/states",
    loadComponent: () =>
      import("./dev/states.page").then((m) => m.DevStatesPage),
  },
  { path: "**", redirectTo: "tabs/map" },
];
