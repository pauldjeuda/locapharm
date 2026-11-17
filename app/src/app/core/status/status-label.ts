export type PharmacyStatus = "onDuty" | "open" | "closed" | "unknown";
export type AppLanguage = "fr" | "en";

const labels: Record<AppLanguage, Record<PharmacyStatus, string>> = {
  fr: {
    onDuty: "DE GARDE",
    open: "OUVERTE",
    closed: "FERMÉE",
    unknown: "HORAIRES NON RENSEIGNÉS",
  },
  en: {
    onDuty: "ON DUTY",
    open: "OPEN",
    closed: "CLOSED",
    unknown: "HOURS NOT PROVIDED",
  },
};

export function getPharmacyStatusLabel(
  status: PharmacyStatus,
  language: AppLanguage = "fr",
): string {
  return labels[language][status];
}
