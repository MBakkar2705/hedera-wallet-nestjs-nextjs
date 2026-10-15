# ADR 0022: The private key of a created account is returned once and not stored

- Status: Accepted
- Date: 2026-10-15

## Context

Item 18 of `docs/backend-evolutions.md` records that the private keys were stored in clear in the database. Facts that can be checked:

- The table `accounts` had a column `privateKey` (observed in the SQLite viewer by the author, and its name read by the assistant in the old file on 2026-10-15; no value was read). `createAccount` saved the key of the new account in it.
- The stored key was never read back. On the main branch, `git grep accountRepo` finds the injection of the repository and the two calls of `saveAccountLocally` (`create` and `save`), and nothing else. The operations that sign take the key from the body of the request (ADR 0009).
- `POST /accounts` returns `{ accountId, publicKey, privateKey, initialBalance }`, and the page `/accounts` shows the private key of the new account (`created.privateKey`), which the user must keep.
- No database file was ever committed (`git log --all -- '*.db'` prints nothing), and `*.db` is in `.gitignore` and `.dockerignore`.

The criteria used to choose:

- **A copy of the database file must not give control of accounts.**
- **No change for the callers** of `POST /accounts`.
- **Nothing to maintain** for a value that is never read.

## Decision

1. **The column `privateKey` is removed from `AccountEntity`.** `createAccount` saves `{ accountId, publicKey, initialBalance }` and nothing else.
2. **The response of `POST /accounts` is unchanged**: it still contains `privateKey`. It is the only time the backend holds the key, and the caller must keep it. `createAccount` now has an explicit return type with the four fields.
3. **No data migration.** The keys of the 8 accounts of the old file are not carried to the new database (ADR 0021); the old copy `hedera-wallet.old.db` stays on the disk of the author, outside the repository.

## Alternatives considered

- **Encrypt the key with a secret from the environment.** Not chosen: nothing reads the stored key, so the only effect would be a secret to manage, code to maintain and a value that nobody uses; and the secret would sit on the same machine as the file. Not tried.
- **Hash the key.** Not chosen: a hash cannot be turned back into a key, so it could never sign. It would store something that cannot be used.
- **Keep it in clear.** This was the state before. Not chosen: its only effect is a risk, since a copy of the file gives control of the accounts that were created.
- **Stop returning it too.** Not possible: the caller would never get the key of the account that it created, and the account could not sign.
- **A store for secrets outside the database.** Not examined.

## Consequences

- A key that the caller did not save cannot be found again: the account exists on the testnet and cannot sign any more. The page shows it when the account is created.
- The database no longer holds any private key. The old copy still does, on the disk of the author (outside the repository and the Docker image).
- The key is still sent in the body of the response and of the signing requests, in clear over HTTP in the demo: ADR 0009 is unchanged.
- The unit test of `createAccount` requires that exactly three fields are saved.

## Verification

### Proven

- The old file had `privateKey` among the columns of `accounts` (8 rows); the new file has `id`, `accountId`, `publicKey`, `initialBalance` and `createdAt` (read by the assistant in read-only mode, 2026-10-15).
- Created from the page `/accounts` on 2026-10-15, the account `0.0.11035637` has one row in the new file, with its public key and no key, while the page showed the private key (the author confirmed it and saved the key).
- Signing does not need the stored key: the same account, with the key that the page had shown (typed by the author, in DER form and as 64 hexadecimal characters), sent 1 ℏ twice with the result `SUCCESS` (ADR 0023).
- `pnpm test` (8 suites, 58 tests) and `pnpm --filter backend test:e2e` (10 tests) pass (observed by the author). One end-to-end test requires that the table `accounts` has no column `privateKey`, in a throwaway database.
- The CI was green on the commit of this decision, `111ac7f` (reported by the author).

### Not proven

- That the key never appears in a log of the backend: `grep` finds no `Logger` and no `console` call in the source of the backend outside the tests, but no log was read at runtime.
- The content of `hedera-wallet.old.db`: its 8 keys are not read; the file is still on the disk of the author.
- A client that ignores the key in the response: it is its choice, and it is not examined.
