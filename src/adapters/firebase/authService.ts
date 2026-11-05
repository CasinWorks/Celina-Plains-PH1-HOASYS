import {
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
import { SESSION_KEY } from "../indexeddb/authService";
import type { HoaDatabase } from "../indexeddb/db";
import { getFirebaseAuth } from "./app";
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
