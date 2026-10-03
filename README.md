# HK Family Fun V2

HK Family Fun is a Hong Kong family-event discovery SaaS. The rebuilt platform combines a public event experience with Merchant and Admin portals so event data can be maintained without editing source code.

## Product surfaces

### Public
- Home, Today, Calendar, search-first Events, nearby Map and Event Detail
- Traditional Chinese / Simplified Chinese / English
- District, MTR, date, price, free, category, SEN and location discovery
- Favorites, sharing, Google Maps and official organizer CTAs
- Responsive mobile navigation and resilient event-image fallbacks

### Merchant Portal
- Registration, email/password authentication and password recovery
- Event create / edit / autosave / preview / submit
- Image upload, re-ordering and cover management
- URL import and direct PDF upload into editable drafts
- TC / SC / EN event content fields
- Optional one-click SC + English translation when Azure Translator is configured
- Merchant analytics and event-management dashboard

### Admin Portal
- Merchant review and approval
- Event CRUD through the shared admin-capable editor
- Event approve / reject / publish / archive / delete workflow
- Publication-readiness checks, preview and review notes
- Promotional banner management and exports

## Current technology

- **Framework:** Next.js 16.3.6 App Router
- **UI:** React 19.2 + Tailwind CSS
- **Language:** TypeScript
- **Database / Auth / Storage:** Supabase PostgreSQL + Supabase Auth + Storage
- **Hosting / deployment:** Vercel
- **Maps:** Leaflet / React Leaflet
- **Forms / state:** React Hook Form, Zod, TanStack Query, Zustand
- **Automation:** GitHub Actions quality, authenticated E2E, production smoke and event-maintenance workflows

## Local development

Prerequisites:
- Node.js 22
- npm
- access to the HK Family Fun V2 Supabase environment

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The development server runs on:

```text
http://localhost:3001
```

Before pushing:

```bash
npm run lint
npm run type-check
npm run build
```

## Project structure

```text
app/                     Next.js routes and API handlers
components/              Shared UI components
lib/                     Supabase, i18n and application helpers
scripts/                 E2E, migration and maintenance scripts
supabase/migrations/     Database migrations
docs/                    Operational and launch documentation
.github/workflows/       CI, smoke, E2E and maintenance automation
public/                  Static brand assets
```

## Deployment gates

Pushes to `main` are built by Vercel and checked by GitHub Actions. Portal-critical changes also run an authenticated Merchant/Admin/Auth E2E flow using temporary records that are cleaned up after the test. A production smoke workflow validates the deployed commit, main public routes, a live event detail, locale persistence, anonymous-write protection and staging `noindex`.

See `docs/HK_FAMILY_FUN_LAUNCH_CHECKLIST.md` for current launch status and remaining external actions.

## Important repository rule

`main` is the canonical rebuild branch. Do not blindly merge the old `phase-1c-merchant-portal` branch or PR #3; it is heavily diverged and must be audited feature-by-feature before any reuse.
