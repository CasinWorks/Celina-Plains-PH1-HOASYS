/** Brand and configurable placeholders — never invent subdivision facts. */
export const HOA_NAME = "Celina Plains Phase 1 HOA";
export const HOA_SHORT_NAME = "Celina Plains PH1";
export const CASINWORKS_URL = "https://www.casinworks.com/";
export const CASINWORKS_NAME = "CasinWorks";

export const DEFAULT_SITE_CONFIG = {
  lotCount: 120, // [CONFIG: LOT_COUNT]
  monthlyDuesAmount: "500.00", // [CONFIG: MONTHLY_DUES_AMOUNT]
  penaltyRatePercent: "5.00", // [CONFIG: PENALTY_RULES]
  penaltyGraceDays: 15,
  penaltyCompounding: false,
  paymentInstructions:
    "GCash: scan the QR on the welcome page, then send the screenshot to the treasurer on Messenger. Cash: pay the treasurer in person.",
  hoaContact: "Cash is paid to the treasurer.",
  openingCashBalance: "0.00",
} as const;

export const DEMO_PASSWORD = "demo1234";

export const DEMO_USERS = {
  homeowner: { username: "homeowner.demo", fullName: "Demo Homeowner (Santos)" },
  officer: { username: "officer.demo", fullName: "Demo Officer (Reyes)" },
  treasurer: { username: "treasurer.demo", fullName: "Demo Treasurer (Cruz)" },
} as const;
