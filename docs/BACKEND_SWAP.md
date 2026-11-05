# Swapping IndexedDB for Firebase or Supabase

Phase 1 stores all data in the browser (Dexie / IndexedDB) behind the interfaces in `src/services/interfaces.ts`:

- `AuthService` — login, session, password, privacy consent
- `HoaRepository` — lots, dues, payments, expenses, reports, seed, export/import
- `FileStorageService` — proof-of-payment and receipt blobs

UI code imports `getServices()` only. It never imports Dexie tables directly.

## Document-friendly shape (works for both)

| Rule | Why |
|------|-----|
| String IDs (`createId()`) | Firestore doc IDs and Postgres/UUID rows |
| ISO 8601 timestamps / `YYYY-MM-DD` dates | Portable JSON / Firestore Timestamp conversion |
| Decimal money as strings (`"500.00"`) | Avoid float drift; map to `Numeric` or store as string |
| Denormalized display fields (`lotCode`, `payerName`) on documents | UI does not join collections |
| Storage keys as strings | IndexedDB key today → Firebase Storage path or Supabase Storage object name later |

## Firebase (wired)

`src/services/createServices.ts` uses Firebase when `.env` contains the web app keys from `.env.example`. Restart the dev server after adding them.

1. **Auth** — `AuthService` signs in with Firebase Email/Password. A username such as `homeowner.demo` becomes `homeowner.demo@celinaplains.app`. Passwords are not stored in Firestore.
2. **Data** — the existing ledger rules still run on a local cache. Each change is written to a Firestore collection (`users`, `lots`, `dues`, `payments`, …). Document ID = entity `id`. Live listeners refresh other signed-in devices.
3. **Files** — proof uploads go to Firebase Storage under `proofs/{key}`.
4. **Rules** — `firestore.rules` and `storage.rules` allow any signed-in resident to read and write. Publish them with `firebase deploy --only firestore:rules,storage` before Load DEMO data.
5. **Demo** — Load DEMO data creates the three demo Auth users (password `demo1234`) and uploads the sample ledger. Enable Email/Password in Firebase Authentication first.

IndexedDB remains the backend when the keys are absent, and Vitest keeps using it.

## Supabase (alternative)

1. **Auth** — Supabase Auth for `AuthService`.
2. **Data** — Postgres tables with UUID primary keys; RLS policies for roles. Keep the same TypeScript types; map rows ↔ domain objects in the adapter only.
3. **Files** — Supabase Storage buckets for proofs.

## Checklist when swapping

- [ ] New adapters implement the three interfaces without changing page components.
- [ ] Role checks stay server-side (Firebase rules / RLS); client guards remain UX-only.
- [ ] Re-run Vitest against adapters with an in-memory or emulator backend where possible.
- [ ] Keep JSON export/import as a migration bridge from local demo data if needed.
