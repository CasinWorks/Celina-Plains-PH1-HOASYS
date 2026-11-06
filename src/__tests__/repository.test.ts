import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIndexedDbAuthService } from "../adapters/indexeddb/authService";
import {
  createTestDb,
  type HoaDatabase,
} from "../adapters/indexeddb/db";
import { createIndexedDbFileStorage } from "../adapters/indexeddb/fileStorage";
import {
  assertPaymentNotHardDeleted,
  createIndexedDbRepository,
} from "../adapters/indexeddb/repository";
import { contestsForBlock } from "../content/election2026";
import { formatPeso } from "../domain/money";
import type { Session } from "../domain/types";
import type { AuthService, HoaRepository } from "../services/interfaces";
import { DEMO_PASSWORD, DEMO_USERS } from "../lib/config";
import { clearSessionStorage } from "../adapters/indexeddb/authService";

describe("IndexedDB repository (Phase 1 money flows)", () => {
  let db: HoaDatabase;
  let repo: HoaRepository;
  let auth: AuthService;
  let treasurer: Session;
  let homeowner: Session;

  beforeEach(async () => {
    clearSessionStorage();
    db = createTestDb(`hoa_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const files = createIndexedDbFileStorage(db);
    repo = createIndexedDbRepository(db, files);
    auth = createIndexedDbAuthService(db);
    await repo.seedDemoData(true);
    treasurer = await auth.login(
      DEMO_USERS.treasurer.username,
      DEMO_PASSWORD,
    );
    homeowner = await auth.login(
      DEMO_USERS.homeowner.username,
      DEMO_PASSWORD,
    );
  });

  afterEach(async () => {
    clearSessionStorage();
    db.close();
    await db.delete();
  });

  it("holds a homeowner application until an officer verifies it", async () => {
    await auth.logout();
    await auth.applyForHomeowner({
      fullName: "Ana Reyes",
      username: "Ana.Reyes",
      password: "house1234",
      mobile: "09170000000",
      lotCode: "b3-l12",
    });
    const pending = (await repo.listUsers()).find((row) => row.username === "ana.reyes");
    expect(pending?.approvalStatus).toBe("pending");
    expect(pending?.isActive).toBe(false);
    expect(pending?.lotIds).toEqual([]);
    expect((await repo.listLots()).some((row) => row.lotCode === "B3-L12")).toBe(false);
    await expect(auth.login("ana.reyes", "house1234")).rejects.toThrow(/verify/i);
    const officer = await auth.login(DEMO_USERS.officer.username, DEMO_PASSWORD);
    const approved = await repo.approveHomeownerApplication(pending!.id, officer);
    expect(approved.approvalStatus).toBe("approved");
    const lot = (await repo.listLots()).find((row) => row.lotCode === "B3-L12");
    expect(lot?.householdName).toBe("Ana Reyes");
    expect(lot?.residentUserIds).toContain(approved.id);
    await auth.logout();
    const session = await auth.login("ana.reyes", "house1234");
    expect(session.userId).toBe(approved.id);
    expect(session.lotIds).toEqual([lot!.id]);
  });

  it("links a verified application to an existing lot", async () => {
    await auth.logout();
    const before = (await repo.listLots()).find((row) => row.lotCode === "B1-L02")!;
    await auth.applyForHomeowner({
      fullName: "New Resident",
      username: "new.resident",
      password: "house1234",
      mobile: "",
      lotCode: "b1-l02",
    });
    expect((await repo.getLot(before.id))?.residentUserIds).toEqual(before.residentUserIds);
    const pending = (await repo.listUsers()).find((row) => row.username === "new.resident")!;
    const officer = await auth.login(DEMO_USERS.officer.username, DEMO_PASSWORD);
    const approved = await repo.approveHomeownerApplication(pending.id, officer);
    const after = await repo.getLot(before.id);
    expect(after?.householdName).toBe(before.householdName);
    expect(after?.residentUserIds).toContain(approved.id);
    expect(approved.lotIds).toEqual([before.id]);
    await expect(
      auth.applyForHomeowner({
        fullName: "Other Person",
        username: "new.resident",
        password: "house1234",
        mobile: "",
        lotCode: "B9-L01",
      }),
    ).rejects.toThrow(/already registered/i);
    await expect(
      repo.approveHomeownerApplication(pending.id, homeowner),
    ).rejects.toThrow(/officer/i);
  });

  it("lets an admin grant officer access and keeps the homeowner role", async () => {
    const homeownerUser = (await repo.listUsers()).find(
      (user) => user.username === DEMO_USERS.homeowner.username,
    )!;
    const admin: Session = {
      userId: "user_admin",
      username: "admin",
      fullName: "HOA Admin",
      roles: ["admin"],
      lotIds: [],
      consentPrivacyAt: new Date().toISOString(),
      loggedInAt: new Date().toISOString(),
    };
    const granted = await repo.setMemberAccess(
      homeownerUser.id,
      { officer: true, treasurer: false },
      admin,
    );
    expect(granted.roles).toEqual(["homeowner", "officer"]);
    const removed = await repo.setMemberAccess(
      homeownerUser.id,
      { officer: false, treasurer: true },
      admin,
    );
    expect(removed.roles).toEqual(["homeowner", "treasurer"]);
    await expect(
      repo.setMemberAccess(
        homeownerUser.id,
        { officer: true, treasurer: false },
        homeowner,
      ),
    ).rejects.toThrow(/admin/i);
  });

  it("lets an officer add a homeowner without taking over the session", async () => {
    const officer = await auth.login(DEMO_USERS.officer.username, DEMO_PASSWORD);
    const added = await auth.provisionHomeowner(
      {
        fullName: "Lot Neighbor",
        username: "lot.neighbor",
        password: "house1234",
        mobile: "",
        lotCode: "B2-L05",
      },
      officer,
    );
    expect(added.roles).toEqual(["homeowner"]);
    const still = await auth.getSession();
    expect(still?.username).toBe(DEMO_USERS.officer.username);
    await expect(
      auth.provisionHomeowner(
        {
          fullName: "Blocked",
          username: "blocked.person",
          password: "house1234",
          mobile: "",
          lotCode: "B2-L05",
        },
        homeowner,
      ),
    ).rejects.toThrow(/officer/i);
  });

  it("seeds demo users for each role and sample lots/dues", async () => {
    const users = await repo.listUsers();
    expect(users.map((u) => u.username).sort()).toEqual(
      [
        DEMO_USERS.homeowner.username,
        DEMO_USERS.officer.username,
        DEMO_USERS.treasurer.username,
      ].sort(),
    );
    const lots = await repo.listLots();
    expect(lots.length).toBeGreaterThanOrEqual(3);
    expect(
      lots.every(
        (l) => l.notes.includes("DEMO") || l.householdName.includes("DEMO"),
      ),
    ).toBe(true);
    const dues = await repo.listDues();
    expect(dues.length).toBeGreaterThan(0);
  });

  it("computes penalty from site config grace + rate", async () => {
    const cfg = await repo.getSiteConfig();
    expect(cfg.monthlyDuesAmount).toBe("500.00");
    const created = await repo.openDuesPeriod(2025, 1, treasurer);
    expect(created.length).toBeGreaterThan(0);
    const updated = await repo.applyPenalties("2025-03-01", treasurer);
    expect(updated).toBeGreaterThan(0);
    const charge = (await repo.listDues()).find(
      (d) => d.periodYear === 2025 && d.periodMonth === 1,
    )!;
    expect(charge.penaltyAmount).toBe("25.00");
  });

  it("homeowner payment stays pending until treasurer verifies with OR", async () => {
    const lotId = homeowner.lotIds[0]!;
    const blob = new Blob(["fake-proof"], { type: "image/png" });
    const payment = await repo.submitPayment(
      {
        lotId,
        amount: "500.00",
        method: "gcash",
        payerReference: "TEST-1",
        notes: "",
        proofBlob: blob,
        proofFileName: "proof.png",
        proofMimeType: "image/png",
      },
      homeowner,
    );
    expect(payment.status).toBe("pending");

    await expect(
      repo.verifyPayment(payment.id, "OR-99", homeowner),
    ).rejects.toThrow(/treasurer/i);

    const verified = await repo.verifyPayment(
      payment.id,
      "OR-TEST-99",
      treasurer,
    );
    expect(verified.status).toBe("verified");
    expect(verified.orNumber).toBe("OR-TEST-99");
    const dues = await repo.listDues({ lotId });
    expect(
      dues.some((d) => d.status === "paid" || d.status === "partial"),
    ).toBe(true);
  });

  it("rejects over-allocation when specific dues selected", async () => {
    const lotId = homeowner.lotIds[0]!;
    const open = (await repo.listDues({ lotId })).find(
      (d) => d.status === "unpaid",
    )!;
    const blob = new Blob(["x"], { type: "image/png" });
    const payment = await repo.submitPayment(
      {
        lotId,
        amount: "9999.00",
        method: "cash",
        payerReference: "",
        notes: "",
        proofBlob: blob,
        proofFileName: "x.png",
        proofMimeType: "image/png",
        intendedDuesIds: [open.id],
      },
      homeowner,
    );
    await expect(
      repo.verifyPayment(payment.id, "OR-OVER", treasurer, [open.id]),
    ).rejects.toThrow(/exceeds/i);
  });

  it("verifies seeded demo pending payment with an OR number", async () => {
    const pending = (await repo.listPayments({ status: "pending" }))[0];
    expect(pending).toBeTruthy();
    const verified = await repo.verifyPayment(pending!.id, "21", treasurer);
    expect(verified.status).toBe("verified");
    expect(verified.orNumber).toBe("21");
  });

  it("falls back to other open dues when intended dues are already paid", async () => {
    const lotId = homeowner.lotIds[0]!;
    const open = (await repo.listDues({ lotId })).filter(
      (d) => d.status === "unpaid" || d.status === "partial",
    );
    expect(open.length).toBeGreaterThanOrEqual(1);
    const intended = open[0]!;
    // Mark intended as paid so soft verify must fall back (or credit).
    await db.dues.put({
      ...intended,
      amountPaid: intended.amountDue,
      status: "paid",
      updatedAt: new Date().toISOString(),
    });

    const blob = new Blob(["proof"], { type: "image/png" });
    const payment = await repo.submitPayment(
      {
        lotId,
        amount: "100.00",
        method: "gcash",
        payerReference: "SOFT",
        notes: "",
        proofBlob: blob,
        proofFileName: "p.png",
        proofMimeType: "image/png",
        intendedDuesIds: [intended.id],
      },
      homeowner,
    );

    const verified = await repo.verifyPayment(payment.id, "OR-SOFT", treasurer);
    expect(verified.status).toBe("verified");
    expect(verified.orNumber).toBe("OR-SOFT");
  });

  it("blocks homeowner submitting payment for another lot", async () => {
    const allLots = await repo.listLots();
    const other = allLots.find((l) => !homeowner.lotIds.includes(l.id))!;
    const blob = new Blob(["x"], { type: "image/png" });
    await expect(
      repo.submitPayment(
        {
          lotId: other.id,
          amount: "100.00",
          method: "cash",
          payerReference: "",
          notes: "",
          proofBlob: blob,
          proofFileName: "x.png",
          proofMimeType: "image/png",
        },
        homeowner,
      ),
    ).rejects.toThrow(/own lot/i);
  });

  it("expense update creates audit log entry", async () => {
    const expense = await repo.createExpense(
      {
        expenseDate: "2026-10-10",
        category: "admin",
        amount: "100.00",
        payee: "Office Supply Demo",
        description: "Paper",
      },
      treasurer,
    );
    await repo.updateExpense(expense.id, { amount: "150.00" }, treasurer);
    const logs = await repo.listAuditLogs();
    expect(
      logs.some(
        (l) =>
          l.entity === "expense" &&
          l.entityId === expense.id &&
          l.action === "update",
      ),
    ).toBe(true);
  });

  it("month statement totals match verified payments and posted expenses", async () => {
    const statement = await repo.monthStatement(2026, 10);
    const payments = (await repo.listPayments()).filter(
      (p) =>
        p.status === "verified" &&
        !p.isVoid &&
        p.verifiedAt &&
        new Date(p.verifiedAt).getFullYear() === 2026 &&
        new Date(p.verifiedAt).getMonth() + 1 === 10,
    );
    const expenses = (await repo.listExpenses()).filter(
      (e) => e.status === "posted" && e.expenseDate.startsWith("2026-10"),
    );
    const paySum = payments.reduce((s, p) => s + Number(p.amount), 0);
    const expSum = expenses.reduce((s, e) => s + Number(e.amount), 0);
    expect(Number(statement.collections)).toBeCloseTo(paySum, 2);
    expect(Number(statement.expenses)).toBeCloseTo(expSum, 2);
  });

  it("disallows hard-delete policy for verified payments", () => {
    expect(() =>
      assertPaymentNotHardDeleted({
        id: "x",
        paymentNo: "PAY-1",
        lotId: "l",
        lotCode: "B1",
        payerUserId: "u",
        payerName: "n",
        amount: "1.00",
        method: "cash",
        payerReference: "",
        proofStorageKey: null,
        proofFileName: null,
        proofMimeType: null,
        status: "verified",
        orNumber: "OR-1",
        verifiedByUserId: "t",
        verifiedAt: new Date().toISOString(),
        rejectionReason: "",
        notes: "",
        isVoid: false,
        voidReason: "",
        voidedAt: null,
        voidedByUserId: null,
        allocatedDuesIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toThrow(/void/i);
  });

  it("formats pesos with en-PH currency style", () => {
    expect(formatPeso("500.00")).toMatch(/₱/);
    expect(formatPeso("500.00")).toContain("500");
  });

  it("homeowner summary has aggregates only", async () => {
    const summary = await repo.homeownerFinanceSummary();
    expect(summary).toHaveProperty("collectionsThisMonth");
    expect(summary).toHaveProperty("expensesThisMonth");
    expect(summary).toHaveProperty("communityArrears");
    expect(summary).not.toHaveProperty("payments");
    expect(summary).not.toHaveProperty("residents");
  });

  it("assigns voters and accepts one secret ballot per lot", async () => {
    const opened = await repo.ensureElection(treasurer);
    expect(opened.election.status).toBe("open");
    expect(opened.roll?.length).toBeGreaterThan(0);

    const lotId = homeowner.lotIds[0]!;
    await repo.setVoterAssignment(
      { lotId, eligible: false, block: "9" },
      treasurer,
    );
    const denied = await repo.ensureElection(homeowner);
    const contests = contestsForBlock(
      denied.contests,
      denied.myAssignments[0]!.block,
    );
    await expect(
      repo.castBallot(
        {
          lotId,
          choices: contests.map((contest) => ({
            contestId: contest.id,
            choice: "for" as const,
          })),
        },
        homeowner,
      ),
    ).rejects.toThrow(/not assigned/i);

    await repo.setVoterAssignment(
      { lotId, eligible: true, block: "1" },
      treasurer,
    );
    const ready = await repo.ensureElection(homeowner);
    const ballotContests = contestsForBlock(
      ready.contests,
      ready.myAssignments[0]!.block,
    );
    const voted = await repo.castBallot(
      {
        lotId,
        choices: ballotContests.map((contest) => ({
          contestId: contest.id,
          choice: "for" as const,
        })),
      },
      homeowner,
    );
    expect(voted.myBallots).toHaveLength(1);
    expect(voted.roll).toBeNull();
    const tally = voted.tallies.find(
      (row) => row.contestId === ballotContests[0]!.id,
    );
    expect(tally?.votesFor).toBe(1);

    await expect(
      repo.castBallot(
        {
          lotId,
          choices: ballotContests.map((contest) => ({
            contestId: contest.id,
            choice: "abstain" as const,
          })),
        },
        homeowner,
      ),
    ).rejects.toThrow(/already/i);

    await expect(
      repo.setVoterAssignment(
        { lotId, eligible: false, block: "1" },
        treasurer,
      ),
    ).rejects.toThrow(/locked/i);

    await expect(
      repo.setVoterAssignment({ lotId, eligible: true, block: "1" }, homeowner),
    ).rejects.toThrow(/officers or the treasurer/i);
  });

  it("stores photos on a dated announcement", async () => {
    const officer = await auth.login(DEMO_USERS.officer.username, DEMO_PASSWORD);
    const photo = {
      id: "photo_1",
      mimeType: "image/jpeg",
      dataUrl: "data:image/jpeg;base64,aaaa",
    };
    const row = await repo.createAnnouncement(
      {
        title: "Street cleanup",
        body: "Photos from the morning.",
        eventDate: "2026-11-06",
        photos: [photo],
      },
      officer,
    );
    expect(row.photos).toEqual([photo]);
    const listed = await repo.listAnnouncements();
    expect(listed.find((item) => item.id === row.id)?.photos).toEqual([photo]);
    await expect(
      repo.createAnnouncement(
        {
          title: "Too many",
          body: "Five photos.",
          photos: Array.from({ length: 5 }, (_, index) => ({
            ...photo,
            id: `photo_${index}`,
          })),
        },
        officer,
      ),
    ).rejects.toThrow(/4 photos/i);
    const added = await repo.addEventPhotos(
      row.id,
      {
        photos: [{ ...photo, id: "photo_2" }],
        note: "The street was cleared by noon.",
      },
      officer,
    );
    expect(added.photos).toHaveLength(2);
    expect(added.body).toContain("The street was cleared by noon.");
  });

  it("lets an officer tap a lot present for one event", async () => {
    const officer = await auth.login(DEMO_USERS.officer.username, DEMO_PASSWORD);
    const event = (await repo.listAnnouncements()).find((row) => row.eventDate);
    const lot = (await repo.listLots()).find((row) => row.isActive);
    expect(event).toBeTruthy();
    expect(lot).toBeTruthy();
    const marked = await repo.setEventPresent(event!.id, lot!.id, true, officer);
    expect(marked?.lotId).toBe(lot!.id);
    expect(await repo.listEventAttendance(event!.id)).toHaveLength(1);
    await repo.setEventPresent(event!.id, lot!.id, true, officer);
    expect(await repo.listEventAttendance(event!.id)).toHaveLength(1);
    expect(await repo.setEventPresent(event!.id, lot!.id, false, officer)).toBeNull();
    expect(await repo.listEventAttendance(event!.id)).toHaveLength(0);
    await expect(
      repo.setEventPresent(event!.id, lot!.id, true, homeowner),
    ).rejects.toThrow(/officers or the treasurer/i);
    await repo.setEventPresent(event!.id, lot!.id, true, officer);
    await repo.deleteAnnouncement(event!.id, officer);
    expect(await repo.listEventAttendance(event!.id)).toHaveLength(0);
  });

  it("builds monthly payment progress series for officer charts", async () => {
    const series = await repo.monthlyPaymentProgress(2026);
    expect(series).toHaveLength(12);
    const september = series.find((r) => r.month === 9)!;
    expect(Number(september.received)).toBeGreaterThan(0);
    expect(september.paymentCount).toBeGreaterThan(0);
    expect(september.progressPct).not.toBeNull();
    const empty = series.find((r) => r.month === 1)!;
    expect(empty.received).toBe("0.00");
    expect(empty.paymentCount).toBe(0);
  });
});
