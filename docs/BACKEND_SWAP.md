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

## Firebase (likely next)

Suggested mapping (do **not** install SDKs until the owner asks):

1. **Auth** — implement `AuthService` with Firebase Auth (email/password or custom). Keep `Session` fields the same; drop demo plaintext passwords.
2. **Data** — one Firestore collection per entity (`users`, `lots`, `dues`, `payments`, …). Document ID = entity `id`. Use security rules mirroring the role matrix (homeowner / officer / treasurer).
3. **Files** — `FileStorageService.put` uploads to Firebase Storage; store the path in `proofStorageKey`.
4. Wire in `src/services/createServices.ts` by returning Firebase adapters instead of IndexedDB ones.

## Supabase (alternative)

1. **Auth** — Supabase Auth for `AuthService`.
2. **Data** — Postgres tables with UUID primary keys; RLS policies for roles. Keep the same TypeScript types; map rows ↔ domain objects in the adapter only.
3. **Files** — Supabase Storage buckets for proofs.

## Checklist when swapping

- [ ] New adapters implement the three interfaces without changing page components.
- [ ] Role checks stay server-side (Firebase rules / RLS); client guards remain UX-only.
- [ ] Re-run Vitest against adapters with an in-memory or emulator backend where possible.
- [ ] Keep JSON export/import as a migration bridge from local demo data if needed.
