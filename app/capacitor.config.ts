import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cm.locapharm.app",
  appName: "Locapharm",
  webDir: "dist/locapharm/browser",
  server: {
    androidScheme: "https",
  },
};

export default config;
