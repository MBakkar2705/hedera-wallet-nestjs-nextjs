# ADR 0017: One operator account in the environment and one shared Hedera client

- Status: Accepted
- Date: 2026-10-13
- Note (2026-10-13): Decision 4 was superseded in the same lot: `transferHbar` now sends the transfer with the shared client and the sender only signs it, so the operator pays the fees of every operation of the backend (the author's choice, for consistency with the tokens). `transferHbar` no longer creates a client. No longer current: the third paragraph of "Context" (the fourth client), item 4 of "Decision", item 6 of "Consequences" and the alternative "Use the shared client in `transferHbar` too". Observed by the author: a transfer of 1 ℏ from `0.0.10952224` to `0.0.6106565`, made from the page `/transfer`, answered `SUCCESS` with the transaction ID `0.0.6106565@1791924039.660729844`, which starts with the operator account (the first part of a transaction ID is the account that pays), and the balance of the sender went from `8.99891412` to `7.99891412` ℏ, exactly the amount sent. The balance of the operator was not used as a measure, because each lookup of an account also costs it about 0.00113 ℏ. Not tested: a transfer from an account whose balance is too low, and the answer for a malformed account ID, compared with the previous code.
- Note (2026-10-13): The last item of "Not proven" (the CI with this change) is no longer current: the CI ran green on the commits of this decision (reported by the author).

## Context

Before this decision, the backend read two pairs of environment variables for what holds the same account on the author's machine (ADR 0007, item 10 of `docs/backend-evolutions.md`):

- `OPERATOR_ID` and `OPERATOR_KEY`, read by `HederaModule` (which provides `HEDERA_CLIENT`, used by `TopicsService`) and by `TokensService`.
- `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY`, read by `AccountsService`.

Three Hedera clients were created at startup, one in each of these three places, and each was closed at shutdown by the class that created it. `TokensService` stopped with a clear message when its variables were missing (`Missing operator credentials in environment variables`); `HederaModule` and `AccountsService` read the variables with `!` and did not check them (the two startup failures of ADR 0007 came from there).

From the code, `AccountsService.transferHbar` also creates a fourth client at each call, with the account of the sender as operator, and never closes it. That client is not a copy of the operator client: its operator changes at each request.

The criteria used to choose:

- **One place** where the operator variables are read and checked.
- **A clear failure at startup** when one is missing.
- **No change of behaviour** for the operations that already use the operator account.
- **Testable** without a network.

## Decision

1. **The operator account is `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY`.** `OPERATOR_ID` and `OPERATOR_KEY` are no longer read.
2. **`createHederaClient()`** (`backend/src/hedera/hedera-client.ts`) reads the two variables and builds the client. If one is absent or empty, it throws `Missing environment variable(s): ` followed by the names of the missing variables, and the application stops at startup.
3. **One client is shared.** `HederaModule` provides it as `HEDERA_CLIENT` and closes it at shutdown. `AccountsService` and `TokensService` receive it with `@Inject('HEDERA_CLIENT')`; they no longer create or close a client.
4. **`transferHbar` is not changed by this decision.** It keeps its own client, so the sender pays its fees, while the operator pays the fees of the operations that use the shared client (item 24 of `docs/backend-evolutions.md`).
5. **The commented-out `HEDERA_CLIENT_PROVIDER` in `tokens.module.ts` is removed.** It described the previous way of building the client.

## Alternatives considered

- **Keep `OPERATOR_ID` and `OPERATOR_KEY`, and drop the other pair.** Not chosen: the author chose the `HEDERA_*` names. The criteria do not separate the two pairs. `OPERATOR_*` was read in two of the three places, so keeping it would have changed one file (the accounts service) instead of two.
- **Keep three clients and merge only the variables.** Not chosen: the variables would still be read, and checked, in three places, or through a helper function used three times. The diff would be smaller. Not tested.
- **A new name for the pair.** Not examined.
- **Use the shared client in `transferHbar` too.** Not done in this decision: it changes who pays the fees of a transfer of HBAR, which is a decision of its own.
- **Build the client in each service from a shared function, without injection.** Not examined.

## Consequences

- The variables are read, and checked, in one place. The unit tests of the two services no longer set environment variables: they provide a mock for `HEDERA_CLIENT`.
- The check of the variables left the tokens service: its test "should throw if operator credentials are missing" moved to `hedera-client.spec.ts`.
- The shared client is created with the key as a text. From the source of the SDK 2.68.0 (read, not run), `setOperator` with a text calls `PrivateKey.fromStringDer`, which falls back to `PrivateKey.fromString` when the key has no DER header: the same keys as before are accepted.
- The shared client is closed once, by `HederaModule`. The end-to-end test and the unit tests exit normally; the shutdown of the running application was not observed.
- A key with a wrong format still fails inside the SDK, with the message of the SDK. This was not tested.
- `transferHbar` still creates a client at each call and never closes it (from the code, not observed at runtime). The fees of the HBAR transfers and of the other operations are paid by different accounts (item 24).
- `OPERATOR_ID` and `OPERATOR_KEY` in an existing `.env` are ignored.

## Verification

### Proven

All observed by the author on 2026-10-13.

- `pnpm test` runs 7 suites and 45 tests, all passing (5 tests in `hedera-client.spec.ts`: both variables absent, only the key absent, only the account absent, empty values, and a client whose operator is the configured account). `pnpm --filter backend lint` reports no problem, `format:check` passes, and `test:e2e` runs 7 tests, all passing.
- With the usual `.env` (both pairs present), the backend started. On the page `/accounts`, the lookup of `0.0.10952224` showed a balance of `8.99891412 ℏ` and 1 token (`TST2`), through the shared client.
- On the page `/tokens`, the creation of the token `TestToken4` (`TST4`, supply 1000) gave `0.0.11016906`, and the token appeared first in the list.
- With `DOTENV_CONFIG_PATH=inexistant.env` (no variable loaded), `pnpm start` stopped with `Error: Missing environment variable(s): HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY` and `Exit status 1`. The log showed only `Starting Nest application...` before the error, so the failure comes before the other modules are loaded.
- With `OPERATOR_ID` and `OPERATOR_KEY` commented out in `backend/.env`, the backend started and the same lookup showed the same balance.

### Not proven

- The creation of an account, the association of a token and the transfer of a token with the shared client (only the unit tests cover them).
- The startup with only one of the two variables absent, and with an empty value (unit tests only).
- A key with a wrong format.
- The shutdown of the running application (Ctrl+C) with one client.
- The container (`docker run`), which has never been run with real credentials (ADR 0007).
- The CI with this change.
