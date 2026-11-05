import type {
  Announcement,
  Election,
  ExportBundle,
  SiteConfig,
  UserAccount,
  Lot,
  DuesCharge,
  Payment,
  Expense,
  FeedbackItem,
  HoaPlan,
  VoterAssignment,
} from "../domain/types";
import {
  buildElectionContests,
  ELECTION_ID,
  ELECTION_YEAR,
} from "../content/election2026";
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
  payJun: "pay_demo_jun",
  payJul: "pay_demo_jul",
  payAug: "pay_demo_aug",
  payOct: "pay_demo_oct",
  exp1: "exp_demo_security",
  alloc1: "alloc_demo_1",
  ann1: "ann_demo_meeting",
  ann2: "ann_demo_dues",
  fb1: "fb_demo_complaint",
  fb2: "fb_demo_suggestion",
  plan1: "plan_demo_gate",
  plan2: "plan_demo_lights",
} as const;

function siteConfig(): SiteConfig {
  return {
    id: "site",
    ...DEFAULT_SITE_CONFIG,
    hoaContact: "Cash is paid to the treasurer.",
    paymentInstructions:
      "GCash: scan the QR on the welcome page, then send the screenshot to the treasurer on Messenger. Cash: pay the treasurer in person.",
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
      amountPaid: "0.00",
      status: "unpaid",
      dueDate: "2026-10-15",
      notes: "DEMO — open dues with a pending payment claim awaiting verify",
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
  const base = {
    proofStorageKey: null as string | null,
    proofFileName: null as string | null,
    proofMimeType: null as string | null,
    rejectionReason: "",
    isVoid: false,
    voidReason: "",
    voidedAt: null as string | null,
    voidedByUserId: null as string | null,
    updatedAt: ts,
  };
  return [
    {
      ...base,
      id: IDS.payJun,
      paymentNo: "PAY-2026-00001",
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      payerUserId: IDS.homeowner,
      payerName: DEMO_USERS.homeowner.fullName,
      amount: "500.00",
      method: "gcash",
      payerReference: "DEMO-GCASH-0601",
      status: "verified",
      orNumber: "OR-DEMO-0601",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-06-18T09:00:00.000Z",
      notes: "DEMO — June collection",
      allocatedDuesIds: [],
      createdAt: "2026-06-16T10:00:00.000Z",
    },
    {
      ...base,
      id: IDS.payJul,
      paymentNo: "PAY-2026-00002",
      lotId: IDS.lotB,
      lotCode: "B1-L02",
      payerUserId: IDS.officer,
      payerName: DEMO_USERS.officer.fullName,
      amount: "1000.00",
      method: "bank",
      payerReference: "DEMO-BANK-0701",
      status: "verified",
      orNumber: "OR-DEMO-0701",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-07-12T08:30:00.000Z",
      notes: "DEMO — July collection (2 lots)",
      allocatedDuesIds: [],
      createdAt: "2026-07-10T11:00:00.000Z",
    },
    {
      ...base,
      id: IDS.payAug,
      paymentNo: "PAY-2026-00003",
      lotId: IDS.lotC,
      lotCode: "B2-L05",
      payerUserId: IDS.treasurer,
      payerName: DEMO_USERS.treasurer.fullName,
      amount: "1500.00",
      method: "cash",
      payerReference: "DEMO-CASH-0801",
      status: "verified",
      orNumber: "OR-DEMO-0801",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-08-22T10:00:00.000Z",
      notes: "DEMO — August collection (strong month)",
      allocatedDuesIds: [],
      createdAt: "2026-08-20T09:00:00.000Z",
    },
    {
      ...base,
      id: IDS.payVerified,
      paymentNo: "PAY-2026-00004",
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      payerUserId: IDS.homeowner,
      payerName: DEMO_USERS.homeowner.fullName,
      amount: "525.00",
      method: "gcash",
      payerReference: "DEMO-GCASH-1001",
      status: "verified",
      orNumber: "OR-DEMO-1001",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-09-20T08:00:00.000Z",
      notes: "DEMO verified payment",
      allocatedDuesIds: [IDS.duesA1],
      createdAt: "2026-09-18T10:00:00.000Z",
    },
    {
      ...base,
      id: IDS.payOct,
      paymentNo: "PAY-2026-00005",
      lotId: IDS.lotC,
      lotCode: "B2-L05",
      payerUserId: IDS.treasurer,
      payerName: DEMO_USERS.treasurer.fullName,
      amount: "750.00",
      method: "gcash",
      payerReference: "DEMO-GCASH-1005",
      status: "verified",
      orNumber: "OR-DEMO-1005",
      verifiedByUserId: IDS.treasurer,
      verifiedAt: "2026-10-08T07:45:00.000Z",
      notes: "DEMO — early October receipts",
      allocatedDuesIds: [],
      createdAt: "2026-10-07T12:00:00.000Z",
    },
    {
      ...base,
      id: IDS.payPending,
      paymentNo: "PAY-2026-00006",
      lotId: IDS.lotB,
      lotCode: "B1-L02",
      payerUserId: IDS.officer,
      payerName: DEMO_USERS.officer.fullName,
      amount: "200.00",
      method: "bank",
      payerReference: "DEMO-BANK-2002",
      status: "pending",
      orNumber: "",
      verifiedByUserId: null,
      verifiedAt: null,
      notes: "DEMO — awaiting treasurer verification",
      allocatedDuesIds: [IDS.duesB1],
      createdAt: ts,
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

function announcements(): Announcement[] {
  const ts = nowIso();
  return [
    {
      id: IDS.ann1,
      title: "DEMO — General assembly this Saturday",
      body: "Join us at the clubhouse, 9:00 AM. Bring your lot ID for attendance.",
      pinned: true,
      eventDate: "2026-11-07",
      authorUserId: IDS.officer,
      authorName: DEMO_USERS.officer.fullName,
      publishedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: IDS.ann2,
      title: "DEMO — October dues reminder",
      body: "Please settle October dues on or before the 15th. Send the screenshot to the treasurer on Messenger.",
      pinned: false,
      authorUserId: IDS.treasurer,
      authorName: DEMO_USERS.treasurer.fullName,
      publishedAt: "2026-10-01T08:00:00.000Z",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
  ];
}

function feedbackItems(): FeedbackItem[] {
  const ts = nowIso();
  return [
    {
      id: IDS.fb1,
      type: "complaint",
      subject: "DEMO — Streetlight near B1 gate is out",
      body: "The light near the Acacia entrance has been dark for three nights.",
      status: "in_progress",
      lotId: IDS.lotA,
      lotCode: "B1-L01",
      authorUserId: IDS.homeowner,
      authorName: DEMO_USERS.homeowner.fullName,
      replies: [
        {
          id: "fbr_demo_1",
          authorUserId: IDS.officer,
          authorName: DEMO_USERS.officer.fullName,
          body: "Thanks — electrician scheduled for Thursday.",
          createdAt: ts,
        },
      ],
      createdAt: "2026-10-08T09:00:00.000Z",
      updatedAt: ts,
    },
    {
      id: IDS.fb2,
      type: "suggestion",
      subject: "DEMO — Weekend recycling drop-off",
      body: "Could we try a Saturday morning recycling corner near the clubhouse?",
      status: "open",
      lotId: IDS.lotB,
      lotCode: "B1-L02",
      authorUserId: IDS.officer,
      authorName: DEMO_USERS.officer.fullName,
      replies: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function hoaPlans(): HoaPlan[] {
  const ts = nowIso();
  return [
    {
      id: IDS.plan1,
      title: "DEMO — Front gate motor repair",
      description: "Replace worn motor and repaint the gate frame.",
      status: "in_progress",
      progressPct: 55,
      updates: [
        {
          id: "plu_demo_1",
          body: "Parts ordered. Install booked for next week.",
          authorUserId: IDS.officer,
          authorName: DEMO_USERS.officer.fullName,
          createdAt: ts,
        },
      ],
      authorUserId: IDS.officer,
      authorName: DEMO_USERS.officer.fullName,
      createdAt: "2026-09-20T08:00:00.000Z",
      updatedAt: ts,
    },
    {
      id: IDS.plan2,
      title: "DEMO — Pathway solar lights",
      description: "Install solar bollards along Mahogany Ave walkway.",
      status: "planned",
      progressPct: 10,
      updates: [],
      authorUserId: IDS.treasurer,
      authorName: DEMO_USERS.treasurer.fullName,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function electionSeed(): {
  elections: Election[];
  assignments: VoterAssignment[];
} {
  const ts = nowIso();
  const election: Election = {
    id: ELECTION_ID,
    year: ELECTION_YEAR,
    title: "CPI-1 HOA election of officers",
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  };
  const assignments: VoterAssignment[] = lots().map((lot) => ({
    id: `voter_demo_${lot.id}`,
    electionId: election.id,
    lotId: lot.id,
    lotCode: lot.lotCode,
    householdName: lot.householdName,
    block: lot.block,
    eligible: true,
    assignedByUserId: IDS.treasurer,
    updatedAt: ts,
  }));
  return { elections: [election], assignments };
}

/** Build a clearly labeled demo export bundle for seed. */
export function seedDemoBundle(): ExportBundle {
  const election = electionSeed();
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
    announcements: announcements(),
    feedbackItems: feedbackItems(),
    hoaPlans: hoaPlans(),
    elections: election.elections,
    electionContests: buildElectionContests(ELECTION_ID),
    voterAssignments: election.assignments,
    ballots: [],
  };
}

export { IDS as DEMO_IDS };
