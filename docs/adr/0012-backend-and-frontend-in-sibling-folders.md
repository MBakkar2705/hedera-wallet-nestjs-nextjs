# ADR 0012: Backend and frontend in sibling folders

- Status: Accepted
- Date: 2026-10-09
- Note (2026-11-18): The first item of "Not proven" is no longer current: a request that calls Hedera was sent to the containerized backend and the place of its database file was read (see the note of 2026-11-18 in ADR 0005). The other items are unchanged.

## Context

The backend lived at the repository root (`src/`, `test/`, `package.json`, `Dockerfile`, Jest, Nest and TypeScript configuration) and the frontend in `frontend/`, so the root mixed the files of one application with the files of the whole repository. The configuration of the backend had to exclude `frontend` (`tsconfig.build.json`, `jest.config.js`, `.dockerignore`). ADR 0008, decision 6, postponed the move into `backend/` and planned it in its own branch, with `git mv`.

Two paths in the code are relative to the folder the backend is started from, so they move with the start folder: `import 'dotenv/config'` in `src/main.ts` reads `.env` there (ADR 0007), and `database: 'hedera-wallet.db'` in `src/app.module.ts` creates the SQLite file there.

## Decision

1. The backend files move to `backend/` with `git mv`: `src`, `test`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.js`, `eslint.config.mjs`, `Dockerfile`, `.env.example` and `package.json`. The move is its own commit, with renames only, so that git keeps the history of each file.
2. `pnpm-workspace.yaml` lists `backend` and `frontend`. The lockfile stays at the repository root. The root `package.json` is a new, private, minimal file: it keeps `packageManager` (read by the CI) and has the scripts `test`, `test:cov`, `start` and `build`, which run `pnpm --filter backend <script>`. `pnpm test` and `pnpm start` still work from the root.
3. `.env` and `hedera-wallet.db` live in `backend/`, next to where the backend is started. No line of `backend/src/` changes.
4. The `Dockerfile` is `backend/Dockerfile`. The image is built from the repository root, because the lockfile and the workspace files are there: `docker build -f backend/Dockerfile -t hedera-wallet .`. Dependencies are installed with `--filter backend`. The runtime image has `WORKDIR /app/backend` and copies both `node_modules` folders (the packages are stored in `/app/node_modules/.pnpm` and linked from `backend/node_modules`).
5. `.gitignore` uses `node_modules` and `/backend/dist`, and `.dockerignore` uses patterns valid at any depth (`**/node_modules`, `**/dist`, `**/.env*`, `**/*.db`), because the former patterns `/node_modules` and `/dist` only match at the root.
6. The CI workflow keeps one job. After the backend tests it runs `pnpm --filter frontend lint` and `pnpm --filter frontend build`.
7. In `pnpm-lock.yaml`, the importer `.` is renamed `backend` by hand, instead of letting pnpm resolve again. pnpm adds an empty `.: {}` entry for the root.
8. `CLAUDE.md` is updated with the new paths. Its rule on protected files now protects the `backend/` folder.

## Alternatives considered

- Keeping the backend at the root. Not chosen: the root keeps mixing the files of both applications, and the exclusions of `frontend` stay.
- A layout with an `apps/` folder (`apps/backend`, `apps/frontend`). Not chosen: one more level of folders for two applications.
- Keeping `.env` at the root and loading it with a path to the parent folder. Not chosen: it needs a change in `backend/src/` and a relative path to the parent folder, which breaks when the start folder changes.
- Letting pnpm rewrite the lockfile. Tried first, then rejected, see the verification.
- Separate repositories. Not reconsidered here: ADR 0008 integrates the frontend in this repository.

## Consequences

- Older records cite the paths before the move: `src/`, `.env` at the root, the protected files at the root (ADR 0009, ADR 0008, ADR 0007, ADR 0004, and the steps of the README). ADR 0008, ADR 0007 and ADR 0004 carry a note in their status. The README explains the rule once, in "Progress Details".
- Whoever clones the repository creates `backend/.env` from `backend/.env.example`.
- An existing local `.env` and `hedera-wallet.db` at the root are not used any more: they must be moved to `backend/` by hand. The old `node_modules` and `dist` at the root are stale and must be deleted before `pnpm install`.
- `packageManager` is written in three `package.json` files (root, backend, frontend). They can drift.
- The runtime image copies two `node_modules` folders. A change in the pnpm layout could break the image.
- With the documented `docker run` command, Ctrl+C did not stop the container, which has to be stopped with `docker stop` (see `docs/backend-evolutions.md`).
- The backend lint and the e2e test do not run, as before the move (see `docs/backend-evolutions.md`).

## Verification

### Proven

- The commit of the renames (`f3f4d7d`) contains 41 files, all renamed with a similarity of 100%.
- After `pnpm install`, `git status` listed only the expected files: no `node_modules`, no `dist`.
- A first `pnpm install` rewrote the lockfile and changed transitive versions, although the direct dependencies were identical: 51 entries of `snapshots` changed (for example `debug` 4.4.1 to 4.4.3, `semver` 7.7.2 to 7.8.5, `js-yaml` 4.1.0 to 4.3.2) and 9 older package versions disappeared. The cause was not investigated. The lockfile was rebuilt from the previous commit with the importer renamed.
- With that lockfile, `pnpm install --frozen-lockfile` printed "Lockfile is up to date, resolution step is skipped". The diff with the previous lockfile is the rename of the importer plus the empty `.: {}` entry.
- `pnpm test` from the root ran the backend script and gave 4 suites and 20 tests passed.
- `pnpm --filter backend build` succeeded. `backend/dist` contains `main.js` and no `frontend` folder.
- `pnpm start` started the backend with no error in the terminal, and Swagger opened at `http://localhost:3000/api`.
- `GET /topics/0.0.10952432/messages` returned the two messages created before the move (ids 5 and 6), so the moved database is the one in use. A message published from Swagger got the id 7. After these requests no `.db` file exists at the root, and `backend/hedera-wallet.db` was modified at the time of the publication (11:11:01).
- The creation of a topic and the publication of a message worked, which shows that `backend/.env` is read.
- `docker build -f backend/Dockerfile -t hedera-wallet .` finished its 24 steps without error. `docker run --rm -p 3000:3000 --env-file backend/.env hedera-wallet` logged "Nest application successfully started" with every route mapped, and Swagger was displayed at `http://localhost:3000/api`.
- Ctrl+C did not stop the container: it appeared in `docker ps` and `docker stop` was needed.
- From the topics page of the frontend, the messages of the topic created from Swagger were listed (1 message). After a message was published from the page, the list showed 2 messages.
- `pnpm --filter frontend lint` reports nothing and `pnpm --filter frontend build` succeeds with six routes.
- The CI on GitHub, with the backend tests and the frontend lint and build, is green on the branch `refactor/backend-folder`, then on `feature/frontend-nextjs` after the fast-forward merge (reported by the author).

### Not proven

- No request was sent to the containerized backend: only its startup and the display of Swagger were checked. The place of its database file inside the container was not inspected.
- The cause of the changed transitive versions, and of Ctrl+C not stopping the container.
- A fresh clone: `git clone`, `backend/.env` created from the template, `pnpm install` and start.
- The system was only tried on Windows.
- `pnpm start` run from inside `backend/`: only the script of the root was used.
- The backend lint and the e2e test: not run (see `docs/backend-evolutions.md`).
