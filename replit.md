# Hormang — Local Services Marketplace (Uzbekistan)

Connects users with verified local service providers through AI-powered search, offering a full authentication and profile system with dual buyer/provider roles.

## Run & Operate

- **Run Dev Server:** `pnpm --filter @workspace/api-server run dev` (API), `pnpm --filter @hormang-landing dev` (Frontend)
- **Build All:** `pnpm run build` (runs `typecheck` then `build` in all packages)
- **Typecheck All:** `pnpm run typecheck` (runs `tsc --build --emitDeclarationOnly`)
- **Codegen API Client:** `pnpm --filter @workspace/api-spec run codegen`
- **DB Push (Dev):** `pnpm --filter @workspace/db run push` (or `push-force`)
- **Required Env Vars:** `PORT`, `DATABASE_URL`

## Stack

- **Monorepo:** pnpm workspaces
- **Runtime:** Node.js 24, TypeScript 5.9
- **API:** Express 5
- **Database:** PostgreSQL, Drizzle ORM
- **Validation:** Zod, drizzle-zod
- **API Codegen:** Orval (from OpenAPI)
- **Build:** esbuild (backend), Vite (frontend)

## Where things live

- `/artifacts`: Deployable applications (e.g., `api-server`, `hormang-landing`)
- `/lib`: Shared libraries (e.g., `api-spec`, `db`, `api-client-react`, `api-zod`)
- `/scripts`: Utility scripts
- `lib/api-spec/openapi.yaml`: OpenAPI specification (source of truth for API contracts)
- `lib/db/src/schema/*.ts`: Drizzle ORM database schemas (source of truth for DB schema)
- `artifacts/hormang-landing/src/design-system/`: Frontend theme and utility classes
- `drizzle.config.ts`: Drizzle Kit configuration

## Architecture decisions

- **PNPM Workspace with Composite TS Projects:** Enables efficient monorepo management and accurate cross-package type checking through `tsconfig.base.json` and project references.
- **OpenAPI-driven Codegen:** Orval generates API clients and Zod schemas from a single OpenAPI spec, ensuring consistency between frontend, backend, and validation layers.
- **Phone+OTP Authentication:** Prioritizes mobile-first access and simplifies the user experience by eliminating traditional email/password flows for new users.
- **Dual-Role System:** Allows a single user account to seamlessly switch between buyer and provider roles, enabling flexibility and reducing account management overhead.
- **Local Storage for Critical State:** Key user preferences and temporary states (e.g., `activeRole`, `hormang_access_token`, `hormang_tanga_history`) are stored in `localStorage` or `sessionStorage` for persistence across sessions/refreshes.

## Product

- **AI-powered Search:** Helps users find local service providers efficiently.
- **Comprehensive User Profiles:** Supports detailed buyer and provider profiles.
- **Dual-Role Functionality:** Users can act as both service buyers and providers.
- **Offer & Review System:** Facilitates service offers, acceptance, and post-service reviews.
- **Tanga Transaction History:** Tracks in-app currency (Tanga) spending for providers.
- **Admin Panels:** Tools for managing announcements, users, monetization, and categories.

## User preferences

- **Languages:** Only Uzbek (UZ) and Russian (RU) are supported. Do NOT translate UI text into English — `en.ts` exists solely for TypeScript type compliance and does not need to be kept up to date with new keys.

## Gotchas

- **Typecheck from root:** Always run `pnpm run typecheck` from the monorepo root to ensure correct cross-package type resolution. Running `tsc` within a single package might fail.
- **Dev DB Migration:** For local development, use `pnpm --filter @workspace/db run push` for schema changes. If that fails due to conflicts, use `push-force`.
- **Admin Panel Credentials:** Access the `/admin` panel with username `hormangVIP`, password `ourhormang123`.

## Pointers

- **Replit Documentation:** [https://docs.replit.com/](https://docs.replit.com/)
- **pnpm Workspaces:** [https://pnpm.io/workspaces](https://pnpm.io/workspaces)
- **Drizzle ORM:** [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Orval:** [https://orval.dev/](https://orval.dev/)
- **Zod:** [https://zod.dev/](https://zod.dev/)