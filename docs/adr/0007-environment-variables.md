# ADR 0007: Environment variables

- Status: Accepted (decision 1 amended by ADR 0012: the `.env` file is now `backend/.env`; decision 4 superseded by ADR 0017)
- Date: 2026-10-08
- Note (2026-10-13): Decision 4 (both pairs kept) is superseded by [ADR 0017](0017-one-operator-account-and-one-shared-hedera-client.md): the backend reads only `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY`, in `createHederaClient()`, and one client is shared. `OPERATOR_ID` and `OPERATOR_KEY` are no longer read, and `.env.example` lists the two variables, plus three optional ones in comments. No longer current: the "Context" (two pairs read in three places), the second and third items of "Decision" (four variables), the "Alternatives considered" (merging the pairs), and the first two items of "Consequences" (four variables, four in the `docker run` command). The first item of "Not proven" is partly settled: the message at startup is now `Missing environment variable(s): ...`, observed with both variables absent (ADR 0017).

## Context

The backend reads two pairs of variables:

- `OPERATOR_ID` and `OPERATOR_KEY`, read by `hedera.module.ts` and by the tokens service.
- `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY`, read by the constructor of `accounts.service.ts`, so at startup.

The README described only the first pair. The values are loaded by `dotenv` from a `.env` file, and `dotenv` looks in the current working directory.

Two startup failures happened on 2026-10-08:

1. The `.env` file was in `src/`. `dotenv` loaded no variable, and the backend stopped with `Cannot read properties of undefined (reading 'publicKey')` at `hedera.module.ts:10`.
2. After moving the file to the repository root, the variables `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY` were still missing, and the backend stopped with `Cannot read properties of undefined (reading 'startsWith')` at `accounts.service.ts:19`.

## Decision

1. The `.env` file lives at the repository root. It is ignored by `.gitignore`, excluded from the Docker image by `.dockerignore`, and given to a container at runtime with `--env-file .env`.
2. A `.env.example` file with placeholder values for the four variables is committed (commit `df5a446`). The `.env` file is created by copying it.
3. The README documents the four variables in its "Environment Variables" section.
4. Both pairs are kept for now. They can hold the same testnet account.

## Alternatives considered

Merging the two pairs into one now. It needs changes in `src/` and in the unit tests, and it is not needed to move forward. It can be decided later in its own ADR.

## Consequences

- Four variables must be filled in to start the backend.
- The Docker run command in the README needs the four variables, not two. It was updated.
- The code has two names for what can be the same account, until the pairs are merged.

## Verification

### Proven

- A Node check with `dotenv` loaded 2 variables when only the `OPERATOR_*` pair was present, and 4 after the `HEDERA_*` pair was added.
- The backend started after the four variables were in the root `.env` file.
- Git reports `.env` as ignored.
- `.env.example` is committed and a search for real key patterns in it returned nothing.

### Not proven

- The README says the application exits at startup if `OPERATOR_ID`, `OPERATOR_KEY` or `HEDERA_PRIVATE_KEY` is missing. Only two cases were observed: all variables absent, and the `HEDERA_*` pair absent. The other single-variable cases were not tested.
- The container has never been run with real credentials.