import type { ExportBundle, SiteConfig, UserAccount, Lot, DuesCharge, Payment, Expense } from "../domain/types";
import { DEMO_PASSWORD, DEMO_USERS, DEFAULT_SITE_CONFIG } from "../lib/config";
import { nowIso } from "../lib/ids";

/** Fixed demo IDs so screenshots/tests stay stable. */
const IDS = {
  homeowner: "user_demo_homeowner",
  officer: "user_demo_officer",
  treasurer: "user_demo_treasurer",
  lotA: "lot_demo_b1_l01",
  lotB: "lot_demo_b1_l02",
  lotC: "lot_demo_b2_l05",
  duesA1: "dues_demo_a_2026_09",
  duesA2: "dues_demo_a_2026_10",
  duesB1: "dues_demo_b_2026_10",
  duesC1: "dues_demo_c_2026_10",
  payPending: "pay_demo_pending",
  payVerified: "pay_demo_verified",
  exp1: "exp_demo_security",
  alloc1: "alloc_demo_1",
} as const;

function siteConfig(): SiteConfig {
  return {
    id: "site",
    ...DEFAULT_SITE_CONFIG,
    hoaContact: "[CONFIG: HOA_CONTACT] Demo — Celina Plains Phase 1, Philippines",
    paymentInstructions:
      "[CONFIG: PAYMENT_INSTRUCTIONS] Demo GCash: 09XX XXX XXXX (Treasurer) · Demo Bank: BPI ****1234",
    openingCashBalance: "25000.00",
    updatedAt: nowIso(),
  };
}

function users(): UserAccount[] {
  const ts = nowIso();
  return [
    {
      id: IDS.homeowner,
      username: DEMO_USERS.homeowner.username,
      password: DEMO_PASSWORD,
      fullName: DEMO_USERS.homeowner.fullName,
      mobile: "09170000001",
      roles: ["homeowner"],
      lotIds: [IDS.lotA],
      isActive: true,
      consentPrivacyAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.officer,
      username: DEMO_USERS.officer.username,
      password: DEMO_PASSWORD,
      fullName: DEMO_USERS.officer.fullName,
      mobile: "09170000002",
      roles: ["officer", "homeowner"],
      lotIds: [IDS.lotB],
      isActive: true,
      consentPrivacyAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.treasurer,
      username: DEMO_USERS.treasurer.username,
      password: DEMO_PASSWORD,
      fullName: DEMO_USERS.treasurer.fullName,
      mobile: "09170000003",
      roles: ["treasurer", "officer", "homeowner"],
      lotIds: [IDS.lotC],
      isActive: true,
      consentPrivacyAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function lots(): Lot[] {
  const ts = nowIso();
  return [
    {
      id: IDS.lotA,
      lotCode: "B1-L01",
      block: "1",
      street: "Acacia St",
      householdName: "Santos Household (DEMO)",
      residentUserIds: [IDS.homeowner],
      isActive: true,
      notes: "DEMO DATA — sample homeowner lot",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.lotB,
      lotCode: "B1-L02",
      block: "1",
      street: "Acacia St",
      householdName: "Reyes Household (DEMO)",
      residentUserIds: [IDS.officer],
      isActive: true,
      notes: "DEMO DATA — officer sample lot",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.lotC,
      lotCode: "B2-L05",
      block: "2",
      street: "Mahogany Ave",
      householdName: "Cruz Household (DEMO)",
      residentUserIds: [IDS.treasurer],
      isActive: true,
      notes: "DEMO DATA — treasurer sample lot",
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function dues(): DuesCharge[] {
  const ts = nowIso();
  return [
    {
      id: IDS.duesA1,
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      periodYear: 2026,
      periodMonth: 9,
      amountDue: "500.00",
      penaltyAmount: "25.00",
      amountPaid: "525.00",
      status: "paid",
      dueDate: "2026-09-15",
      notes: "DEMO — paid with penalty",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.duesA2,
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      periodYear: 2026,
      periodMonth: 10,
      amountDue: "500.00",
      penaltyAmount: "0.00",
      amountPaid: "0.00",
      status: "unpaid",
      dueDate: "2026-10-15",
      notes: "DEMO — open dues for homeowner",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.duesB1,
      lotId: IDS.lotB,
      lotCode: "B1-L02",
      periodYear: 2026,
      periodMonth: 10,
      amountDue: "500.00",
      penaltyAmount: "0.00",
      amountPaid: "200.00",
      status: "partial",
      dueDate: "2026-10-15",
      notes: "DEMO — partial payment applied",
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.duesC1,
      lotId: IDS.lotC,
      lotCode: "B2-L05",
      periodYear: 2026,
      periodMonth: 10,
      amountDue: "500.00",
      penaltyAmount: "0.00",
      amountPaid: "0.00",
      status: "unpaid",
      dueDate: "2026-10-15",
      notes: "DEMO",
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function payments(): Payment[] {
  const ts = nowIso();
  return [
    {
      id: IDS.payVerified,
      paymentNo: "PAY-2026-00001",
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      payerUserId: IDS.homeowner,
      payerName: DEMO_USERS.homeowner.fullName,
      amount: "525.00",
      method: "gcash",
      payerReference: "DEMO-GCASH-1001",
      proofStorageKey: null,
      proofFileName: null,
      proofMimeType: null,
      status: "verified",
      orNumber: "OR-DEMO-1001",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-09-20T08:00:00.000Z",
      rejectionReason: "",
      notes: "DEMO verified payment",
      isVoid: false,
      voidReason: "",
      voidedAt: null,
      voidedByUserId: null,
      allocatedDuesIds: [IDS.duesA1],
      createdAt: "2026-09-18T10:00:00.000Z",
      updatedAt: ts,
    },
    {
      id: IDS.payPending,
      paymentNo: "PAY-2026-00002",
      lotId: IDS.lotB,
      lotCode: "B1-L02",
      payerUserId: IDS.officer,
      payerName: DEMO_USERS.officer.fullName,
      amount: "200.00",
      method: "bank",
      payerReference: "DEMO-BANK-2002",
      proofStorageKey: null,
      proofFileName: null,
      proofMimeType: null,
      status: "pending",
      orNumber: "",
      verifiedByUserId: null,
      verifiedAt: null,
      rejectionReason: "",
      notes: "DEMO — awaiting treasurer verification (already reflected as partial on dues for sample)",
      isVoid: false,
      voidReason: "",
      voidedAt: null,
      voidedByUserId: null,
      allocatedDuesIds: [IDS.duesB1],
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function expenses(): Expense[] {
  const ts = nowIso();
  return [
    {
      id: IDS.exp1,
      expenseDate: "2026-10-05",
      category: "security",
      amount: "8000.00",
      payee: "Demo Security Agency",
      description: "DEMO — monthly gate security retainer (October)",
      receiptStorageKey: null,
      recordedByUserId: IDS.treasurer,
      recordedByName: DEMO_USERS.treasurer.fullName,
      status: "posted",
      voidReason: "",
      voidedAt: null,
      voidedByUserId: null,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

/** Build a clearly labeled demo export bundle for seed. */
export function seedDemoBundle(): ExportBundle {
  return {
    version: 1,
    exportedAt: nowIso(),
    label: "DEMO DATA — Celina Plains Phase 1 HOA sample seed (not live residents)",
    siteConfig: siteConfig(),
    users: users(),
    lots: lots(),
    dues: dues(),
    payments: payments(),
    allocations: [
      {
        id: IDS.alloc1,
        paymentId: IDS.payVerified,
        duesChargeId: IDS.duesA1,
        amount: "525.00",
        createdAt: "2026-09-20T08:00:00.000Z",
      },
    ],
    expenses: expenses(),
    auditLogs: [],
  };
}

export { IDS as DEMO_IDS };
