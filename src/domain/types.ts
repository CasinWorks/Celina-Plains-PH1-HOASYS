/**
 * Domain types for Celina Plains Phase 1 HOA.
 *
 * Backend-agnostic contract:
 * - All entity IDs are strings (works for Firestore doc IDs and Postgres UUIDs).
 * - All timestamps/dates are ISO 8601 strings.
 * - UI never performs relational joins; services return denormalized view models
 *   or embed display fields needed on the document itself.
 */

export type Role = "homeowner" | "officer" | "treasurer";

export type DuesStatus = "unpaid" | "partial" | "paid" | "waived";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type PaymentMethod = "cash" | "bank" | "gcash" | "other";
export type ExpenseCategory =
  | "utilities"
  | "security"
  | "maintenance"
  | "admin"
  | "other";
export type ExpenseStatus = "posted" | "void";

export interface UserAccount {
  id: string;
  username: string;
  /** Demo-only plaintext password. Replace with Firebase Auth / hashed auth later. */
  password: string;
  fullName: string;
  mobile: string;
  roles: Role[];
  lotIds: string[];
  isActive: boolean;
  consentPrivacyAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lot {
  id: string;
  lotCode: string;
  block: string;
  street: string;
  householdName: string;
  residentUserIds: string[];
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuesCharge {
  id: string;
  lotId: string;
  /** Denormalized for UI lists — do not join Lots in components. */
  lotCode: string;
  periodYear: number;
  periodMonth: number;
  amountDue: string; // decimal as string
  penaltyAmount: string;
  amountPaid: string;
  status: DuesStatus;
  dueDate: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  lotId: string;
  lotCode: string;
  payerUserId: string;
  payerName: string;
  amount: string;
  method: PaymentMethod;
  payerReference: string;
  /** Storage key / object path for proof file (IndexedDB blob id or future Firebase Storage path). */
  proofStorageKey: string | null;
  proofFileName: string | null;
  proofMimeType: string | null;
  status: PaymentStatus;
  orNumber: string;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  rejectionReason: string;
  notes: string;
  isVoid: boolean;
  voidReason: string;
  voidedAt: string | null;
  voidedByUserId: string | null;
  /** Dues charge IDs this payment was applied to (set on verify). */
  allocatedDuesIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  duesChargeId: string;
  amount: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: string;
  payee: string;
  description: string;
  receiptStorageKey: string | null;
  recordedByUserId: string;
  recordedByName: string;
  status: ExpenseStatus;
  voidReason: string;
  voidedAt: string | null;
  voidedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAuditLog {
  id: string;
  entity: "dues" | "payment" | "expense" | "allocation" | "lot" | "user" | "config";
  entityId: string;
  action: "create" | "update" | "void" | "verify" | "reject" | "allocate" | "seed" | "import";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorUserId: string | null;
  actorName: string | null;
  note: string;
  timestamp: string;
}

export interface SiteConfig {
  id: string;
  lotCount: number;
  monthlyDuesAmount: string;
  penaltyRatePercent: string;
  penaltyGraceDays: number;
  penaltyCompounding: boolean;
  paymentInstructions: string;
  hoaContact: string;
  openingCashBalance: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  roles: Role[];
  lotIds: string[];
  consentPrivacyAt: string | null;
  loggedInAt: string;
}

export interface MonthStatement {
  year: number;
  month: number;
  openingBalance: string;
  collections: string;
  expenses: string;
  net: string;
  closingBalance: string;
}

export interface HomeownerFinanceSummary {
  collectionsThisMonth: string;
  expensesThisMonth: string;
  communityArrears: string;
  asOf: string;
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  label: string;
  siteConfig: SiteConfig;
  users: UserAccount[];
  lots: Lot[];
  dues: DuesCharge[];
  payments: Payment[];
  allocations: PaymentAllocation[];
  expenses: Expense[];
  auditLogs: FinanceAuditLog[];
  /** Base64 proof/receipt blobs keyed by storage key — optional for lighter backups. */
  files?: Record<string, { mimeType: string; fileName: string; base64: string }>;
}
