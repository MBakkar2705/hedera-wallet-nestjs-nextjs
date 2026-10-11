# ADR 0005: A multi-stage Docker image for the backend

- Status: Accepted (the run command amended by the note of 2026-10-11)
- Date: 2026-10-09
- Note (2026-10-11): `docker run --init` was tried. The run command is now `docker run --rm --init -p 3000:3000 --env-file backend/.env hedera-wallet`. The Dockerfile is unchanged, and `--init` must be given at each start. Observed by the author: without `--init`, Ctrl+C had no effect after about 30 seconds and `docker stop` took about 10 seconds; with `--init`, Ctrl+C stopped the container in about 2 seconds. In the Nest log, the application is process 1 without `--init` and process 7 with it. The cause was not tested separately. Another way to get the same result (in the image or in the code) was not evaluated. The last item of "Consequences" and the last item of "Not proven" are no longer current.

## Context

The backend needs Node.js, pnpm, a compilation step for TypeScript, and the native addon of `sqlite3`. Running it on another machine means installing the same versions of these tools.

The criteria used to choose how to package and run the backend:

- **Reproducibility:** the same result on any machine, without installing Node.js or pnpm.
- **Lockfile fidelity:** the dependencies installed are exactly those of `pnpm-lock.yaml`.
- **Small runtime:** the final image contains only what is needed to run: no compiler, no development dependencies.
- **Security:** no secret in the image, and no process running as root.
- **Simplicity:** one command to build and one to run.

## Decision

The backend has a multi-stage Dockerfile, `backend/Dockerfile`, built from the repository root:

```
docker build -f backend/Dockerfile -t hedera-wallet .
```

How it meets the criteria:

1. **Reproducibility.** The image is based on `node:22-bookworm-slim`, and pnpm is installed with Corepack at the version given by `packageManager`.
2. **Lockfile fidelity.** The dependencies are installed with `pnpm install --frozen-lockfile --filter backend`, which fails if the lockfile and the `package.json` files disagree. The build context is the repository root because the lockfile and the workspace files are there (see ADR 0012).
3. **Small runtime.** The stages are separated: `toolchain` (compiler tools for the native addon), `build` (all dependencies, compiles TypeScript to `dist/`), `prod-deps` (production dependencies only) and `runtime`. The runtime image receives only the production dependencies, `dist/` and `package.json`.
4. **Security.** The runtime runs as the `node` user, with `NODE_ENV=production`. `.dockerignore` excludes every `.env` file, the `*.db` files, `.git`, `frontend` and `docs` from the build context. The Hedera credentials are given when the container starts:

   ```
   docker run --rm -p 3000:3000 --env-file backend/.env hedera-wallet
   ```
5. **Simplicity.** One build command and one run command, both in the README.

## Alternatives considered

- **No container: Node.js and pnpm installed on the machine.** Not replaced, kept as the other way to run the backend (see Setup in the README). Rejected as the only way on the reproducibility criterion: it depends on the versions installed on each machine.
- **A single-stage Dockerfile.** Rejected on the small runtime and security criteria. The final image would contain the development dependencies, the TypeScript compiler and the build tools of the native addon (`python3`, `make`, `g++`).
- **Docker Compose.** Rejected on the simplicity criterion. The backend is the only service: the database is a local file, and the frontend is not in the image. A Compose file would add a file without adding a service.

## Consequences

- The image contains the backend only. The frontend is not containerized.
- The credentials are not in the image, but they are in the environment of the running container, where `docker inspect` shows them to anyone who can use Docker on the machine.
- The database file `hedera-wallet.db` is written inside the container, in the working directory. It disappears with the container, unless a volume is mounted, which is not done here.
- The CORS origin is written in the code (`http://localhost:3001`), so the image allows that origin only (`docs/backend-evolutions.md`, item 9).
- Ctrl+C in the terminal does not stop the container, and `docker stop` is needed (`docs/backend-evolutions.md`, item 15).

## Verification

### Proven

- `backend/Dockerfile` has the stages `base`, `toolchain`, `build`, `prod-deps` and `runtime`, uses `pnpm install --frozen-lockfile --filter backend`, sets `USER node` and `NODE_ENV=production`, and exposes port 3000.
- `.dockerignore` lists `**/.env`, `**/.env.*`, `**/*.db`, `frontend` and `docs`.
- `docker build -f backend/Dockerfile -t hedera-wallet .` succeeded, and the container started with `--env-file backend/.env` and served Swagger (observed by the author, see ADR 0012).
- Ctrl+C did not stop the container, and `docker stop` did (observed by the author).

### Not proven

- Requests from the host to the containerized backend that call Hedera, and where the database file ends up in the container (see ADR 0012).
- The size of the image: it was not measured.
- That `docker run --init` makes Ctrl+C work: not tried.
