/**
 * Backend-agnostic service contracts.
 * Swap IndexedDB adapters for Firebase (Firestore/Auth/Storage) or Supabase
 * without changing UI code — see docs/BACKEND_SWAP.md.
 */

import type {
  DuesCharge,
  Expense,
  ExpenseCategory,
  ExportBundle,
  FinanceAuditLog,
  HomeownerFinanceSummary,
  Lot,
  MonthStatement,
  Payment,
  PaymentMethod,
  Role,
  Session,
  SiteConfig,
  UserAccount,
} from "../domain/types";

export interface AuthService {
  login(username: string, password: string): Promise<Session>;
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
  listAuditLogs(limit?: number): Promise<FinanceAuditLog[]>;

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
