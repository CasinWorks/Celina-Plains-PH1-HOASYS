import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { DEMO_PASSWORD, DEMO_USERS } from "../../lib/config";
import type { FileStorageService, HoaRepository } from "../../services/interfaces";
import { createIndexedDbRepository } from "../indexeddb/repository";
import type { HoaDatabase } from "../indexeddb/db";
import { ensureDemoAccounts } from "./accounts";
import { getFirebaseAuth } from "./app";
import { explainFirebaseError } from "./errors";
import { usernameToEmail } from "./payload";
import type { CloudSync } from "./sync";

export function createFirebaseRepository(
  db: HoaDatabase,
  files: FileStorageService,
  sync: CloudSync,
): HoaRepository {
  const local = createIndexedDbRepository(db, files);

  return {
    ...local,

    async seedDemoData(replace) {
      let uids: Map<string, string>;
      try {
        uids = await ensureDemoAccounts();
      } catch (error) {
        throw explainFirebaseError(error);
      }
      sync.registerUids(uids);
      const auth = getFirebaseAuth();
      const hadUser = auth.currentUser;
      if (!hadUser) {
        try {
          await signInWithEmailAndPassword(
            auth,
            usernameToEmail(DEMO_USERS.treasurer.username),
            DEMO_PASSWORD,
          );
        } catch (error) {
          throw explainFirebaseError(error);
        }
      }
      sync.setPushEnabled(true);
      try {
        await sync.runExclusive(async () => {
          await sync.wipeRemote();
          await local.seedDemoData(replace);
        });
      } finally {
        if (!hadUser) {
          sync.setPushEnabled(false);
          await signOut(auth).catch(() => undefined);
        }
      }
    },

    async importData(bundle) {
      if (!getFirebaseAuth().currentUser) {
        throw new Error("Sign in before importing records into Firebase.");
      }
      sync.setPushEnabled(true);
      await sync.runExclusive(async () => {
        await sync.wipeRemote();
        await local.importData(bundle);
      });
    },
  };
}
