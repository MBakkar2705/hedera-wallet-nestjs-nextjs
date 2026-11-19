# ADR 0024: The decimals of the tokens come from the mirror node

- Status: Accepted
- Date: 2026-11-18

## Context

Item 3 of `docs/backend-evolutions.md` and ADR 0015 record that the balance of a token is given in the smallest unit of the token and that its decimals are not part of the response. Facts that can be checked:

- Observed by the author (2026-11-18): a token created by a script with `setDecimals(2)` (`0.0.11498627`, supply 1000 units) and 150 units sent to an account. The lookup of the account gave `"balance":"150"` and nothing told whether it meant 150 or 1.50. The mirror node (`GET /api/v1/tokens/0.0.11498627`, read by the assistant) gives `decimals: "2"`, and HashScan shows `DECIMALS 2` and `TOTAL SUPPLY 10.00`.
- `AccountBalanceQuery` with the SDK 2.81.0 answered `BUSY` after 10 attempts, with and without the operator account (observed by the author, 2026-11-18). The documentation of Hedera, read by the assistant, says this query was removed and that the balances of the tokens are read from the mirror node.
- `GET /api/v1/accounts/0.0.11046727/tokens` on the testnet mirror node answered, in Edge (observed by the author, 2026-11-18), one page with `balance` and `decimals` for the three tokens of the account and `"links":{"next":null}`. The documentation read by the assistant says the field `decimals` was added by HIP-873.
- `AccountInfoQuery` gives the symbol and the balance of each token, not its decimals (ADR 0015).
- The frontend has no test runner: its CI steps are `lint`, `format:check` and `build` (read in `frontend/package.json` and `.github/workflows/ci.yml`).

## Decision

1. `getAccountInfo` keeps `AccountInfoQuery` and reads the decimals from the mirror node with `GET /api/v1/accounts/{id}/tokens?limit=100`, following `links.next`, at most 10 pages, with a timeout of 5 seconds per request. It does not call the mirror node when the account has no token.
2. Each token of the response carries `decimals` (a number or `null`) and `amount` (the balance with the decimals applied, as an exact decimal string, or `null`). `balance` does not change. The conversion uses text only, with no floating point number (`formatTokenAmount`): 150 with 2 decimals is `"1.50"`.
3. When the mirror node cannot be read, or does not know a token, `decimals` and `amount` are `null` and the lookup of the account succeeds.
4. The URL is `MIRROR_NODE_URL`, with the public mirror node of the testnet as default, read at each call. A link of the mirror node that leads to another host is not followed.
5. The page `/accounts` shows the `amount` of each token, with the balance in units and the decimals under it (`decimals unknown` when they are `null`). The form of the transfer of tokens says "Amount in units" and, under the field, how many units make a token and what the amount typed is worth, from the tokens of the active account. The transfer still sends the units that are typed (item 33).

## Alternatives considered

- `TokenInfoQuery` for each token: one paid request for each token, which ADR 0015 had refused (an account can have 285 tokens). The cost of one of them was not measured.
- `AccountBalanceQuery`: no longer works (`BUSY`).
- `MirrorNodeTokenBalanceQuery` of the SDK: according to the documentation read by the assistant, the JavaScript SDK returns one token per query, so one request for each token. Not tried.
- A table of the decimals in the local database: it would only cover the tokens created by this backend (always 0 decimals), not a token created elsewhere such as `0.0.11498627`.
- The conversion of the balance in the frontend only: an exact conversion is easier to check in the backend, which has tests.
- A form of transfer that accepts `1.50` and converts it: it changes the contract of `POST /tokens/transfer` (item 33).

## Consequences

- A client can show `1.50` where it showed `150`; the response only gains two fields.
- The lookup now depends on a second service. In the worst case it waits for 10 requests of 5 seconds each before answering without decimals.
- According to the Hedera documentation read by the assistant, the mirror node ingests a few seconds after the consensus: a token that was just associated may show `null` for a moment.
- The container needs an access to the mirror node over HTTPS.
- The frontend holds a small copy of the conversion (`frontend/lib/token-amount.ts`) to write the line under the amount of the transfer. It has no automated test. A mistake there would only make the line wrong: the transfer sends the units that are typed.

## Verification

### Proven

- The tests (84 in 10 suites: the reading of the pages, the link to the next page, text decimals, a link to another host, an error status, a network failure, an answer that is not JSON, the maximum of pages, the exact conversion, the service with and without the mirror node, the configuration), the lint, the format check and the build of the backend pass; the lint, the format check and the build of the frontend pass (observed by the author, 2026-11-18).
- On the running backend, `GET /accounts/0.0.11046727` returned `decimals` 2 and `amount` `"1.50"` for `0.0.11498627`, and `decimals` 0 for `0.0.11046969` and `0.0.11504354` (observed by the author, 2026-11-18).
- In Edge (InPrivate, development mode, observed by the author, 2026-11-18): the page `/accounts` shows `1.50` with `150 units · 2 decimals` for `0.0.11498627`, `10` with `10 units · 0 decimals` for `0.0.11046969` and `0` for `0.0.11504354`; the form of the transfer, with the account `0.0.11046727` active, says "This token has 2 decimals: 1 token = 100 units. If you send 1000 units, it corresponds to 10.00 DEC2." for `0.0.11498627`, the same with "0 decimals", "1 unit" and "10 TST6" for `0.0.11046969` and 10 units, and "The decimals of this token are unknown" for `0.0.11037973`, a token that the account does not hold. Nothing was sent.

### Not proven

- An account with many tokens (the operator account has 285, so 3 pages), and the rate limit of the public mirror node.
- The failure of the mirror node in a real run: it is only tested with a fake `fetch`.
- A token that was just associated, and the worst case of the waiting time.
- The container, and `MIRROR_NODE_URL` set to another value in a real run.
- The line under the amount of the transfer in the other cases (a decimals value of 1, an amount with leading zeros, a very large amount), and other browsers than Edge: no automated test covers it.
