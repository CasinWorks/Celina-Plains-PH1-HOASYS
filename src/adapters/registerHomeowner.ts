import type { Session, UserAccount } from "../domain/types";
import { createId, nowIso } from "../lib/ids";
import type { HoaDatabase } from "./indexeddb/db";

export const PENDING_APPLICATION =
  "An officer still needs to verify this application.";
export const REJECTED_APPLICATION = "This application was not verified.";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeLotCode(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function createHomeownerAccount(
  db: HoaDatabase,
  input: {
    fullName: string;
    username: string;
    password: string;
    mobile: string;
    lotCode: string;
    firebaseUid?: string;
    actor?: { userId: string; fullName: string };
  },
): Promise<UserAccount> {
  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  const lotCode = normalizeLotCode(input.lotCode);
  const mobile = input.mobile.trim();
  if (fullName.length < 2) throw new Error("Enter your full name.");
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error("Use letters and numbers, at least 3 characters.");
  }
  if (!input.firebaseUid && input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!lotCode) throw new Error("Enter the lot code.");

  const taken = await db.users.where("username").equals(username).first();
  if (taken) throw new Error("That username is already registered.");

  const now = nowIso();
  const userId = createId("user");
  const existing = (await db.lots.toArray()).find(
    (lot) => normalizeLotCode(lot.lotCode) === lotCode,
  );
  let lotId: string;
  if (existing) {
    lotId = existing.id;
    await db.lots.update(existing.id, {
      residentUserIds: Array.from(new Set([...existing.residentUserIds, userId])),
      updatedAt: now,
    });
  } else {
    lotId = createId("lot");
    const blockMatch = /^B(\d+)/i.exec(lotCode);
    await db.lots.add({
      id: lotId,
      lotCode,
      block: blockMatch?.[1] ?? "",
      street: "",
      householdName: fullName,
      residentUserIds: [userId],
      isActive: true,
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
  }

  const user: UserAccount = {
    id: userId,
    username,
    password: input.firebaseUid ? "" : input.password,
    firebaseUid: input.firebaseUid,
    fullName,
    mobile,
    roles: ["homeowner"],
    lotIds: [lotId],
    isActive: true,
    approvalStatus: "approved",
    consentPrivacyAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.users.add(user);
  await db.auditLogs.add({
    id: createId("audit"),
    entity: "user",
    entityId: userId,
    action: "create",
    before: null,
    after: { username, fullName, lotCode, roles: ["homeowner"] },
    actorUserId: input.actor?.userId ?? userId,
    actorName: input.actor?.fullName ?? fullName,
    note: input.actor ? "Officer added this homeowner" : "Homeowner registered",
    timestamp: now,
  });
  return user;
}

function assertApplicant(input: {
  fullName: string;
  username: string;
  password: string;
  lotCode: string;
}): { fullName: string; username: string; lotCode: string; mobile?: string } {
  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  const lotCode = normalizeLotCode(input.lotCode);
  if (fullName.length < 2) throw new Error("Enter your full name.");
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error("Use letters and numbers, at least 3 characters.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!lotCode) throw new Error("Enter the lot code.");
  return { fullName, username, lotCode };
}

function assertOfficer(actor: Session): void {
  if (!actor.roles.includes("officer") && !actor.roles.includes("treasurer")) {
    throw new Error("Only an officer or the treasurer can verify a homeowner.");
  }
}

/** A public application. The lot stays closed until an officer verifies it. */
export async function createHomeownerApplication(
  db: HoaDatabase,
  input: {
    fullName: string;
    username: string;
    password: string;
    mobile: string;
    lotCode: string;
    firebaseUid?: string;
  },
): Promise<UserAccount> {
  const checked = assertApplicant(input);
  const taken = await db.users.where("username").equals(checked.username).first();
  if (taken) throw new Error("That username is already registered.");
  const now = nowIso();
  const user: UserAccount = {
    id: createId("user"),
    username: checked.username,
    password: input.firebaseUid ? "" : input.password,
    firebaseUid: input.firebaseUid,
    fullName: checked.fullName,
    mobile: input.mobile.trim(),
    roles: ["homeowner"],
    lotIds: [],
    isActive: false,
    approvalStatus: "pending",
    requestedLotCode: checked.lotCode,
    consentPrivacyAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.users.add(user);
  await db.auditLogs.add({
    id: createId("audit"),
    entity: "user",
    entityId: user.id,
    action: "create",
    before: null,
    after: {
      username: user.username,
      fullName: user.fullName,
      lotCode: checked.lotCode,
      approvalStatus: "pending",
    },
    actorUserId: user.id,
    actorName: user.fullName,
    note: "Homeowner application",
    timestamp: now,
  });
  return user;
}

async function attachLot(
  db: HoaDatabase,
  userId: string,
  lotCode: string,
  householdName: string,
  now: string,
): Promise<string> {
  const existing = (await db.lots.toArray()).find(
    (lot) => normalizeLotCode(lot.lotCode) === lotCode,
  );
  if (existing) {
    await db.lots.update(existing.id, {
      residentUserIds: Array.from(new Set([...existing.residentUserIds, userId])),
      updatedAt: now,
    });
    return existing.id;
  }
  const lotId = createId("lot");
  const blockMatch = /^B(\d+)/i.exec(lotCode);
  await db.lots.add({
    id: lotId,
    lotCode,
    block: blockMatch?.[1] ?? "",
    street: "",
    householdName,
    residentUserIds: [userId],
    isActive: true,
    notes: "",
    createdAt: now,
    updatedAt: now,
  });
  return lotId;
}

export async function approveHomeownerRecord(
  db: HoaDatabase,
  userId: string,
  actor: Session,
): Promise<UserAccount> {
  assertOfficer(actor);
  const user = await db.users.get(userId);
  if (!user || user.approvalStatus !== "pending") {
    throw new Error("That application is not waiting.");
  }
  const lotCode = normalizeLotCode(user.requestedLotCode ?? "");
  if (!lotCode) throw new Error("Enter the lot code.");
  const now = nowIso();
  const lotId = await attachLot(db, user.id, lotCode, user.fullName, now);
  const next: UserAccount = {
    ...user,
    lotIds: Array.from(new Set([...user.lotIds, lotId])),
    isActive: true,
    approvalStatus: "approved",
    updatedAt: now,
  };
  await db.users.put(next);
  await db.auditLogs.add({
    id: createId("audit"),
    entity: "user",
    entityId: user.id,
    action: "verify",
    before: { approvalStatus: "pending" },
    after: { approvalStatus: "approved", lotCode },
    actorUserId: actor.userId,
    actorName: actor.fullName,
    note: "Officer verified this homeowner",
    timestamp: now,
  });
  return next;
}

export async function rejectHomeownerRecord(
  db: HoaDatabase,
  userId: string,
  actor: Session,
): Promise<void> {
  assertOfficer(actor);
  const user = await db.users.get(userId);
  if (!user || user.approvalStatus !== "pending") {
    throw new Error("That application is not waiting.");
  }
  const now = nowIso();
  await db.users.put({
    ...user,
    isActive: false,
    approvalStatus: "rejected",
    updatedAt: now,
  });
  await db.auditLogs.add({
    id: createId("audit"),
    entity: "user",
    entityId: user.id,
    action: "reject",
    before: { approvalStatus: "pending" },
    after: { approvalStatus: "rejected" },
    actorUserId: actor.userId,
    actorName: actor.fullName,
    note: "Officer declined this homeowner",
    timestamp: now,
  });
}
