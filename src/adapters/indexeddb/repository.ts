import { addMoney, cmpMoney, money, subMoney } from "../../domain/money";
import type {
  DuesCharge,
  Expense,
  ExportBundle,
  FinanceAuditLog,
  Lot,
  Payment,
  PaymentAllocation,
  SiteConfig,
  UserAccount,
} from "../../domain/types";
import { DEFAULT_SITE_CONFIG } from "../../lib/config";
import { createId, nowIso, todayYmd } from "../../lib/ids";
import type { FileStorageService, HoaRepository } from "../../services/interfaces";
import { getDb, type HoaDatabase } from "./db";
import { seedDemoBundle } from "../../seed/demoData";

const CONFIG_ID = "site";

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00");
  const b = new Date(toYmd + "T00:00:00");
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

async function writeAudit(
  db: HoaDatabase,
  entry: Omit<FinanceAuditLog, "id" | "timestamp"> & { timestamp?: string },
): Promise<void> {
  await db.auditLogs.add({
    id: createId("audit"),
    timestamp: entry.timestamp ?? nowIso(),
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before,
    after: entry.after,
    actorUserId: entry.actorUserId,
    actorName: entry.actorName,
    note: entry.note,
  });
}

function refreshDuesStatus(charge: DuesCharge): DuesStatusComputed {
  if (charge.status === "waived") {
    return { status: "waived", amountPaid: charge.amountPaid };
  }
  const owed = addMoney(charge.amountDue, charge.penaltyAmount);
  const paid = charge.amountPaid;
  let status: DuesCharge["status"] = "unpaid";
  if (cmpMoney(paid, "0") <= 0) status = "unpaid";
  else if (cmpMoney(paid, owed) < 0) status = "partial";
  else status = "paid";
  return { status, amountPaid: paid };
}

type DuesStatusComputed = { status: DuesCharge["status"]; amountPaid: string };

export function createIndexedDbRepository(
  db: HoaDatabase = getDb(),
  files: FileStorageService,
): HoaRepository {
  const repo: HoaRepository = {
    async getSiteConfig() {
      let cfg = await db.siteConfig.get(CONFIG_ID);
      if (!cfg) {
        cfg = {
          id: CONFIG_ID,
          ...DEFAULT_SITE_CONFIG,
          updatedAt: nowIso(),
        };
        await db.siteConfig.put(cfg);
      }
      return cfg;
    },

    async updateSiteConfig(patch, actor) {
      const before = await this.getSiteConfig();
      const after: SiteConfig = {
        ...before,
        ...patch,
        id: CONFIG_ID,
        updatedAt: nowIso(),
      };
      await db.siteConfig.put(after);
      await writeAudit(db, {
        entity: "config",
        entityId: CONFIG_ID,
        action: "update",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "Site config updated",
      });
      return after;
    },

    async listUsers() {
      return db.users.toArray();
    },

    async getUser(id) {
      return (await db.users.get(id)) ?? null;
    },

    async listLots() {
      return db.lots.orderBy("lotCode").toArray();
    },

    async getLot(id) {
      return (await db.lots.get(id)) ?? null;
    },

    async createLot(input, actor) {
      const lot: Lot = {
        ...input,
        id: createId("lot"),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.lots.add(lot);
      await writeAudit(db, {
        entity: "lot",
        entityId: lot.id,
        action: "create",
        before: null,
        after: lot as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "",
      });
      return lot;
    },

    async updateLot(id, patch, actor) {
      const before = await db.lots.get(id);
      if (!before) throw new Error("Lot not found.");
      const after: Lot = { ...before, ...patch, id, updatedAt: nowIso() };
      await db.lots.put(after);
      await writeAudit(db, {
        entity: "lot",
        entityId: id,
        action: "update",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "",
      });
      return after;
    },

    async linkUserToLot(userId, lotId, actor) {
      const user = await db.users.get(userId);
      const lot = await db.lots.get(lotId);
      if (!user || !lot) throw new Error("User or lot not found.");
      const lotIds = Array.from(new Set([...user.lotIds, lotId]));
      const residentUserIds = Array.from(
        new Set([...lot.residentUserIds, userId]),
      );
      await db.users.update(userId, { lotIds, updatedAt: nowIso() });
      await db.lots.update(lotId, { residentUserIds, updatedAt: nowIso() });
      await writeAudit(db, {
        entity: "user",
        entityId: userId,
        action: "update",
        before: { lotIds: user.lotIds },
        after: { lotIds },
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: `Linked to lot ${lot.lotCode}`,
      });
    },

    async listDues(filter) {
      let rows = await db.dues.toArray();
      if (filter?.lotId) rows = rows.filter((d) => d.lotId === filter.lotId);
      return rows.sort((a, b) =>
        b.periodYear !== a.periodYear
          ? b.periodYear - a.periodYear
          : b.periodMonth - a.periodMonth || a.lotCode.localeCompare(b.lotCode),
      );
    },

    async getDues(id) {
      return (await db.dues.get(id)) ?? null;
    },

    async openDuesPeriod(year, month, actor, amountOverride) {
      if (month < 1 || month > 12) throw new Error("Month must be 1–12.");
      const cfg = await this.getSiteConfig();
      const amount = money(amountOverride ?? cfg.monthlyDuesAmount);
      const dueDay = Math.min(15, new Date(year, month, 0).getDate());
      const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
      const lots = (await db.lots.toArray()).filter((l) => l.isActive);
      const created: DuesCharge[] = [];
      for (const lot of lots) {
        const existing = await db.dues
          .where("[lotId+periodYear+periodMonth]")
          .equals([lot.id, year, month])
          .first();
        if (existing) continue;
        const charge: DuesCharge = {
          id: createId("dues"),
          lotId: lot.id,
          lotCode: lot.lotCode,
          periodYear: year,
          periodMonth: month,
          amountDue: amount,
          penaltyAmount: "0.00",
          amountPaid: "0.00",
          status: "unpaid",
          dueDate,
          notes: "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await db.dues.add(charge);
        created.push(charge);
        await writeAudit(db, {
          entity: "dues",
          entityId: charge.id,
          action: "create",
          before: null,
          after: charge as unknown as Record<string, unknown>,
          actorUserId: actor.userId,
          actorName: actor.fullName,
          note: `Opened ${year}-${String(month).padStart(2, "0")}`,
        });
      }
      return created;
    },

    async applyPenalties(asOfYmd, actor) {
      const cfg = await this.getSiteConfig();
      const charges = await db.dues
        .filter((d) => d.status !== "paid" && d.status !== "waived")
        .toArray();
      let updated = 0;
      for (const charge of charges) {
        let penalty = "0.00";
        const late = daysBetween(charge.dueDate, asOfYmd);
        if (late > cfg.penaltyGraceDays) {
          const rate = Number(cfg.penaltyRatePercent) / 100;
          let p = Number(charge.amountDue) * rate;
          if (cfg.penaltyCompounding) {
            const monthsLate = Math.max(
              0,
              Math.floor((late - cfg.penaltyGraceDays) / 30),
            );
            for (let i = 0; i < monthsLate; i++) p *= 1 + rate;
          }
          penalty = money(p);
        }
        if (penalty !== charge.penaltyAmount) {
          const before = { ...charge };
          const next = { ...charge, penaltyAmount: penalty, updatedAt: nowIso() };
          const refreshed = refreshDuesStatus(next);
          next.status = refreshed.status;
          await db.dues.put(next);
          updated += 1;
          await writeAudit(db, {
            entity: "dues",
            entityId: charge.id,
            action: "update",
            before: before as unknown as Record<string, unknown>,
            after: next as unknown as Record<string, unknown>,
            actorUserId: actor.userId,
            actorName: actor.fullName,
            note: "Penalty recalculated",
          });
        }
      }
      return updated;
    },

    async lotBalance(lotId) {
      const charges = await db.dues.where("lotId").equals(lotId).toArray();
      let total = "0.00";
      for (const c of charges) {
        if (c.status === "waived") continue;
        const bal = subMoney(addMoney(c.amountDue, c.penaltyAmount), c.amountPaid);
        if (cmpMoney(bal, "0") > 0) total = addMoney(total, bal);
      }
      return total;
    },

    async listPayments(filter) {
      let rows = await db.payments.orderBy("createdAt").reverse().toArray();
      if (filter?.lotId) rows = rows.filter((p) => p.lotId === filter.lotId);
      if (filter?.status) rows = rows.filter((p) => p.status === filter.status);
      return rows;
    },

    async getPayment(id) {
      return (await db.payments.get(id)) ?? null;
    },

    async submitPayment(input, actor) {
      if (cmpMoney(input.amount, "0") <= 0) {
        throw new Error("Amount must be greater than zero.");
      }
      if (!input.proofBlob) {
        throw new Error("Proof of payment is required.");
      }
      const lot = await db.lots.get(input.lotId);
      if (!lot) throw new Error("Lot not found.");
      if (
        !actor.roles.includes("treasurer") &&
        !actor.lotIds.includes(input.lotId)
      ) {
        throw new Error("You can only submit payments for your own lot.");
      }

      const year = new Date().getFullYear();
      const existing = await db.payments
        .filter((p) => p.paymentNo.startsWith(`PAY-${year}-`))
        .toArray();
      const seq =
        existing.reduce((max, p) => {
          const n = Number(p.paymentNo.split("-").pop());
          return Number.isFinite(n) && n > max ? n : max;
        }, 0) + 1;
      const paymentNo = `PAY-${year}-${String(seq).padStart(5, "0")}`;
      const proofKey = createId("proof");
      await files.put(proofKey, input.proofBlob, {
        fileName: input.proofFileName ?? "proof",
        mimeType:
          input.proofMimeType ??
          input.proofBlob.type ??
          "application/octet-stream",
      });

      const payment: Payment = {
        id: createId("pay"),
        paymentNo,
        lotId: lot.id,
        lotCode: lot.lotCode,
        payerUserId: actor.userId,
        payerName: actor.fullName,
        amount: money(input.amount),
        method: input.method,
        payerReference: input.payerReference,
        proofStorageKey: proofKey,
        proofFileName: input.proofFileName ?? "proof",
        proofMimeType:
          input.proofMimeType ??
          input.proofBlob.type ??
          "application/octet-stream",
        status: "pending",
        orNumber: "",
        verifiedByUserId: null,
        verifiedAt: null,
        rejectionReason: "",
        notes: input.notes,
        isVoid: false,
        voidReason: "",
        voidedAt: null,
        voidedByUserId: null,
        allocatedDuesIds: input.intendedDuesIds ?? [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.payments.add(payment);
      await writeAudit(db, {
        entity: "payment",
        entityId: payment.id,
        action: "create",
        before: null,
        after: payment as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "Payment claim submitted",
      });
      return payment;
    },

    async verifyPayment(paymentId, orNumber, actor, duesChargeIds) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can verify payments.");
      }
      const payment = await db.payments.get(paymentId);
      if (!payment) throw new Error("Payment not found.");
      if (payment.isVoid) throw new Error("Cannot verify a voided payment.");
      if (payment.status !== "pending") {
        throw new Error("Only pending payments can be verified.");
      }
      if (!orNumber.trim()) throw new Error("Official receipt (OR) number is required.");

      const before = { ...payment };
      const targetIds =
        duesChargeIds && duesChargeIds.length > 0
          ? duesChargeIds
          : payment.allocatedDuesIds;

      let open = await db.dues
        .where("lotId")
        .equals(payment.lotId)
        .filter((d) => d.status !== "paid" && d.status !== "waived")
        .toArray();
      open.sort(
        (a, b) =>
          a.periodYear - b.periodYear || a.periodMonth - b.periodMonth,
      );
      if (targetIds.length > 0) {
        open = open.filter((d) => targetIds.includes(d.id));
      }

      let remaining = money(payment.amount);
      const allocations: PaymentAllocation[] = [];
      const allocatedIds: string[] = [];

      for (const charge of open) {
        if (cmpMoney(remaining, "0") <= 0) break;
        const bal = subMoney(
          addMoney(charge.amountDue, charge.penaltyAmount),
          charge.amountPaid,
        );
        if (cmpMoney(bal, "0") <= 0) continue;
        const apply =
          cmpMoney(remaining, bal) <= 0 ? remaining : bal;
        const alloc: PaymentAllocation = {
          id: createId("alloc"),
          paymentId: payment.id,
          duesChargeId: charge.id,
          amount: apply,
          createdAt: nowIso(),
        };
        await db.allocations.add(alloc);
        allocations.push(alloc);
        allocatedIds.push(charge.id);

        const nextPaid = addMoney(charge.amountPaid, apply);
        const nextCharge: DuesCharge = {
          ...charge,
          amountPaid: nextPaid,
          updatedAt: nowIso(),
        };
        const refreshed = refreshDuesStatus(nextCharge);
        nextCharge.status = refreshed.status;
        await db.dues.put(nextCharge);
        remaining = subMoney(remaining, apply);

        await writeAudit(db, {
          entity: "allocation",
          entityId: alloc.id,
          action: "allocate",
          before: null,
          after: alloc as unknown as Record<string, unknown>,
          actorUserId: actor.userId,
          actorName: actor.fullName,
          note: "",
        });
      }

      if (allocations.length === 0) {
        throw new Error("No open dues to allocate this payment against.");
      }
      if (targetIds.length > 0 && cmpMoney(remaining, "0") > 0) {
        // Roll back allocations already written in this call by reversing dues
        for (const alloc of allocations) {
          const charge = await db.dues.get(alloc.duesChargeId);
          if (charge) {
            const nextPaid = subMoney(charge.amountPaid, alloc.amount);
            const nextCharge = {
              ...charge,
              amountPaid: nextPaid,
              updatedAt: nowIso(),
            };
            const refreshed = refreshDuesStatus(nextCharge);
            nextCharge.status = refreshed.status;
            await db.dues.put(nextCharge);
          }
          await db.allocations.delete(alloc.id);
        }
        throw new Error(
          "Payment amount exceeds outstanding balance on selected dues.",
        );
      }

      const after: Payment = {
        ...payment,
        status: "verified",
        orNumber: orNumber.trim(),
        verifiedByUserId: actor.userId,
        verifiedAt: nowIso(),
        allocatedDuesIds: allocatedIds,
        updatedAt: nowIso(),
      };
      await db.payments.put(after);
      await writeAudit(db, {
        entity: "payment",
        entityId: payment.id,
        action: "verify",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: `OR ${after.orNumber}`,
      });
      return after;
    },

    async rejectPayment(paymentId, reason, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can reject payments.");
      }
      if (!reason.trim()) throw new Error("Rejection reason is required.");
      const payment = await db.payments.get(paymentId);
      if (!payment) throw new Error("Payment not found.");
      if (payment.status !== "pending") {
        throw new Error("Only pending payments can be rejected.");
      }
      const before = { ...payment };
      const after: Payment = {
        ...payment,
        status: "rejected",
        rejectionReason: reason.trim(),
        verifiedByUserId: actor.userId,
        verifiedAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.payments.put(after);
      await writeAudit(db, {
        entity: "payment",
        entityId: payment.id,
        action: "reject",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: reason,
      });
      return after;
    },

    async voidPayment(paymentId, reason, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can void payments.");
      }
      if (!reason.trim()) throw new Error("Void reason is required.");
      const payment = await db.payments.get(paymentId);
      if (!payment) throw new Error("Payment not found.");
      if (payment.isVoid) throw new Error("Payment already voided.");
      const before = { ...payment };

      const allocs = await db.allocations
        .where("paymentId")
        .equals(paymentId)
        .toArray();
      for (const alloc of allocs) {
        const charge = await db.dues.get(alloc.duesChargeId);
        if (charge) {
          const nextPaid = subMoney(charge.amountPaid, alloc.amount);
          const nextCharge: DuesCharge = {
            ...charge,
            amountPaid: nextPaid,
            updatedAt: nowIso(),
          };
          const refreshed = refreshDuesStatus(nextCharge);
          nextCharge.status = refreshed.status;
          await db.dues.put(nextCharge);
        }
      }

      const after: Payment = {
        ...payment,
        isVoid: true,
        voidReason: reason.trim(),
        voidedAt: nowIso(),
        voidedByUserId: actor.userId,
        updatedAt: nowIso(),
      };
      await db.payments.put(after);
      await writeAudit(db, {
        entity: "payment",
        entityId: payment.id,
        action: "void",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: reason,
      });
      return after;
    },

    async recordPaymentAsTreasurer(input, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can record payments.");
      }
      const lot = await db.lots.get(input.lotId);
      if (!lot) throw new Error("Lot not found.");
      const year = new Date().getFullYear();
      const existing = await db.payments
        .filter((p) => p.paymentNo.startsWith(`PAY-${year}-`))
        .toArray();
      const seq =
        existing.reduce((max, p) => {
          const n = Number(p.paymentNo.split("-").pop());
          return Number.isFinite(n) && n > max ? n : max;
        }, 0) + 1;
      const payment: Payment = {
        id: createId("pay"),
        paymentNo: `PAY-${year}-${String(seq).padStart(5, "0")}`,
        lotId: lot.id,
        lotCode: lot.lotCode,
        payerUserId: actor.userId,
        payerName: actor.fullName,
        amount: money(input.amount),
        method: input.method,
        payerReference: input.payerReference ?? "",
        proofStorageKey: null,
        proofFileName: null,
        proofMimeType: null,
        status: "pending",
        orNumber: "",
        verifiedByUserId: null,
        verifiedAt: null,
        rejectionReason: "",
        notes: input.notes ?? "Recorded by treasurer",
        isVoid: false,
        voidReason: "",
        voidedAt: null,
        voidedByUserId: null,
        allocatedDuesIds: input.duesChargeIds ?? [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.payments.add(payment);
      await writeAudit(db, {
        entity: "payment",
        entityId: payment.id,
        action: "create",
        before: null,
        after: payment as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "Recorded by treasurer",
      });
      return this.verifyPayment(
        payment.id,
        input.orNumber,
        actor,
        input.duesChargeIds,
      );
    },

    async listExpenses() {
      return db.expenses.orderBy("expenseDate").reverse().toArray();
    },

    async createExpense(input, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can post expenses.");
      }
      if (cmpMoney(input.amount, "0") <= 0) {
        throw new Error("Amount must be greater than zero.");
      }
      const expense: Expense = {
        id: createId("exp"),
        expenseDate: input.expenseDate,
        category: input.category,
        amount: money(input.amount),
        payee: input.payee,
        description: input.description,
        receiptStorageKey: null,
        recordedByUserId: actor.userId,
        recordedByName: actor.fullName,
        status: "posted",
        voidReason: "",
        voidedAt: null,
        voidedByUserId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.expenses.add(expense);
      await writeAudit(db, {
        entity: "expense",
        entityId: expense.id,
        action: "create",
        before: null,
        after: expense as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "",
      });
      return expense;
    },

    async updateExpense(id, patch, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can update expenses.");
      }
      const before = await db.expenses.get(id);
      if (!before) throw new Error("Expense not found.");
      if (before.status === "void") throw new Error("Cannot edit a void expense.");
      const after: Expense = {
        ...before,
        ...patch,
        amount: patch.amount !== undefined ? money(patch.amount) : before.amount,
        id,
        updatedAt: nowIso(),
      };
      await db.expenses.put(after);
      await writeAudit(db, {
        entity: "expense",
        entityId: id,
        action: "update",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "",
      });
      return after;
    },

    async voidExpense(id, reason, actor) {
      if (!actor.roles.includes("treasurer")) {
        throw new Error("Only the treasurer can void expenses.");
      }
      if (!reason.trim()) throw new Error("Void reason is required.");
      const before = await db.expenses.get(id);
      if (!before) throw new Error("Expense not found.");
      const after: Expense = {
        ...before,
        status: "void",
        voidReason: reason.trim(),
        voidedAt: nowIso(),
        voidedByUserId: actor.userId,
        updatedAt: nowIso(),
      };
      await db.expenses.put(after);
      await writeAudit(db, {
        entity: "expense",
        entityId: id,
        action: "void",
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: reason,
      });
      return after;
    },

    async monthStatement(year, month) {
      const cfg = await this.getSiteConfig();
      const payments = await db.payments
        .filter(
          (p) =>
            p.status === "verified" &&
            !p.isVoid &&
            !!p.verifiedAt &&
            new Date(p.verifiedAt).getFullYear() === year &&
            new Date(p.verifiedAt).getMonth() + 1 === month,
        )
        .toArray();
      const expenses = await db.expenses
        .filter((e) => {
          if (e.status !== "posted") return false;
          const [y, m] = e.expenseDate.split("-").map(Number);
          return y === year && m === month;
        })
        .toArray();
      const collections = payments.reduce(
        (s, p) => addMoney(s, p.amount),
        "0.00",
      );
      const expenseTotal = expenses.reduce(
        (s, e) => addMoney(s, e.amount),
        "0.00",
      );
      const net = subMoney(collections, expenseTotal);
      const opening = money(cfg.openingCashBalance);
      return {
        year,
        month,
        openingBalance: opening,
        collections,
        expenses: expenseTotal,
        net,
        closingBalance: addMoney(opening, net),
      };
    },

    async homeownerFinanceSummary() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const statement = await this.monthStatement(year, month);
      const charges = await db.dues
        .filter((d) => d.status !== "waived" && d.status !== "paid")
        .toArray();
      let arrears = "0.00";
      for (const c of charges) {
        const bal = subMoney(addMoney(c.amountDue, c.penaltyAmount), c.amountPaid);
        if (cmpMoney(bal, "0") > 0) arrears = addMoney(arrears, bal);
      }
      return {
        collectionsThisMonth: statement.collections,
        expensesThisMonth: statement.expenses,
        communityArrears: arrears,
        asOf: todayYmd(),
      };
    },

    async listAuditLogs(limit = 100) {
      const rows = await db.auditLogs.orderBy("timestamp").reverse().toArray();
      return rows.slice(0, limit);
    },

    async seedDemoData(replace = true) {
      if (replace) await this.clearAllData();
      const bundle = seedDemoBundle();
      await this.importData(bundle);
      await writeAudit(db, {
        entity: "config",
        entityId: CONFIG_ID,
        action: "seed",
        before: null,
        after: { label: bundle.label },
        actorUserId: null,
        actorName: "system",
        note: "Demo data seeded — clearly labeled demo",
      });
    },

    async clearAllData() {
      await Promise.all([
        db.users.clear(),
        db.lots.clear(),
        db.dues.clear(),
        db.payments.clear(),
        db.allocations.clear(),
        db.expenses.clear(),
        db.auditLogs.clear(),
        db.siteConfig.clear(),
        db.files.clear(),
      ]);
    },

    async exportData(includeFiles = true) {
      const bundle: ExportBundle = {
        version: 1,
        exportedAt: nowIso(),
        label: "Celina Plains Phase 1 HOA backup",
        siteConfig: await this.getSiteConfig(),
        users: await db.users.toArray(),
        lots: await db.lots.toArray(),
        dues: await db.dues.toArray(),
        payments: await db.payments.toArray(),
        allocations: await db.allocations.toArray(),
        expenses: await db.expenses.toArray(),
        auditLogs: await db.auditLogs.toArray(),
      };
      if (includeFiles) {
        bundle.files = await files.exportAll();
      }
      return bundle;
    },

    async importData(bundle) {
      if (bundle.version !== 1) throw new Error("Unsupported backup version.");
      await this.clearAllData();
      await db.siteConfig.put(bundle.siteConfig);
      await db.users.bulkPut(bundle.users);
      await db.lots.bulkPut(bundle.lots);
      await db.dues.bulkPut(bundle.dues);
      await db.payments.bulkPut(bundle.payments);
      await db.allocations.bulkPut(bundle.allocations);
      await db.expenses.bulkPut(bundle.expenses);
      await db.auditLogs.bulkPut(bundle.auditLogs);
      if (bundle.files) await files.importAll(bundle.files);
      await writeAudit(db, {
        entity: "config",
        entityId: CONFIG_ID,
        action: "import",
        before: null,
        after: { exportedAt: bundle.exportedAt, label: bundle.label },
        actorUserId: null,
        actorName: "system",
        note: "Data imported from JSON backup",
      });
    },
  };

  return repo;
}

/** Hard-delete prevention for verified payments — policy helper for tests/UI. */
export function assertPaymentNotHardDeleted(payment: Payment): void {
  if (payment.status === "verified" && !payment.isVoid) {
    throw new Error(
      "Verified payments cannot be hard-deleted. Void the payment instead.",
    );
  }
  throw new Error(
    "Payments cannot be hard-deleted. Use void for verified payments.",
  );
}

export type { UserAccount };
