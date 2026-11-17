# ADR 0008: Frontend integration in the repository

- Status: Accepted (decision 6 carried out by ADR 0012)
- Date: 2026-10-08
- Note (2026-11-17): The frontend is now Next.js 16.4.6 (item 31 of `docs/backend-evolutions.md`). The line of this ADR that names Next.js 16.4.0 records the scaffold of 2026-10-08.

## Context

The repository was a NestJS backend at its root (`src/`), managed with pnpm 10.11.0 (`packageManager` in `package.json`). A Next.js frontend had to be added. Microservices may follow later, so the layout should not make that harder.

Before the change, `pnpm-workspace.yaml` held only build-script settings (`onlyBuiltDependencies`, `ignoredBuiltDependencies`) and no `packages` list. The pnpm documentation says that without `packages`, only the root package belongs to the workspace.

The backend is built with `nest build`, tested with Jest, packaged by a multi-stage Dockerfile, and checked by a GitHub Actions workflow that runs `pnpm install --frozen-lockfile` and `pnpm test`.

## Decision

1. `frontend/` is a member of the pnpm workspace, in the same repository: `packages: - frontend` in `pnpm-workspace.yaml`. There is one `pnpm-lock.yaml`, at the root (commit `9767a30`).
2. The frontend is excluded from the backend build, the Jest run and the Docker context: `frontend` in the `exclude` list of `tsconfig.build.json`, `<rootDir>/frontend/` in `testPathIgnorePatterns` of `jest.config.js`, and a `frontend` line in `.dockerignore` (commit `3eb0303`).
3. The scaffold comes from create-next-app (commit `de98d06`): Next.js 16.4.0, React 19.3.0, TypeScript, Tailwind CSS, ESLint and the App Router, with `app/` directly under `frontend/` (no `src/` directory). The option `experimental.agentFeedback` is set to `false` in `next.config.ts`. It controls whether `next dev` creates and updates instructions for detected AI coding agents; it is disabled so that no file is changed by that mechanism.
4. The dev server listens on port 3001 (`next dev -p 3001`, commit `b6696c5`), because the backend listens on port 3000 by default.
5. Two boundaries keep a later split into services possible: the frontend will reach the API through one base URL defined in a single place, and no code is imported between `frontend/` and `src/`. Both rules are written in `CLAUDE.md` (see ADR 0004). The accounts screen follows them: the API address is defined only in `frontend/lib/api.ts`, and nothing in `frontend/` imports from `src/`.
6. Moving the backend into a `backend/` folder is postponed. It would touch the Dockerfile, the CI workflow, `jest.config.js`, `nest-cli.json` and the tsconfig files. It will be done in its own branch, with `git mv`, before any work on services. Done: see [ADR 0012](0012-backend-and-frontend-in-sibling-folders.md).

## Alternatives considered

- An independent frontend project with its own lockfile and an untouched root. Not chosen: it would have to be migrated to a workspace when services arrive. How pnpm 10.11.0 handles an install run in an unlisted subfolder under a root that has a `pnpm-workspace.yaml` was not verified.
- Moving the backend to `backend/` now. Postponed, see decision 6.

## Consequences

- A single `pnpm install` at the root installs the backend and the frontend.
- Adding a workspace member changes the root lockfile, so the CI and the Docker build had to be checked again.
- create-next-app generated its own `frontend/pnpm-lock.yaml` and `frontend/pnpm-workspace.yaml`. They were not committed (moved outside the repository), so the root lockfile stays the only one.
- The frontend is not yet checked by the CI: there is no lint or build step for it.

## Verification

### Proven

- `pnpm install --frozen-lockfile` succeeds with the unified lockfile.
- `pnpm test`: 4 suites and 20 tests pass with the Jest exclusion.
- After `nest build`, `dist/main.js` exists and `dist/frontend` does not.
- `docker build -t hedera-wallet .` succeeds after the workspace change.
- GitHub Actions run #5, after the scaffold commit, was green (reported by the author).
- Frontend lint and build pass locally. The accounts screen was tested by hand in a browser on port 3001 against the running backend: account creation, balance lookup, a malformed ID and an unknown ID.

### Not proven

- The pnpm behavior without a `packages` list in version 10.11.0: the documentation read describes version 12.x.
- That `nest build` reads `tsconfig.build.json` by default: observed in the build output, not confirmed in the documentation.
- The two boundary rules are only checked by reading the code. Nothing enforces them automatically.
- A Jest warning, "worker process has failed to exit gracefully", appeared once locally. The cause is unknown; the CI passes.