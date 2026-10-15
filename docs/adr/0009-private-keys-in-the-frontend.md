# ADR 0009: Private keys in the frontend

- Status: Accepted
- Date: 2026-10-08
- Note (2026-10-09): written while the frontend was being added; it has four screens now (see ADR 0010 and ADR 0011). The `src/` paths below are `backend/src/` since ADR 0012.
- Note (2026-10-15): The backend no longer stores the private key of the account that it creates: the column `privateKey` of the table `accounts` was removed, and `POST /accounts` still returns the key once (ADR 0022). The backend still receives a key in the body of the requests that sign; since the same date it reads a key of 64 hexadecimal characters with the type of the account (ADR 0023).

## Context

The NestJS backend has no authentication. Some endpoints take a Hedera private key in the request body: for example, the `POST /tokens/transfer` example in the README sends `fromPrivateKey`.

A Next.js frontend is being added in `frontend/`. To call these endpoints, the frontend needs the private key of the account that signs the operation.

This project targets the Hedera testnet and is a demonstration.

## Decision

1. The user enters the key explicitly in the page. The frontend keeps it in page memory only and never stores it in `localStorage`, `sessionStorage`, cookies, URLs or logs.
2. The backend is not changed for this: it keeps receiving the key in the request body.
3. Operator credentials (`OPERATOR_ID`, `OPERATOR_KEY`) stay in the backend `.env` file and never appear in the frontend code. In the frontend, only the API base URL may use a `NEXT_PUBLIC_` variable, because those variables are readable by any visitor. One exception, for the testnet demo: tokens created by the backend are held by the operator account, so sending them requires its key. The user may type that key in the form of the active account, like any other key.
4. CORS on the backend is limited to one explicit origin: `app.enableCors({ origin: 'http://localhost:3001' })` in `src/main.ts`.
5. In the frontend, the key is typed once and held in an active account in memory, shared by the screens (see ADR 0010).

## Alternatives considered

Signing in the browser with a wallet, so that no private key is sent to the API. This is a possible evolution and it is not implemented. It would require changing the backend (`src/`) and its unit tests (4 suites, 20 tests). It was not chosen because the first goal is a working frontend on the existing API, and this project is a testnet demo.

## Consequences

- No change to `src/` services and no change to the 20 existing tests.
- The user types a private key into a web page. A key held in page memory can still be read by any script that runs in that page.
- This approach is acceptable for a testnet demo only. It must not be used with real funds.
- CORS is enforced by the browser; it is not access control. Any client that is not a browser can still call the API.
- Typing the operator key in the page exposes it to the same risks as any other key (see ADR 0010). This is acceptable on the testnet only.
- Moving to wallet signing later is possible but is a backend change and needs its own ADR.

## Verification

### Proven

- `src/main.ts` contains the line `app.enableCors({ origin: 'http://localhost:3001' });` (commit `3b498dd`).
- The CORS response header was checked with `curl` against the running backend.
- The README documents a request body with `fromPrivateKey` for `POST /tokens/transfer`.
- From the accounts page of the frontend, in a browser, a JSON POST to `/accounts` got a preflight response (204) and then a 201 response, which the page displayed. No CORS error appeared in the console.
- After a page reload, the active account and its key were gone (observed in the browser, see ADR 0010).
- From the tokens screen, a token was created (`0.0.10951658`), the account `0.0.10940355` was associated with it, and 10 tokens were sent to it from the treasury account `0.0.6106565`, activated with the form (transaction `0.0.6106565@1791534924.694135764`). The lookup of the receiving account then showed `Token associations: 1`.

### Not proven

- That the frontend never stores a key: the keys are held in React state only. A search in the files of the accounts, transfer, tokens and topics screens and the active account (`app/`, `components/`, `lib/active-account.tsx`, `lib/transfer.ts`, `lib/accounts.ts`, `lib/tokens.ts`, `lib/topics.ts`) found no call to `localStorage`, `sessionStorage` or cookies, but the browser storage was not inspected.
- The effort of wallet signing: the statement that it requires changes in `src/` and in the tests is an assessment, not a measurement.