import { addMoney, cmpMoney, money, subMoney } from "../../domain/money";
import type {
  Announcement,
  AnnouncementPhoto,
  EventAttendance,
  Ballot,
  DuesCharge,
  Election,
  ElectionTally,
  ElectionView,
  Expense,
  ExportBundle,
  FeedbackItem,
  FeedbackReply,
  FinanceAuditLog,
  HoaDocument,
  HoaPlan,
  HoaPlanUpdate,
  Lot,
  Payment,
  PaymentAllocation,
  Session,
  SiteConfig,
  UserAccount,
  VoterAssignment,
  VoteChoice,
} from "../../domain/types";
import {
  buildElectionContests,
  contestsForBlock,
  ELECTION_ID,
  ELECTION_YEAR,
} from "../../content/election2026";
import { DEFAULT_SITE_CONFIG } from "../../lib/config";
import { createId, nowIso, todayYmd } from "../../lib/ids";
import type { FileStorageService, HoaRepository } from "../../services/interfaces";
import { getDb, type HoaDatabase } from "./db";
import { seedDemoBundle } from "../../seed/demoData";
import {
  approveHomeownerRecord,
  rejectHomeownerRecord,
} from "../registerHomeowner";

const CONFIG_ID = "site";

function canManageElection(actor: Session): boolean {
  return actor.roles.includes("officer") || actor.roles.includes("treasurer");
}

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

async function electionView(db: HoaDatabase, actor: Session): Promise<ElectionView> {
  const election = await db.elections.get(ELECTION_ID);
  if (!election) throw new Error("Election not found.");
  const contests = (
    await db.electionContests.where("electionId").equals(election.id).toArray()
  ).sort((a, b) => a.sortOrder - b.sortOrder);
  const assignments = await db.voterAssignments
    .where("electionId")
    .equals(election.id)
    .toArray();
  const ballots = await db.ballots.where("electionId").equals(election.id).toArray();
  const votedLots = new Set(ballots.map((ballot) => ballot.lotId));
  const tallies: ElectionTally[] = contests.map((contest) => {
    let votesFor = 0;
    let abstain = 0;
    for (const ballot of ballots) {
      const choice = ballot.choices.find((row) => row.contestId === contest.id);
      if (!choice) continue;
      if (choice.choice === "for") votesFor += 1;
      else abstain += 1;
    }
    return { contestId: contest.id, votesFor, abstain };
  });
  const mine = new Set(actor.lotIds);
  return {
    election,
    contests,
    tallies,
    eligibleCount: assignments.filter((row) => row.eligible).length,
    votedCount: ballots.length,
    myAssignments: assignments.filter((row) => mine.has(row.lotId)),
    myBallots: ballots.filter((row) => mine.has(row.lotId)),
    roll: canManageElection(actor)
      ? assignments
          .map((row) => ({ ...row, hasVoted: votedLots.has(row.lotId) }))
          .sort((a, b) => a.lotCode.localeCompare(b.lotCode))
      : null,
  };
}

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

    async approveHomeownerApplication(userId, actor) {
      return approveHomeownerRecord(db, userId, actor);
    },

    async rejectHomeownerApplication(userId, actor) {
      await rejectHomeownerRecord(db, userId, actor);
    },

    async setMemberAccess(userId, access, actor) {
      if (!actor.roles.includes("admin")) {
        throw new Error("Only an admin can assign access.");
      }
      const user = await db.users.get(userId);
      if (!user) throw new Error("That person was not found.");
      if (user.roles.includes("admin")) {
        throw new Error("The admin account stays as it is.");
      }
      if (
        user.approvalStatus === "pending" ||
        user.approvalStatus === "rejected"
      ) {
        throw new Error("Verify the homeowner before assigning access.");
      }
      if (!user.roles.includes("homeowner")) {
        throw new Error("Access is assigned to a homeowner.");
      }
      const roles: UserAccount["roles"] = ["homeowner"];
      if (access.officer) roles.push("officer");
      if (access.treasurer) roles.push("treasurer");
      const next: UserAccount = { ...user, roles, updatedAt: nowIso() };
      await db.users.put(next);
      await writeAudit(db, {
        entity: "user",
        entityId: user.id,
        action: "update",
        before: { roles: user.roles },
        after: { roles },
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "Admin assigned access",
      });
      return next;
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
        proofStorageKey: null,
        proofFileName: null,
        proofMimeType: null,
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
      const strictPreferred = Boolean(
        duesChargeIds && duesChargeIds.length > 0,
      );
      const preferredIds = strictPreferred
        ? duesChargeIds!
        : payment.allocatedDuesIds;

      const allOpen = (
        await db.dues
          .where("lotId")
          .equals(payment.lotId)
          .filter((d) => d.status !== "paid" && d.status !== "waived")
          .toArray()
      ).sort(
        (a, b) =>
          a.periodYear - b.periodYear || a.periodMonth - b.periodMonth,
      );

      // Prefer intended dues when they still have a balance; otherwise fall
      // back to any open dues on the lot so the verify queue never dead-ends.
      // Explicit duesChargeIds stay strict (used by treasurer record-payment).
      let open = allOpen;
      if (preferredIds.length > 0) {
        const preferred = allOpen.filter((d) => preferredIds.includes(d.id));
        if (strictPreferred) {
          open = preferred;
        } else {
          const preferredHasBalance = preferred.some((d) => {
            const bal = subMoney(
              addMoney(d.amountDue, d.penaltyAmount),
              d.amountPaid,
            );
            return cmpMoney(bal, "0") > 0;
          });
          if (preferredHasBalance) open = preferred;
        }
      }

      const claim = payment;
      let remaining = money(claim.amount);
      const allocations: PaymentAllocation[] = [];
      const allocatedIds: string[] = [];

      async function applyToCharges(charges: DuesCharge[]) {
        for (const charge of charges) {
          if (cmpMoney(remaining, "0") <= 0) break;
          const bal = subMoney(
            addMoney(charge.amountDue, charge.penaltyAmount),
            charge.amountPaid,
          );
          if (cmpMoney(bal, "0") <= 0) continue;
          const apply = cmpMoney(remaining, bal) <= 0 ? remaining : bal;
          const alloc: PaymentAllocation = {
            id: createId("alloc"),
            paymentId: claim.id,
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
      }

      await applyToCharges(open);

      // Soft path: spill leftover to other open dues on the lot.
      if (
        !strictPreferred &&
        cmpMoney(remaining, "0") > 0 &&
        preferredIds.length > 0 &&
        open !== allOpen
      ) {
        const rest = allOpen.filter((d) => !allocatedIds.includes(d.id));
        await applyToCharges(rest);
      }

      if (strictPreferred && cmpMoney(remaining, "0") > 0) {
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
        allocatedDuesIds:
          allocatedIds.length > 0 ? allocatedIds : payment.allocatedDuesIds,
        updatedAt: nowIso(),
        notes:
          allocations.length === 0 &&
          !(payment.notes ?? "").includes("[unallocated]")
            ? `${payment.notes ?? ""} [unallocated credit]`.trim()
            : payment.notes,
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

    async monthlyPaymentProgress(year) {
      const cfg = await this.getSiteConfig();
      const activeLots = await db.lots.filter((l) => l.isActive).toArray();
      const expected = money(
        Number(cfg.monthlyDuesAmount) * Math.max(activeLots.length, 1),
      );
      const payments = await db.payments
        .filter((p) => p.status === "verified" && !p.isVoid && !!p.verifiedAt)
        .toArray();
      const dues = await db.dues
        .filter((d) => d.periodYear === year && d.status !== "waived")
        .toArray();

      return Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthPayments = payments.filter((p) => {
          const d = new Date(p.verifiedAt!);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const received = monthPayments.reduce(
          (s, p) => addMoney(s, p.amount),
          "0.00",
        );
        const billed = dues
          .filter((d) => d.periodMonth === month)
          .reduce(
            (s, d) => addMoney(s, addMoney(d.amountDue, d.penaltyAmount)),
            "0.00",
          );
        const expectedNum = Number(expected);
        const progressPct =
          expectedNum > 0
            ? Math.round((Number(received) / expectedNum) * 1000) / 10
            : null;
        return {
          year,
          month,
          received,
          expected,
          billed,
          paymentCount: monthPayments.length,
          progressPct,
        };
      });
    },

    async listAuditLogs(limit = 100) {
      const rows = await db.auditLogs.orderBy("timestamp").reverse().toArray();
      return rows.slice(0, limit);
    },

    async listAnnouncements() {
      const rows = await db.announcements.toArray();
      return rows.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.publishedAt.localeCompare(a.publishedAt);
      });
    },

    async createAnnouncement(input, actor) {
      if (!canPostNotice(actor)) {
        throw new Error("Only officers or the treasurer can post announcements.");
      }
      const row: Announcement = {
        id: createId("ann"),
        title: input.title.trim(),
        body: input.body.trim(),
        pinned: Boolean(input.pinned),
        eventDate: input.eventDate?.trim() || null,
        photos: cleanPhotos(input.photos),
        authorUserId: actor.userId,
        authorName: actor.fullName,
        publishedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      if (!row.title || !row.body) throw new Error("Title and body are required.");
      await db.announcements.add(row);
      return row;
    },

    async updateAnnouncement(id, patch, actor) {
      if (!canPostNotice(actor)) {
        throw new Error("Only officers or the treasurer can edit announcements.");
      }
      const before = await db.announcements.get(id);
      if (!before) throw new Error("Announcement not found.");
      const after: Announcement = {
        ...before,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : before.title,
        body: patch.body !== undefined ? patch.body.trim() : before.body,
        eventDate:
          patch.eventDate !== undefined
            ? patch.eventDate?.trim() || null
            : before.eventDate ?? null,
        updatedAt: nowIso(),
      };
      await db.announcements.put(after);
      return after;
    },

    async addEventPhotos(id, input, actor) {
      if (!canPostNotice(actor)) {
        throw new Error("Only officers or the treasurer can edit announcements.");
      }
      const before = await db.announcements.get(id);
      if (!before?.eventDate) throw new Error("That event was not found.");
      const incoming = cleanPhotos(input.photos);
      if (incoming.length === 0) throw new Error("Add at least one photo.");
      const photos = [...(before.photos ?? []), ...incoming];
      if (photos.length > 4) throw new Error("An announcement can hold up to 4 photos.");
      const note = input.note?.trim();
      const after: Announcement = {
        ...before,
        photos,
        body: note ? `${before.body}\n\n${note}` : before.body,
        updatedAt: nowIso(),
      };
      await db.announcements.put(after);
      return after;
    },

    async deleteAnnouncement(id, actor) {
      if (!canPostNotice(actor)) {
        throw new Error("Only officers or the treasurer can delete announcements.");
      }
      const marks = await db.attendances.where("eventId").equals(id).primaryKeys();
      if (marks.length) await db.attendances.bulkDelete(marks);
      await db.announcements.delete(id);
    },

    async listEventAttendance(eventId) {
      const rows = await db.attendances.where("eventId").equals(eventId).toArray();
      return rows.sort((a, b) => a.lotCode.localeCompare(b.lotCode));
    },

    async setEventPresent(eventId, lotId, present, actor) {
      if (!canPostNotice(actor)) {
        throw new Error("Only officers or the treasurer can take attendance.");
      }
      const event = await db.announcements.get(eventId);
      if (!event?.eventDate) throw new Error("That event was not found.");
      const lot = await db.lots.get(lotId);
      if (!lot?.isActive) throw new Error("That lot is not active.");
      const existing = await db.attendances
        .where("[eventId+lotId]")
        .equals([eventId, lotId])
        .first();
      if (!present) {
        if (existing) await db.attendances.delete(existing.id);
        return null;
      }
      if (existing) return existing;
      const row: EventAttendance = {
        id: createId("att"),
        eventId,
        lotId: lot.id,
        lotCode: lot.lotCode,
        householdName: lot.householdName,
        markedByUserId: actor.userId,
        markedByName: actor.fullName,
        markedAt: nowIso(),
      };
      await db.attendances.add(row);
      return row;
    },

    async listDocuments() {
      const rows = await db.documents.toArray();
      const order = { house_rules: 0, deed: 1, minutes: 2 } as const;
      return rows.sort((a, b) => {
        const cat = order[a.category] - order[b.category];
        if (cat !== 0) return cat;
        return b.publishedAt.localeCompare(a.publishedAt);
      });
    },

    async createDocument(input, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can post documents.");
      }
      const title = input.title.trim();
      if (!title) throw new Error("Title is required.");
      const id = createId("doc");
      let storageKey: string | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;
      if (input.file) {
        storageKey = `documents/${id}`;
        fileName = input.file.name;
        mimeType = input.file.type || "application/octet-stream";
        await files.put(storageKey, input.file, { fileName, mimeType });
      }
      const row: HoaDocument = {
        id,
        category: input.category,
        title,
        notes: input.notes?.trim() ?? "",
        fileName,
        mimeType,
        storageKey,
        publishedAt: nowIso(),
        authorUserId: actor.userId,
        authorName: actor.fullName,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.documents.add(row);
      return row;
    },

    async deleteDocument(id, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can remove documents.");
      }
      const row = await db.documents.get(id);
      if (!row) return;
      if (row.storageKey) await files.remove(row.storageKey);
      await db.documents.delete(id);
    },

    async listFeedback(filter) {
      let rows = await db.feedbackItems.toArray();
      if (filter?.type) rows = rows.filter((r) => r.type === filter.type);
      if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createFeedback(input, actor) {
      let lotCode: string | null = null;
      if (input.lotId) {
        const lot = await db.lots.get(input.lotId);
        if (!lot) throw new Error("Lot not found.");
        lotCode = lot.lotCode;
      }
      const row: FeedbackItem = {
        id: createId("fb"),
        type: input.type,
        subject: input.subject.trim(),
        body: input.body.trim(),
        status: "open",
        lotId: input.lotId ?? null,
        lotCode,
        authorUserId: actor.userId,
        authorName: actor.fullName,
        replies: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      if (!row.subject || !row.body) {
        throw new Error("Subject and details are required.");
      }
      await db.feedbackItems.add(row);
      return row;
    },

    async updateFeedbackStatus(id, status, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can update feedback status.");
      }
      const before = await db.feedbackItems.get(id);
      if (!before) throw new Error("Feedback not found.");
      const after: FeedbackItem = {
        ...before,
        status,
        updatedAt: nowIso(),
      };
      await db.feedbackItems.put(after);
      return after;
    },

    async replyToFeedback(id, body, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can reply.");
      }
      const before = await db.feedbackItems.get(id);
      if (!before) throw new Error("Feedback not found.");
      const reply: FeedbackReply = {
        id: createId("fbr"),
        authorUserId: actor.userId,
        authorName: actor.fullName,
        body: body.trim(),
        createdAt: nowIso(),
      };
      if (!reply.body) throw new Error("Reply cannot be empty.");
      const after: FeedbackItem = {
        ...before,
        replies: [...before.replies, reply],
        status: before.status === "open" ? "in_progress" : before.status,
        updatedAt: nowIso(),
      };
      await db.feedbackItems.put(after);
      return after;
    },

    async listHoaPlans() {
      const rows = await db.hoaPlans.toArray();
      const rank = { in_progress: 0, planned: 1, done: 2 } as const;
      return rows.sort(
        (a, b) =>
          rank[a.status] - rank[b.status] ||
          b.updatedAt.localeCompare(a.updatedAt),
      );
    },

    async createHoaPlan(input, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can create plans.");
      }
      const row: HoaPlan = {
        id: createId("plan"),
        title: input.title.trim(),
        description: input.description.trim(),
        status: input.status ?? "planned",
        progressPct: Math.min(100, Math.max(0, input.progressPct ?? 0)),
        updates: [],
        authorUserId: actor.userId,
        authorName: actor.fullName,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      if (!row.title || !row.description) {
        throw new Error("Title and description are required.");
      }
      await db.hoaPlans.add(row);
      return row;
    },

    async updateHoaPlan(id, patch, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can update plans.");
      }
      const before = await db.hoaPlans.get(id);
      if (!before) throw new Error("Plan not found.");
      const after: HoaPlan = {
        ...before,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : before.title,
        description:
          patch.description !== undefined
            ? patch.description.trim()
            : before.description,
        progressPct:
          patch.progressPct !== undefined
            ? Math.min(100, Math.max(0, patch.progressPct))
            : before.progressPct,
        updatedAt: nowIso(),
      };
      await db.hoaPlans.put(after);
      return after;
    },

    async addHoaPlanUpdate(id, body, actor) {
      if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
        throw new Error("Only officers or the treasurer can post plan updates.");
      }
      const before = await db.hoaPlans.get(id);
      if (!before) throw new Error("Plan not found.");
      const update: HoaPlanUpdate = {
        id: createId("plu"),
        body: body.trim(),
        authorUserId: actor.userId,
        authorName: actor.fullName,
        createdAt: nowIso(),
      };
      if (!update.body) throw new Error("Update cannot be empty.");
      const after: HoaPlan = {
        ...before,
        updates: [update, ...before.updates],
        updatedAt: nowIso(),
      };
      await db.hoaPlans.put(after);
      return after;
    },

    async ensureElection(actor) {
      let election = await db.elections.get(ELECTION_ID);
      if (!election) {
        const ts = nowIso();
        election = {
          id: ELECTION_ID,
          year: ELECTION_YEAR,
          title: "CPI-1 HOA election of officers",
          status: "open",
          createdAt: ts,
          updatedAt: ts,
        };
        await db.elections.add(election);
        await db.electionContests.bulkAdd(buildElectionContests(election.id));
      }
      const lots = await db.lots.filter((lot) => lot.isActive).toArray();
      const existing = await db.voterAssignments
        .where("electionId")
        .equals(election.id)
        .toArray();
      const have = new Set(existing.map((row) => row.lotId));
      const missing: VoterAssignment[] = lots
        .filter((lot) => !have.has(lot.id))
        .map((lot) => ({
          id: createId("voter"),
          electionId: election!.id,
          lotId: lot.id,
          lotCode: lot.lotCode,
          householdName: lot.householdName,
          block: lot.block || "",
          eligible: true,
          assignedByUserId: "system",
          updatedAt: nowIso(),
        }));
      if (missing.length) await db.voterAssignments.bulkAdd(missing);
      return electionView(db, actor);
    },

    async setElectionStatus(status, actor) {
      if (!canManageElection(actor)) {
        throw new Error("Only officers or the treasurer can open or close voting.");
      }
      const election = await db.elections.get(ELECTION_ID);
      if (!election) throw new Error("Election not found.");
      const after: Election = { ...election, status, updatedAt: nowIso() };
      await db.elections.put(after);
      await writeAudit(db, {
        entity: "config",
        entityId: election.id,
        action: "update",
        before: election as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: `Voting ${status}`,
      });
      return electionView(db, actor);
    },

    async setVoterAssignment(input, actor) {
      if (!canManageElection(actor)) {
        throw new Error("Only officers or the treasurer can assign voters.");
      }
      const election = await db.elections.get(ELECTION_ID);
      if (!election) throw new Error("Election not found.");
      const lot = await db.lots.get(input.lotId);
      if (!lot) throw new Error("Lot not found.");
      const block = input.block.trim();
      if (!block) throw new Error("Assign a block so the lot knows which block leader to vote for.");
      const ballot = await db.ballots
        .where("[electionId+lotId]")
        .equals([election.id, lot.id])
        .first();
      if (ballot) {
        throw new Error("This lot already voted. The assignment is locked.");
      }
      const current = await db.voterAssignments
        .where("[electionId+lotId]")
        .equals([election.id, lot.id])
        .first();
      const row: VoterAssignment = {
        id: current?.id ?? createId("voter"),
        electionId: election.id,
        lotId: lot.id,
        lotCode: lot.lotCode,
        householdName: lot.householdName,
        block,
        eligible: input.eligible,
        assignedByUserId: actor.userId,
        updatedAt: nowIso(),
      };
      await db.voterAssignments.put(row);
      return electionView(db, actor);
    },

    async castBallot(input, actor) {
      const election = await db.elections.get(ELECTION_ID);
      if (!election) throw new Error("Election not found.");
      if (election.status !== "open") {
        throw new Error("Voting is not open.");
      }
      if (!actor.lotIds.includes(input.lotId)) {
        throw new Error("You can only vote for your own lot.");
      }
      const assignment = await db.voterAssignments
        .where("[electionId+lotId]")
        .equals([election.id, input.lotId])
        .first();
      if (!assignment?.eligible) {
        throw new Error("This lot is not assigned to vote.");
      }
      const existing = await db.ballots
        .where("[electionId+lotId]")
        .equals([election.id, input.lotId])
        .first();
      if (existing) throw new Error("This lot has already voted.");

      const contests = await db.electionContests
        .where("electionId")
        .equals(election.id)
        .toArray();
      const required = contestsForBlock(contests, assignment.block);
      const requiredIds = new Set(required.map((contest) => contest.id));
      const seen = new Set<string>();
      for (const choice of input.choices) {
        if (!requiredIds.has(choice.contestId)) {
          throw new Error("Ballot includes a contest this lot cannot vote in.");
        }
        if (choice.choice !== "for" && choice.choice !== "abstain") {
          throw new Error("Each vote must be for the candidate or an abstention.");
        }
        if (seen.has(choice.contestId)) throw new Error("Duplicate contest on the ballot.");
        seen.add(choice.contestId);
      }
      if (seen.size !== requiredIds.size) {
        throw new Error("Vote on every contest assigned to this lot.");
      }

      const ballot: Ballot = {
        id: createId("ballot"),
        electionId: election.id,
        lotId: input.lotId,
        voterUserId: actor.userId,
        voterName: actor.fullName,
        choices: input.choices.map((choice) => ({
          contestId: choice.contestId,
          choice: choice.choice as VoteChoice,
        })),
        submittedAt: nowIso(),
      };
      await db.ballots.add(ballot);
      await writeAudit(db, {
        entity: "config",
        entityId: ballot.id,
        action: "create",
        before: null,
        after: { lotId: ballot.lotId, electionId: ballot.electionId },
        actorUserId: actor.userId,
        actorName: actor.fullName,
        note: "Ballot submitted. Choices are not stored in the audit log.",
      });
      return electionView(db, actor);
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
        db.announcements.clear(),
        db.feedbackItems.clear(),
        db.hoaPlans.clear(),
        db.elections.clear(),
        db.electionContests.clear(),
        db.voterAssignments.clear(),
        db.ballots.clear(),
        db.documents.clear(),
        db.attendances.clear(),
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
        announcements: await db.announcements.toArray(),
        feedbackItems: await db.feedbackItems.toArray(),
        hoaPlans: await db.hoaPlans.toArray(),
        elections: await db.elections.toArray(),
        electionContests: await db.electionContests.toArray(),
        voterAssignments: await db.voterAssignments.toArray(),
        ballots: await db.ballots.toArray(),
        documents: await db.documents.toArray(),
        attendances: await db.attendances.toArray(),
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
      if (bundle.announcements?.length) {
        await db.announcements.bulkPut(bundle.announcements);
      }
      if (bundle.feedbackItems?.length) {
        await db.feedbackItems.bulkPut(bundle.feedbackItems);
      }
      if (bundle.hoaPlans?.length) {
        await db.hoaPlans.bulkPut(bundle.hoaPlans);
      }
      if (bundle.elections?.length) await db.elections.bulkPut(bundle.elections);
      if (bundle.electionContests?.length) {
        await db.electionContests.bulkPut(bundle.electionContests);
      }
      if (bundle.voterAssignments?.length) {
        await db.voterAssignments.bulkPut(bundle.voterAssignments);
      }
      if (bundle.ballots?.length) await db.ballots.bulkPut(bundle.ballots);
      if (bundle.documents?.length) await db.documents.bulkPut(bundle.documents);
      if (bundle.attendances?.length) await db.attendances.bulkPut(bundle.attendances);
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

function canPostNotice(actor: Session): boolean {
  return (
    actor.roles.includes("officer") ||
    actor.roles.includes("treasurer") ||
    actor.roles.includes("admin")
  );
}

function cleanPhotos(photos: AnnouncementPhoto[] | undefined): AnnouncementPhoto[] {
  const rows = photos ?? [];
  if (rows.length > 4) throw new Error("An announcement can hold up to 4 photos.");
  return rows.map((photo) => {
    const dataUrl = photo.dataUrl.trim();
    if (!dataUrl.startsWith("data:image/") || dataUrl.length > 200_000) {
      throw new Error("That photo is too large. Choose a smaller one.");
    }
    return {
      id: photo.id,
      mimeType: photo.mimeType || "image/jpeg",
      dataUrl,
    };
  });
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
