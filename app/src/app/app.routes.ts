import { Routes } from "@angular/router";
import { SplashPage } from "./features/splash/splash.page";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "splash" },
  { path: "splash", component: SplashPage },
  { path: "**", redirectTo: "splash" },
];
