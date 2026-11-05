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

export type FeedbackType = "complaint" | "suggestion";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed";
export type HoaPlanStatus = "planned" | "in_progress" | "done";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  /** Community date, YYYY-MM-DD, when the notice is for a gathering. */
  eventDate?: string | null;
  authorUserId: string;
  authorName: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory = "house_rules" | "deed" | "minutes";

export interface HoaDocument {
  id: string;
  category: DocumentCategory;
  title: string;
  notes: string;
  fileName: string | null;
  mimeType: string | null;
  storageKey: string | null;
  publishedAt: string;
  authorUserId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackReply {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  subject: string;
  body: string;
  status: FeedbackStatus;
  lotId: string | null;
  lotCode: string | null;
  authorUserId: string;
  authorName: string;
  replies: FeedbackReply[];
  createdAt: string;
  updatedAt: string;
}

export interface HoaPlanUpdate {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAt: string;
}

export interface HoaPlan {
  id: string;
  title: string;
  description: string;
  status: HoaPlanStatus;
  progressPct: number;
  updates: HoaPlanUpdate[];
  authorUserId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  /**
   * Local demo password. Firebase mode never writes this field to the cloud.
   * Empty when the account is loaded from Firestore.
   */
  password: string;
  /** Firebase Auth uid, present after a cloud sign-in is linked. */
  firebaseUid?: string;
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
  /** Kept empty. The screenshot is sent to the treasurer on Messenger. */
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

/** Per-month collections progress for officer/treasurer charts. */
export interface MonthlyPaymentProgress {
  year: number;
  month: number;
  /** Verified (non-void) payments received in this calendar month. */
  received: string;
  /** Expected dues for the month (active lots × monthly dues). */
  expected: string;
  /** Sum of dues billed for this period (amountDue + penalty). */
  billed: string;
  /** Count of verified payments in the month. */
  paymentCount: number;
  /**
   * Collection progress vs expected target, 0–100+.
   * Null when expected is zero.
   */
  progressPct: number | null;
}

export type ElectionStatus = "setup" | "open" | "closed";
export type ContestScope = "association" | "block";
export type VoteChoice = "for" | "abstain";

export interface Election {
  id: string;
  year: number;
  title: string;
  status: ElectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ElectionContest {
  id: string;
  electionId: string;
  scope: ContestScope;
  /** president, vicePresident, treasurer, auditor, or blockLeader */
  roleKey: string;
  /** Lot blocks that vote in this contest. Empty means every eligible lot. */
  blocks: string[];
  candidateName: string;
  sortOrder: number;
}

/** Which lot may vote, and which block their block-leader vote belongs to. */
export interface VoterAssignment {
  id: string;
  electionId: string;
  lotId: string;
  lotCode: string;
  householdName: string;
  block: string;
  eligible: boolean;
  assignedByUserId: string;
  updatedAt: string;
}

export interface BallotChoice {
  contestId: string;
  choice: VoteChoice;
}

export interface Ballot {
  id: string;
  electionId: string;
  lotId: string;
  voterUserId: string;
  voterName: string;
  choices: BallotChoice[];
  submittedAt: string;
}

export interface ElectionTally {
  contestId: string;
  votesFor: number;
  abstain: number;
}

export interface VoterRollRow extends VoterAssignment {
  hasVoted: boolean;
}

export interface ElectionView {
  election: Election;
  contests: ElectionContest[];
  tallies: ElectionTally[];
  eligibleCount: number;
  votedCount: number;
  myAssignments: VoterAssignment[];
  myBallots: Ballot[];
  /** Present for officers and the treasurer. Choices stay off the roll. */
  roll: VoterRollRow[] | null;
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
  announcements?: Announcement[];
  feedbackItems?: FeedbackItem[];
  hoaPlans?: HoaPlan[];
  elections?: Election[];
  electionContests?: ElectionContest[];
  voterAssignments?: VoterAssignment[];
  ballots?: Ballot[];
  documents?: HoaDocument[];
  /** Base64 proof/receipt blobs keyed by storage key — optional for lighter backups. */
  files?: Record<string, { mimeType: string; fileName: string; base64: string }>;
}
