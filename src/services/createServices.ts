import { createIndexedDbAuthService } from "../adapters/indexeddb/authService";
import { getDb } from "../adapters/indexeddb/db";
import { createIndexedDbFileStorage } from "../adapters/indexeddb/fileStorage";
import { createIndexedDbRepository } from "../adapters/indexeddb/repository";
import type { HoaServices } from "./interfaces";

/** Composition root — swap adapters here for Firebase / Supabase later. */
export function createServices(): HoaServices {
  const db = getDb();
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
