# Celina Plains Phase 1 HOA

Local-first resident portal for **Celina Plains Phase 1 HOA** (Philippines). Phase 1 covers login with roles, lots, dues, payments (proof upload + treasurer verification), expenses, and finance reports.

This is a **React (Vite) browser app**. Screens talk to a repository interface. With Firebase web keys in `.env`, sign-in, the ledger, and proof files use **Firebase Auth, Firestore, and Storage**. Without those keys, the same screens keep using **IndexedDB** on this browser. See [docs/BACKEND_SWAP.md](docs/BACKEND_SWAP.md).

**No SMS. No government seals or GOV.PH logos.** Branding is Celina Plains Phase 1 HOA only.

## Requirements (macOS)

- Node.js 20+ (22 recommended)
- npm 10+

## Quick start

```bash
cd /path/to/this-repo
npm install
npm run dev
```

Open **[http://127.0.0.1:43123](http://127.0.0.1:43123)**.

On first visit, click **Load DEMO data** on the login screen (or use Settings after signing in as treasurer).

### Other commands

```bash
npm test          # Vitest (data layer, role guards, i18n key parity)
npm run build     # Production build
npm run preview   # Serve the production build on port 43123
```

## Demo logins

Password for all demo users: `demo1234`

| Role | Username |
|------|----------|
| Homeowner | `homeowner.demo` |
| Officer | `officer.demo` |
| Treasurer | `treasurer.demo` |

Demo lots, dues, and payments are labeled **DEMO**. They are not live HOA records.

## Features (Phase 1)

- Mock login with roles: `homeowner`, `officer`, `treasurer` (role-gated routes)
- Lots / households (treasurer manage; officers can list)
- Dues periods, arrears, configurable penalties
- Payments with proof-of-payment image/PDF (IndexedDB, or Firebase Storage when cloud keys are set); treasurer verify/reject + OR number
- Expenses (post / void with audit)
- Finance reports (homeowner aggregate summary; treasurer monthly statement)
- Privacy consent timestamp
- Finance audit log
- Seed DEMO data button
- Export / import JSON backup (optional embedded proof files)
- English / Filipino language switch (header, saved in `localStorage`)
- Text size: Normal / Large / Extra large (header, saved in `localStorage`)
- Section 7 design: blue / gold / red accents, elderly-friendly type (≥18px body), 48px tap targets

Configurable placeholders (lot count, dues amount, penalties, payment instructions, contact) live in **Settings** — not hard-coded as subdivision facts.

## Accessibility

- Body text starts at **18px**; nothing below **16px**
- Line-height ~1.6; buttons ≥ **48px** tall
- High-contrast text; status badges include text labels
- Works at mobile widths and at 200% browser zoom
- Keyboard focus rings on interactive controls

## Project layout

```
src/
  adapters/indexeddb/   # Dexie implementation of services
  adapters/firebase/    # Auth, Firestore sync, and Storage when .env is set
  auth/                 # Session context + role guards
  components/           # Layout, language & text-size toggles
  domain/               # Types + money helpers (string IDs, ISO dates)
  i18n/locales/         # en.json + fil.json
  pages/                # Phase 1 screens
  services/             # Backend-agnostic interfaces + factory
  seed/                 # Demo bundle
docs/BACKEND_SWAP.md    # Firebase setup and the IndexedDB fallback
```

## Notes

- Without Firebase keys, all data stays in this browser profile. Clearing site data wipes that local database.
- With Firebase keys, **Load DEMO data** once creates the shared demo sign-ins. Other devices then see the same ledger. Publish `firestore.rules` and `storage.rules` before the first cloud sign-in.
- Use **Export JSON backup** in Settings before clearing storage.
- Do not commit `.env`. Copy `.env.example` and fill in the Firebase web app config.
