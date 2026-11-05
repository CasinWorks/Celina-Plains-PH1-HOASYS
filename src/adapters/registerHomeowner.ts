import type { UserAccount } from "../domain/types";
import { createId, nowIso } from "../lib/ids";
import type { HoaDatabase } from "./indexeddb/db";

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
    actorUserId: userId,
    actorName: fullName,
    note: "Homeowner registered",
    timestamp: now,
  });
  return user;
}
