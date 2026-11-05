/**
 * Backend-agnostic service contracts.
 * Swap IndexedDB adapters for Firebase (Firestore/Auth/Storage) or Supabase
 * without changing UI code — see docs/BACKEND_SWAP.md.
 */

import type {
  Announcement,
  DuesCharge,
  DocumentCategory,
  ElectionStatus,
  ElectionView,
  Expense,
  ExpenseCategory,
  ExportBundle,
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
  FinanceAuditLog,
  HoaDocument,
  HoaPlan,
  HoaPlanStatus,
  HomeownerFinanceSummary,
  Lot,
  MonthlyPaymentProgress,
  MonthStatement,
  Payment,
  PaymentMethod,
  Role,
  Session,
  SiteConfig,
  UserAccount,
  VoteChoice,
} from "../domain/types";

export interface RegisterHomeownerInput {
  fullName: string;
  username: string;
  password: string;
  mobile: string;
  lotCode: string;
}

export interface AuthService {
  login(username: string, password: string): Promise<Session>;
  applyForHomeowner(input: RegisterHomeownerInput): Promise<void>;
  /** Officer or treasurer adds a homeowner without signing themselves out. */
  provisionHomeowner(
    input: RegisterHomeownerInput,
    actor: Session,
  ): Promise<UserAccount>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
  changePassword(userId: string, current: string, next: string): Promise<void>;
  acceptPrivacyConsent(userId: string): Promise<Session>;
  hasRole(session: Session | null, roles: Role | Role[]): boolean;
}

export interface FileStorageService {
  put(
    key: string,
    blob: Blob,
    meta: { fileName: string; mimeType: string },
  ): Promise<string>;
  get(key: string): Promise<Blob | null>;
  getObjectUrl(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  exportAll(): Promise<
    Record<string, { mimeType: string; fileName: string; base64: string }>
  >;
  importAll(
    files: Record<string, { mimeType: string; fileName: string; base64: string }>,
  ): Promise<void>;
}

export interface HoaRepository {
  // Config
  getSiteConfig(): Promise<SiteConfig>;
  updateSiteConfig(
    patch: Partial<Omit<SiteConfig, "id">>,
    actor: Session,
  ): Promise<SiteConfig>;

  // Users / lots
  listUsers(): Promise<UserAccount[]>;
  getUser(id: string): Promise<UserAccount | null>;
  listLots(): Promise<Lot[]>;
  getLot(id: string): Promise<Lot | null>;
  createLot(
    input: Omit<Lot, "id" | "createdAt" | "updatedAt">,
    actor: Session,
  ): Promise<Lot>;
  updateLot(
    id: string,
    patch: Partial<Lot>,
    actor: Session,
  ): Promise<Lot>;
  linkUserToLot(userId: string, lotId: string, actor: Session): Promise<void>;
  approveHomeownerApplication(userId: string, actor: Session): Promise<UserAccount>;
  rejectHomeownerApplication(userId: string, actor: Session): Promise<void>;
  setMemberAccess(
    userId: string,
    access: { officer: boolean; treasurer: boolean },
    actor: Session,
  ): Promise<UserAccount>;

  // Dues
  listDues(filter?: { lotId?: string }): Promise<DuesCharge[]>;
  getDues(id: string): Promise<DuesCharge | null>;
  openDuesPeriod(
    year: number,
    month: number,
    actor: Session,
    amountOverride?: string,
  ): Promise<DuesCharge[]>;
  applyPenalties(asOfYmd: string, actor: Session): Promise<number>;
  lotBalance(lotId: string): Promise<string>;

  // Payments
  listPayments(filter?: {
    lotId?: string;
    status?: Payment["status"];
  }): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | null>;
  submitPayment(
    input: {
      lotId: string;
      amount: string;
      method: PaymentMethod;
      payerReference: string;
      notes: string;
      proofBlob?: Blob;
      proofFileName?: string;
      proofMimeType?: string;
      intendedDuesIds?: string[];
    },
    actor: Session,
  ): Promise<Payment>;
  verifyPayment(
    paymentId: string,
    orNumber: string,
    actor: Session,
    duesChargeIds?: string[],
  ): Promise<Payment>;
  rejectPayment(
    paymentId: string,
    reason: string,
    actor: Session,
  ): Promise<Payment>;
  voidPayment(
    paymentId: string,
    reason: string,
    actor: Session,
  ): Promise<Payment>;
  recordPaymentAsTreasurer(
    input: {
      lotId: string;
      amount: string;
      method: PaymentMethod;
      orNumber: string;
      payerReference?: string;
      notes?: string;
      duesChargeIds?: string[];
    },
    actor: Session,
  ): Promise<Payment>;

  // Expenses
  listExpenses(): Promise<Expense[]>;
  createExpense(
    input: {
      expenseDate: string;
      category: ExpenseCategory;
      amount: string;
      payee: string;
      description: string;
    },
    actor: Session,
  ): Promise<Expense>;
  updateExpense(
    id: string,
    patch: Partial<Pick<Expense, "amount" | "payee" | "description" | "category" | "expenseDate">>,
    actor: Session,
  ): Promise<Expense>;
  voidExpense(id: string, reason: string, actor: Session): Promise<Expense>;

  // Reports
  monthStatement(year: number, month: number): Promise<MonthStatement>;
  homeownerFinanceSummary(): Promise<HomeownerFinanceSummary>;
  monthlyPaymentProgress(year: number): Promise<MonthlyPaymentProgress[]>;
  listAuditLogs(limit?: number): Promise<FinanceAuditLog[]>;

  // Community — announcements
  listAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(
    input: { title: string; body: string; pinned?: boolean; eventDate?: string | null },
    actor: Session,
  ): Promise<Announcement>;
  updateAnnouncement(
    id: string,
    patch: Partial<Pick<Announcement, "title" | "body" | "pinned" | "eventDate">>,
    actor: Session,
  ): Promise<Announcement>;
  deleteAnnouncement(id: string, actor: Session): Promise<void>;

  listDocuments(): Promise<HoaDocument[]>;
  createDocument(
    input: {
      category: DocumentCategory;
      title: string;
      notes?: string;
      file?: File | null;
    },
    actor: Session,
  ): Promise<HoaDocument>;
  deleteDocument(id: string, actor: Session): Promise<void>;

  // Community — complaints & suggestions
  listFeedback(filter?: {
    type?: FeedbackType;
    status?: FeedbackStatus;
  }): Promise<FeedbackItem[]>;
  createFeedback(
    input: {
      type: FeedbackType;
      subject: string;
      body: string;
      lotId?: string | null;
    },
    actor: Session,
  ): Promise<FeedbackItem>;
  updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    actor: Session,
  ): Promise<FeedbackItem>;
  replyToFeedback(
    id: string,
    body: string,
    actor: Session,
  ): Promise<FeedbackItem>;

  // Community — HOA plans / progress
  listHoaPlans(): Promise<HoaPlan[]>;
  createHoaPlan(
    input: {
      title: string;
      description: string;
      status?: HoaPlanStatus;
      progressPct?: number;
    },
    actor: Session,
  ): Promise<HoaPlan>;
  updateHoaPlan(
    id: string,
    patch: Partial<
      Pick<HoaPlan, "title" | "description" | "status" | "progressPct">
    >,
    actor: Session,
  ): Promise<HoaPlan>;
  addHoaPlanUpdate(
    id: string,
    body: string,
    actor: Session,
  ): Promise<HoaPlan>;

  // Election voting
  ensureElection(actor: Session): Promise<ElectionView>;
  setElectionStatus(status: ElectionStatus, actor: Session): Promise<ElectionView>;
  setVoterAssignment(
    input: { lotId: string; eligible: boolean; block: string },
    actor: Session,
  ): Promise<ElectionView>;
  castBallot(
    input: { lotId: string; choices: { contestId: string; choice: VoteChoice }[] },
    actor: Session,
  ): Promise<ElectionView>;

  // Demo / backup
  seedDemoData(replace?: boolean): Promise<void>;
  clearAllData(): Promise<void>;
  exportData(includeFiles?: boolean): Promise<ExportBundle>;
  importData(bundle: ExportBundle): Promise<void>;
}

export interface HoaServices {
  auth: AuthService;
  repo: HoaRepository;
  files: FileStorageService;
}
