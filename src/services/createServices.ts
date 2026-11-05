import { createFirebaseAuthService } from "../adapters/firebase/authService";
import { isFirebaseEnabled } from "../adapters/firebase/app";
import { createFirebaseRepository } from "../adapters/firebase/repository";
import { attachCloudSync, type CloudSync } from "../adapters/firebase/sync";
import { createIndexedDbAuthService } from "../adapters/indexeddb/authService";
import { getDb } from "../adapters/indexeddb/db";
import { createIndexedDbFileStorage } from "../adapters/indexeddb/fileStorage";
import { createIndexedDbRepository } from "../adapters/indexeddb/repository";
import type { HoaServices } from "./interfaces";

export { isFirebaseEnabled };

let cloud: CloudSync | null = null;

/** Composition root. Firebase is used when the web app keys are present. */
export function createServices(): HoaServices {
  const db = getDb();
  if (isFirebaseEnabled()) {
    cloud = attachCloudSync(db);
    const files = createIndexedDbFileStorage(db);
    const auth = createFirebaseAuthService(db, cloud);
    const repo = createFirebaseRepository(db, files, cloud);
    return { auth, repo, files };
  }
  const files = createIndexedDbFileStorage(db);
  const auth = createIndexedDbAuthService(db);
  const repo = createIndexedDbRepository(db, files);
  return { auth, repo, files };
}

let singleton: HoaServices | null = null;

export function getServices(): HoaServices {
  if (!singleton) singleton = createServices();
  return singleton;
}

/** Tests can inject a fresh services object. */
export function setServicesForTests(services: HoaServices | null): void {
  singleton = services;
}

/** Remount screens when another device changes the shared ledger. */
export function subscribeDataChanges(listener: () => void): () => void {
  if (!cloud) return () => undefined;
  return cloud.subscribe(listener);
}
