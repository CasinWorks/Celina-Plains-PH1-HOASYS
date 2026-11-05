import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import type { Session, UserAccount } from "../../domain/types";
import { nowIso } from "../../lib/ids";
import type { AuthService } from "../../services/interfaces";
import {
  createHomeownerAccount,
  createHomeownerApplication,
  normalizeUsername,
  PENDING_APPLICATION,
  REJECTED_APPLICATION,
} from "../registerHomeowner";
import { SESSION_KEY } from "../indexeddb/authService";
import type { HoaDatabase } from "../indexeddb/db";
import { getFirebaseAuth, getSeedAuth } from "./app";
import { explainFirebaseError } from "./errors";
import { usernameFromEmail, usernameToEmail } from "./payload";
import type { CloudSync } from "./sync";

function toSession(user: UserAccount): Session {
  return {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    roles: [...user.roles],
    lotIds: [...user.lotIds],
    consentPrivacyAt: user.consentPrivacyAt,
    loggedInAt: nowIso(),
  };
}

function waitForAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
}

async function sessionForCurrentUser(db: HoaDatabase): Promise<Session | null> {
  const current = getFirebaseAuth().currentUser;
  if (!current) return null;
  const username = usernameFromEmail(current.email);
  const users = await db.users.toArray();
  const user = users.find(
    (row) => row.firebaseUid === current.uid || row.username === username,
  );
  if (!user || !user.isActive) return null;
  return toSession(user);
}

export function createFirebaseAuthService(
  db: HoaDatabase,
  sync: CloudSync,
): AuthService {
  return {
    async login(username, password) {
      localStorage.removeItem(SESSION_KEY);
      try {
        await signInWithEmailAndPassword(
          getFirebaseAuth(),
          usernameToEmail(username),
          password,
        );
        await sync.beginLiveSession();
        const signedInName = usernameFromEmail(getFirebaseAuth().currentUser?.email);
        const row = (await db.users.toArray()).find(
          (user) =>
            user.firebaseUid === getFirebaseAuth().currentUser?.uid ||
            user.username === signedInName,
        );
        if (row?.approvalStatus === "pending") throw new Error(PENDING_APPLICATION);
        if (row?.approvalStatus === "rejected") throw new Error(REJECTED_APPLICATION);
        const session = await sessionForCurrentUser(db);
        if (!session) throw new Error("Invalid username or password.");
        return session;
      } catch (error) {
        if (getFirebaseAuth().currentUser) {
          await sync.endLiveSession().catch(() => undefined);
          await signOut(getFirebaseAuth()).catch(() => undefined);
        }
        throw explainFirebaseError(error);
      }
    },

    async applyForHomeowner(input) {
      const username = normalizeUsername(input.username);
      if (input.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      const existing = await db.users.where("username").equals(username).first();
      if (existing) throw new Error("That username is already registered.");
      const seed = getSeedAuth();
      const auth = getFirebaseAuth();
      const hadUser = auth.currentUser;
      try {
        const created = await createUserWithEmailAndPassword(
          seed,
          usernameToEmail(username),
          input.password,
        );
        await signOut(seed);
        if (!hadUser) {
          await signInWithEmailAndPassword(
            auth,
            usernameToEmail(username),
            input.password,
          );
          await sync.beginLiveSession();
        }
        sync.registerUids(new Map([[username, created.user.uid]]));
        const again = await db.users.where("username").equals(username).first();
        if (again) throw new Error("That username is already registered.");
        await createHomeownerApplication(db, {
          ...input,
          username,
          firebaseUid: created.user.uid,
        });
        await sync.flush();
      } catch (error) {
        const code =
          typeof error === "object" && error && "code" in error
            ? String((error as { code: string }).code)
            : "";
        if (code === "auth/email-already-in-use") {
          throw new Error("That username is already registered.");
        }
        if (error instanceof Error && !("code" in error)) throw error;
        throw explainFirebaseError(error);
      } finally {
        await signOut(seed).catch(() => undefined);
        if (!hadUser && auth.currentUser) {
          await sync.endLiveSession().catch(() => undefined);
          await signOut(auth).catch(() => undefined);
        }
      }
    },

    async provisionHomeowner(input, actor) {
      if (
        !actor.roles.includes("officer") &&
        !actor.roles.includes("treasurer")
      ) {
        throw new Error("Only an officer or the treasurer can add a homeowner.");
      }
      const username = normalizeUsername(input.username);
      if (input.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      const existing = await db.users.where("username").equals(username).first();
      if (existing) throw new Error("That username is already registered.");
      const seed = getSeedAuth();
      try {
        const created = await createUserWithEmailAndPassword(
          seed,
          usernameToEmail(username),
          input.password,
        );
        await signOut(seed);
        sync.registerUids(new Map([[username, created.user.uid]]));
        const user = await createHomeownerAccount(db, {
          ...input,
          username,
          firebaseUid: created.user.uid,
          actor: { userId: actor.userId, fullName: actor.fullName },
        });
        await sync.flush();
        return user;
      } catch (error) {
        await signOut(seed).catch(() => undefined);
        const code =
          typeof error === "object" && error && "code" in error
            ? String((error as { code: string }).code)
            : "";
        if (code === "auth/email-already-in-use") {
          throw new Error("That username is already registered.");
        }
        if (error instanceof Error && !("code" in error)) throw error;
        throw explainFirebaseError(error);
      }
    },

    async logout() {
      await sync.endLiveSession();
      await signOut(getFirebaseAuth());
      localStorage.removeItem(SESSION_KEY);
    },

    async getSession() {
      await waitForAuth();
      if (!getFirebaseAuth().currentUser) return null;
      try {
        await sync.beginLiveSession();
        return await sessionForCurrentUser(db);
      } catch {
        return null;
      }
    },

    async changePassword(userId, current, next) {
      const account = await db.users.get(userId);
      const user = getFirebaseAuth().currentUser;
      if (!account || !user?.email) throw new Error("User not found.");
      if (next.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }
      try {
        const credential = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, next);
      } catch (error) {
        throw explainFirebaseError(error);
      }
    },

    async acceptPrivacyConsent(userId) {
      const user = await db.users.get(userId);
      if (!user) throw new Error("User not found.");
      const consentPrivacyAt = nowIso();
      await db.users.put({ ...user, consentPrivacyAt, updatedAt: nowIso() });
      const updated = await db.users.get(userId);
      if (!updated) throw new Error("User not found.");
      return toSession(updated);
    },

    hasRole(session, roles) {
      if (!session) return false;
      const needed = Array.isArray(roles) ? roles : [roles];
      return needed.some((role) => session.roles.includes(role));
    },
  };
}
