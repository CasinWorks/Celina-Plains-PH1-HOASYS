import type { Role, Session, UserAccount } from "../../domain/types";
import { nowIso } from "../../lib/ids";
import type { AuthService } from "../../services/interfaces";
import { getDb, type HoaDatabase } from "./db";

const SESSION_KEY = "celina_hoa_session";

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

export function createIndexedDbAuthService(
  db: HoaDatabase = getDb(),
): AuthService {
  return {
    async login(username, password) {
      const user = await db.users
        .where("username")
        .equals(username.trim().toLowerCase())
        .first();
      if (!user || !user.isActive || user.password !== password) {
        throw new Error("Invalid username or password.");
      }
      const session = toSession(user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    async logout() {
      localStorage.removeItem(SESSION_KEY);
    },

    async getSession() {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        const session = JSON.parse(raw) as Session;
        const user = await db.users.get(session.userId);
        if (!user || !user.isActive) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
        // Refresh roles/lots from current user doc
        const fresh = toSession(user);
        fresh.loggedInAt = session.loggedInAt;
        localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
        return fresh;
      } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    },

    async changePassword(userId, current, next) {
      const user = await db.users.get(userId);
      if (!user) throw new Error("User not found.");
      if (user.password !== current) throw new Error("Current password is incorrect.");
      if (next.length < 8) throw new Error("New password must be at least 8 characters.");
      await db.users.update(userId, {
        password: next,
        updatedAt: nowIso(),
      });
    },

    async acceptPrivacyConsent(userId) {
      const user = await db.users.get(userId);
      if (!user) throw new Error("User not found.");
      const consentPrivacyAt = nowIso();
      await db.users.update(userId, { consentPrivacyAt, updatedAt: nowIso() });
      const updated = (await db.users.get(userId))!;
      const session = toSession(updated);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    hasRole(session, roles) {
      if (!session) return false;
      const needed = Array.isArray(roles) ? roles : [roles];
      return needed.some((r) => session.roles.includes(r));
    },
  };
}

export function clearSessionStorage(): void {
  localStorage.removeItem(SESSION_KEY);
}

export type { Role };
