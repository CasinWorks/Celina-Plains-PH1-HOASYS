# Celina Plains Phase 1 HOA

Local-first resident portal for **Celina Plains Phase 1 HOA** (Philippines). Phase 1 covers login with roles, lots, dues, payments (proof upload + treasurer verification), expenses, and finance reports.

This is a **React (Vite) browser app**. Data lives in **IndexedDB** (Dexie) behind a repository interface so a future Firebase or Supabase backend can replace it without rewriting screens. See [docs/BACKEND_SWAP.md](docs/BACKEND_SWAP.md).

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
- Payments with proof-of-payment image/PDF stored in IndexedDB; treasurer verify/reject + OR number
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
  auth/                 # Session context + role guards
  components/           # Layout, language & text-size toggles
  domain/               # Types + money helpers (string IDs, ISO dates)
  i18n/locales/         # en.json + fil.json
  pages/                # Phase 1 screens
  services/             # Backend-agnostic interfaces + factory
  seed/                 # Demo bundle
docs/BACKEND_SWAP.md    # How to swap in Firebase or Supabase later
```

## Notes

- All data stays in this browser profile. Clearing site data wipes the local HOA database.
- Use **Export JSON backup** in Settings before clearing storage.
- Do not commit secrets; there is no server `.env` for Phase 1.
