import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { DEMO_PASSWORD, DEMO_USERS } from "../../lib/config";
import { getSeedAuth } from "./app";
import { explainFirebaseError } from "./errors";
import { usernameToEmail } from "./payload";

const DEMO_USERNAMES = [
  DEMO_USERS.homeowner.username,
  DEMO_USERS.officer.username,
  DEMO_USERS.treasurer.username,
];

/** Create the three demo sign-ins without disturbing the signed-in resident. */
export async function ensureDemoAccounts(): Promise<Map<string, string>> {
  const auth = getSeedAuth();
  const uids = new Map<string, string>();
  for (const username of DEMO_USERNAMES) {
    const email = usernameToEmail(username);
    try {
      const created = await createUserWithEmailAndPassword(auth, email, DEMO_PASSWORD);
      uids.set(username, created.user.uid);
      await signOut(auth);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code !== "auth/email-already-in-use") throw explainFirebaseError(error);
      try {
        const existing = await signInWithEmailAndPassword(auth, email, DEMO_PASSWORD);
        uids.set(username, existing.user.uid);
        await signOut(auth);
      } catch (signInError) {
        throw explainFirebaseError(signInError);
      }
    }
  }
  return uids;
}
