# ADR 0006: Continuous integration with GitHub Actions

- Status: Accepted (the steps amended by the notes of 2026-10-11, 2026-10-14 and 2026-10-15)
- Date: 2026-10-09
- Note (2026-10-11): `.github/workflows/ci.yml` now also runs, after `pnpm test`, the backend lint (`pnpm --filter backend lint`), the backend format check (`pnpm --filter backend format:check`) and the backend end-to-end test (`pnpm --filter backend test:e2e`). The author asked for this change explicitly, naming the file (see the note of 2026-10-10 in ADR 0004). The criterion "No secrets" still holds, because the end-to-end test generates throwaway Hedera credentials (ADR 0013). The CI was green with these steps on commit `24ade28` and on the commits after it (reported by the author). In "Decision", the list of steps and the count "six steps" are no longer current. In "Consequences", the second and third items are no longer current for the backend lint and the end-to-end test, and the Docker build is still not in the CI. In "Not proven", the last item is no longer current for the backend lint and the end-to-end test. The fourth item of "Consequences" is amended by ADR 0004: the assistant edits this file only at the explicit request of the author.
- Note (2026-10-14): `.github/workflows/ci.yml` now also runs `pnpm --filter backend build` (`nest build`), after the backend end-to-end test and before the frontend lint. The author asked for this change explicitly, naming the file, in the lot Strict TypeScript (ADR 0018, item 25 of `docs/backend-evolutions.md`). Reason: the workflow had no step that compiles the backend with `tsconfig.build.json`; only the unit tests and the end-to-end test compile the files they load, and which files of `backend/src/` they load was not examined. In "Decision", the list of steps and the count "six steps" are no longer current. In "Consequences", the third item is also no longer current for the backend build; the Docker build is still not in the CI. Observed by the author: `pnpm --filter backend build` ran without error on 2026-10-14. The CI with this step had not been observed when this note was written.
- Note (2026-10-14): The CI ran green with the step `pnpm --filter backend build` on commit `1718c2a` (reported by the author). That the step turns red on a type error was not tested: no failure was provoked on purpose.
- Note (2026-10-15): `.github/workflows/ci.yml` now also runs `pnpm --filter frontend format:check` (Prettier with its default style, see `frontend/.prettierrc`), after the frontend lint and before the frontend build. The author asked for this change explicitly, naming the file, in the lot Hygiene and security (item 29 of `docs/backend-evolutions.md`). The CI was green with this step on commit `5acc410` (reported by the author). Not tested: that the step turns red on a file that is not formatted (no failure was provoked on purpose).

## Context

The repository has a backend with unit tests and a frontend with a linter and a build. Each of these checks can fail after a change, and running them by hand before every commit depends on remembering to do it. The repository is hosted on GitHub.

The criteria used to choose how to run the checks:

- **Automatic:** the checks run on every push and every pull request, without action from the author.
- **Same platform:** no external service or extra account to set up.
- **Same conditions as the local setup:** same Node.js version and the same locked dependencies.
- **No secrets:** the checks must not need the Hedera credentials.
- **Simplicity:** one file in the repository, easy to read.

## Decision

A GitHub Actions workflow, `.github/workflows/ci.yml`, runs on every push and every pull request. It has one job, `test`, on `ubuntu-latest`, which runs these steps:

1. Checkout of the repository.
2. pnpm setup, at the version given by `packageManager`, and Node.js 22 with the pnpm cache.
3. `pnpm install --frozen-lockfile`.
4. `pnpm test`: the backend unit tests.
5. `pnpm --filter frontend lint`.
6. `pnpm --filter frontend build`.

How it meets the criteria:

1. **Automatic.** The triggers are `push` and `pull_request`. A new run on the same branch cancels the previous one still in progress (`concurrency`).
2. **Same platform.** GitHub Actions is part of GitHub, and the workflow is a file of the repository.
3. **Same conditions.** Node.js 22 is the version of the Docker image (ADR 0005), and `--frozen-lockfile` installs exactly the versions of `pnpm-lock.yaml`.
4. **No secrets.** The unit tests replace the Hedera SDK and the database with mocks (ADR 0003), so no `.env` file is needed. The workflow has the permission `contents: read` only.
5. **Simplicity.** One file, one job, six steps.

## Alternatives considered

- **No CI: tests and build run by hand.** Rejected on the automatic criterion. A check that is not run is not a check, and a broken commit could reach the main branch without notice.
- **Another CI service, such as GitLab CI or CircleCI.** Rejected on the same platform criterion. The repository is on GitHub, and another service means another account, another configuration and another place to look at the results.
- **A CI that also builds the Docker image or runs the tests inside it.** Rejected on the simplicity criterion for now. It would take longer, and the image build is already run by hand (ADR 0005). It can be added later.

## Consequences

- Every push shows a check on GitHub, and a pull request shows the result before the merge.
- The CI checks what its steps cover: the backend unit tests, the frontend lint and the frontend build.
- The CI does not run the backend lint, the end-to-end test or the Docker build (`docs/backend-evolutions.md`, item 11, for the first two). The frontend has no test script.
- The workflow file is a protected file for the AI assistant (ADR 0004): the author edits it.

## Verification

### Proven

- `.github/workflows/ci.yml` contains the triggers `push` and `pull_request`, `permissions: contents: read`, `concurrency`, `node-version: 22`, `pnpm install --frozen-lockfile` and the three checks `pnpm test`, `pnpm --filter frontend lint` and `pnpm --filter frontend build`.
- The CI was green on the branch `refactor/backend-folder`, on `feature/frontend-nextjs`, and on commit `d97c3c7` (reported by the author).

### Not proven

- That the CI turns red when a test fails: no failure was provoked on purpose.
- The backend lint, the end-to-end test and the Docker build: they are not in the CI.
