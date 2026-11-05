import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { HoaDatabase } from "../indexeddb/db";
import { getFirebaseAuth, getFirebaseDb } from "./app";
import { explainFirebaseError } from "./errors";
import { toFirestoreDoc } from "./payload";

const TABLE_NAMES = [
  "users",
  "lots",
  "dues",
  "payments",
  "allocations",
  "expenses",
  "auditLogs",
  "siteConfig",
  "announcements",
  "feedbackItems",
  "hoaPlans",
  "elections",
  "electionContests",
  "voterAssignments",
  "ballots",
  "documents",
] as const;

type TableName = (typeof TABLE_NAMES)[number];

type Row = { id: string } & Record<string, unknown>;

type SyncTable = {
  hook(
    event: "creating",
    cb: (primKey: string, obj: Row) => void,
  ): void;
  hook(
    event: "updating",
    cb: (mods: Record<string, unknown>, primKey: string, obj: Row) => void,
  ): void;
  hook(event: "deleting", cb: (primKey: string) => void): void;
  toArray(): Promise<Row[]>;
  bulkPut(rows: Row[]): Promise<unknown>;
  bulkDelete(ids: string[]): Promise<unknown>;
  clear(): Promise<void>;
};

type PendingOp =
  | { op: "set"; table: TableName; id: string; data: Record<string, unknown> }
  | { op: "delete"; table: TableName; id: string };

export type CloudSync = {
  setPushEnabled(enabled: boolean): void;
  registerUids(uids: Map<string, string>): void;
  flush(): Promise<void>;
  wipeRemote(): Promise<void>;
  beginLiveSession(): Promise<void>;
  endLiveSession(): Promise<void>;
  runExclusive(fn: () => Promise<void>): Promise<void>;
  subscribe(listener: () => void): () => void;
};

let attached = false;

function tableOf(db: HoaDatabase, name: TableName): SyncTable {
  return db[name] as unknown as SyncTable;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === "password") continue;
      const inner = (value as Record<string, unknown>)[key];
      if (inner !== undefined) out[key] = stable(inner);
    }
    return out;
  }
  return value;
}

function fingerprint(rows: Row[]): string {
  return JSON.stringify(
    rows
      .map((row) => stable(row))
      .sort((a, b) =>
        String((a as Row).id).localeCompare(String((b as Row).id)),
      ),
  );
}

function rowsFromSnapshot(
  name: TableName,
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): Row[] {
  return docs.map((entry) => {
    const data = entry.data();
    const row: Row = { ...data, id: entry.id };
    if (name === "users" && typeof row.password !== "string") row.password = "";
    return row;
  });
}

export function attachCloudSync(db: HoaDatabase): CloudSync {
  let pushEnabled = false;
  let applyingRemote = 0;
  let hold = 0;
  let listening = false;
  let startToken = 0;
  let livePromise: Promise<void> | null = null;
  let flushTimer: number | null = null;
  let flushChain: Promise<void> = Promise.resolve();
  const pending = new Map<string, PendingOp>();
  const uidsByUsername = new Map<string, string>();
  const listeners = new Set<() => void>();
  let unsubs: Unsubscribe[] = [];
  let cancelChecks: Array<() => void> = [];
  let notifyTimer: number | null = null;

  function queue(op: PendingOp) {
    if (!pushEnabled || applyingRemote > 0) return;
    pending.set(`${op.table}/${op.id}`, op);
    if (hold > 0) return;
    if (flushTimer !== null) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flushNow();
    }, 50);
  }

  function registerHooks() {
    if (attached) return;
    attached = true;
    for (const name of TABLE_NAMES) {
      const table = tableOf(db, name);
      table.hook("creating", (primKey, obj) => {
        queue({
          op: "set",
          table: name,
          id: String(primKey),
          data: toFirestoreDoc(name, { ...obj, id: String(primKey) }, uidsByUsername),
        });
      });
      table.hook("updating", (mods, primKey, obj) => {
        const next = { ...obj, ...mods, id: String(primKey) };
        queue({
          op: "set",
          table: name,
          id: String(primKey),
          data: toFirestoreDoc(name, next, uidsByUsername),
        });
      });
      table.hook("deleting", (primKey) => {
        queue({ op: "delete", table: name, id: String(primKey) });
      });
    }
  }

  async function commitPending(ops: PendingOp[]) {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      throw new Error("Sign in before saving records to Firebase.");
    }
    const fs = getFirebaseDb();
    let batch = writeBatch(fs);
    let count = 0;
    const commit = async () => {
      if (count === 0) return;
      await batch.commit();
      batch = writeBatch(fs);
      count = 0;
    };
    for (const op of ops) {
      if (count >= 400) await commit();
      const ref = doc(fs, op.table, op.id);
      if (op.op === "delete") {
        batch.delete(ref);
        count += 1;
      } else {
        batch.set(ref, op.data);
        count += 1;
        if (op.table === "users" && typeof op.data.firebaseUid === "string") {
          if (count >= 400) await commit();
          batch.set(doc(fs, "profiles", op.data.firebaseUid), {
            userId: op.id,
            username: op.data.username ?? "",
            roles: op.data.roles ?? [],
          });
          count += 1;
        }
      }
    }
    await commit();
  }

  function flushNow(): Promise<void> {
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    const run = flushChain.then(async () => {
      if (!pushEnabled || pending.size === 0) return;
      const ops = [...pending.values()];
      pending.clear();
      try {
        await commitPending(ops);
      } catch (error) {
        for (const op of ops) {
          const key = `${op.table}/${op.id}`;
          if (!pending.has(key)) pending.set(key, op);
        }
        throw explainFirebaseError(error);
      }
    });
    flushChain = run.catch(() => undefined);
    return run;
  }

  function notifyRemote() {
    if (notifyTimer !== null) window.clearTimeout(notifyTimer);
    notifyTimer = window.setTimeout(() => {
      notifyTimer = null;
      for (const listener of listeners) listener();
    }, 250);
  }

  async function applySnapshot(name: TableName, rows: Row[], first: boolean) {
    const table = tableOf(db, name);
    const local = await table.toArray();
    const remoteFp = fingerprint(rows);
    const localFp = fingerprint(local);
    if (remoteFp === localFp) return;
    applyingRemote += 1;
    try {
      const remoteIds = new Set(rows.map((row) => row.id));
      const stale = local.map((row) => row.id).filter((id) => !remoteIds.has(id));
      if (stale.length) await table.bulkDelete(stale);
      if (rows.length) await table.bulkPut(rows);
    } finally {
      applyingRemote -= 1;
    }
    if (!first) notifyRemote();
  }

  function stopListeners() {
    startToken += 1;
    const checks = cancelChecks;
    cancelChecks = [];
    for (const check of checks) check();
    for (const unsub of unsubs) unsub();
    unsubs = [];
    listening = false;
  }

  function startListeners(): Promise<void> {
    stopListeners();
    const token = startToken;
    listening = true;
    const seen = new Set<TableName>();
    const fs = getFirebaseDb();
    return new Promise((resolve, reject) => {
      let settled = false;
      const succeed = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const fail = (error: unknown) => {
        if (settled || token !== startToken) return;
        settled = true;
        reject(explainFirebaseError(error));
      };
      cancelChecks.push(() => {
        if (!settled) succeed();
      });
      for (const name of TABLE_NAMES) {
        const unsub = onSnapshot(
          collection(fs, name),
          (snap) => {
            if (token !== startToken) return;
            const first = !seen.has(name);
            seen.add(name);
            const rows = rowsFromSnapshot(name, snap.docs);
            void applySnapshot(name, rows, first)
              .then(() => {
                if (token !== startToken || settled) return;
                if (seen.size === TABLE_NAMES.length) succeed();
              })
              .catch(fail);
          },
          (error) => fail(error),
        );
        unsubs.push(unsub);
      }
    });
  }

  async function clearLocal() {
    applyingRemote += 1;
    try {
      await Promise.all([
        ...TABLE_NAMES.map((name) => tableOf(db, name).clear()),
        db.files.clear(),
      ]);
    } finally {
      applyingRemote -= 1;
    }
  }

  registerHooks();

  return {
    setPushEnabled(enabled) {
      pushEnabled = enabled;
    },
    registerUids(uids) {
      uidsByUsername.clear();
      for (const [username, uid] of uids) uidsByUsername.set(username, uid);
    },
    flush: flushNow,
    async wipeRemote() {
      const fs = getFirebaseDb();
      for (const name of [...TABLE_NAMES, "profiles" as const]) {
        const snap = await getDocs(collection(fs, name));
        let batch = writeBatch(fs);
        let count = 0;
        for (const entry of snap.docs) {
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(fs);
            count = 0;
          }
          batch.delete(entry.ref);
          count += 1;
        }
        if (count > 0) await batch.commit();
      }
    },
    async beginLiveSession() {
      pushEnabled = true;
      if (!livePromise) {
        livePromise = startListeners().catch((error: unknown) => {
          livePromise = null;
          listening = false;
          throw error;
        });
      }
      await livePromise;
    },
    async endLiveSession() {
      try {
        await flushNow();
      } catch {
        pending.clear();
      }
      pushEnabled = false;
      stopListeners();
      livePromise = null;
      pending.clear();
      await clearLocal();
    },
    async runExclusive(fn) {
      const wasLive = listening;
      stopListeners();
      livePromise = null;
      hold += 1;
      try {
        await fn();
      } catch (error) {
        pending.clear();
        throw error;
      } finally {
        hold = Math.max(0, hold - 1);
        try {
          await flushNow();
        } finally {
          if (wasLive) {
            livePromise = startListeners();
            await livePromise;
          }
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
