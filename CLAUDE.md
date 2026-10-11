# CLAUDE.md

## Project

Hedera wallet. NestJS backend in `backend/` (source in `backend/src/`), Next.js frontend in `frontend/`. Both are members of one pnpm workspace: `pnpm-workspace.yaml` and `pnpm-lock.yaml` are at the repo root. The repo uses pnpm.

Current work: evolving the backend, one lot at a time, following `docs/backend-evolutions.md`. One lot = one branch = one pull request.

Claude writes the code in `backend/`, `frontend/` and `docs/`, after a detailed plan I approve and with diffs I review. I run the tests, review every change and commit. I must be able to explain every change before I commit it.

## Commands (backend)

- Install: `pnpm install`
- Test: `pnpm test` at the repo root runs the backend tests (4 suites, 20 tests; all must pass)

## Commands (frontend)

- Dev server (port 3001): `pnpm --filter frontend dev`
- Lint: `pnpm --filter frontend lint`
- Build: `pnpm --filter frontend build`
- There is no frontend test script yet.

## Rules

- Never read, create or print any `.env` file (including `.env.local`) or any private key.
- Never put a secret in frontend code. Anything prefixed `NEXT_PUBLIC_` is readable by any visitor: only the API base URL may go there, never `OPERATOR_ID`, `OPERATOR_KEY` or any private key.
- Some backend endpoints take a private key in the request body (Hedera testnet demo only). In the frontend, keys stay in page memory only: never in `localStorage`, `sessionStorage`, cookies, URLs or logs.
- Before writing any file, give me a detailed plan: the files to change, what changes in each, why, and which tests are affected. Write only the files named in the plan I approved. After writing, show the diff and explain each choice.
- Do not modify `.github/`, the root `package.json` or `pnpm-workspace.yaml` unless I explicitly ask, naming the file. `pnpm-lock.yaml` changes only through `pnpm install` when a dependency is added, and Claude tells me.
- Backend: run `pnpm test` at the repo root after any change that touches the backend, and report the result. Frontend: after any change in `frontend/`, run `pnpm --filter frontend lint` and `pnpm --filter frontend build`, and report the result.
- When a change alters an API response shape, update the tests, Swagger, the README and the frontend in the same lot.
- Documentation: code, README and the ADRs concerned go in one commit. Update the documentation only after my tests: a "Proven" list contains only what was observed. Create an ADR only for a real decision with alternatives. The body of an ADR is a record: only its status and notes change.
- Never say something works unless it was run and observed. Say what was not verified.
- Keep the API base URL in a single place in the frontend, and do not import code between `frontend/` and `backend/src/`, so the backend can later be split into services without changing the frontend.
- Do not run `git commit` or `git push`. I do the commits myself after reviewing. Read-only git is allowed.
- Stay on the current branch; do not create or delete branches. I create them.
