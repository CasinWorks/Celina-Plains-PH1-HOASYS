import Dexie, { type EntityTable } from "dexie";
import type {
  DuesCharge,
  Expense,
  FinanceAuditLog,
  Lot,
  Payment,
  PaymentAllocation,
  SiteConfig,
  UserAccount,
} from "../../domain/types";

export type FileRecord = {
  key: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

export class HoaDatabase extends Dexie {
  users!: EntityTable<UserAccount, "id">;
  lots!: EntityTable<Lot, "id">;
  dues!: EntityTable<DuesCharge, "id">;
  payments!: EntityTable<Payment, "id">;
  allocations!: EntityTable<PaymentAllocation, "id">;
  expenses!: EntityTable<Expense, "id">;
  auditLogs!: EntityTable<FinanceAuditLog, "id">;
  siteConfig!: EntityTable<SiteConfig, "id">;
  files!: EntityTable<FileRecord, "key">;

  constructor(name = "celina_plains_p1_hoa") {
    super(name);
    this.version(1).stores({
      users: "id, username",
      lots: "id, lotCode, isActive",
      dues: "id, lotId, periodYear, periodMonth, status, [lotId+periodYear+periodMonth]",
      payments: "id, lotId, status, paymentNo, createdAt",
      allocations: "id, paymentId, duesChargeId",
      expenses: "id, expenseDate, status, category",
      auditLogs: "id, timestamp, entity, entityId",
      siteConfig: "id",
      files: "key",
    });
  }
}

let dbSingleton: HoaDatabase | null = null;

export function getDb(): HoaDatabase {
  if (!dbSingleton) dbSingleton = new HoaDatabase();
  return dbSingleton;
}

/** Test helper — use an isolated DB name. */
export function createTestDb(name: string): HoaDatabase {
  return new HoaDatabase(name);
}

export async function resetDbInstance(): Promise<void> {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
  }
}
