/** Demo accounts use this mailbox. It is not a real inbox. */
export const FIREBASE_EMAIL_DOMAIN = "celinaplains.app";

export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase();
  if (clean.includes("@")) return clean;
  return `${clean}@${FIREBASE_EMAIL_DOMAIN}`;
}

export function usernameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const lower = email.trim().toLowerCase();
  const suffix = `@${FIREBASE_EMAIL_DOMAIN}`;
  if (lower.endsWith(suffix)) return lower.slice(0, -suffix.length);
  return lower;
}

/** Plain JSON for Firestore. Passwords never leave the browser. */
export function toFirestoreDoc(
  table: string,
  row: Record<string, unknown>,
  uidsByUsername: Map<string, string>,
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
  if (table === "users") {
    delete copy.password;
    const username = typeof copy.username === "string" ? copy.username : "";
    const uid = uidsByUsername.get(username);
    if (uid) copy.firebaseUid = uid;
  }
  return copy;
}
