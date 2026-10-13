# ADR 0015: Structured amounts and token balances next to the formatted fields

- Status: Accepted
- Date: 2026-10-13

## Context

Before this decision, `GET /accounts/:accountId` returned the HBAR balance as a formatted text and the tokens as a list of IDs, and `POST /accounts/transfer` returned the amount as a formatted text (`docs/backend-evolutions.md`, items 3 and 4):

- `hbarBalance` is `info.balance.toString()`, for example `"1 ℏ"`. In the source of the SDK 2.68.0 (read, not run), `Hbar.toString()` answers `"<n> tinybar"` when the balance is below 10,000 tinybars, and `"<n> ℏ"` otherwise: the unit changes with the amount.
- `tokenAssociations` is built from `rel.tokenId.toString()` only. Observed earlier by the author: an account that received 10 tokens showed `Token associations: 1` and nothing else.
- The `amount` of a transfer is the text `"5 ℏ"`.
- The SDK type `TokenRelationship` (read in the `.d.ts` file) carries `tokenId`, `symbol`, `balance` (a `Long`, in the smallest denomination of the token), `isKycGranted`, `isFrozen` and `automaticAssociation`. It has no number of decimals.
- The only consumer of these responses today is the frontend of this repository. The backend is planned to be split into services later (`docs/backend-evolutions.md`, lot 8), which asks for a stable contract.

The criteria used to choose:

- **Exact values:** an amount or a balance is not rounded by the response format.
- **Stable contract:** nothing that a client already reads is removed or changes type.
- **One reading per use:** a client that displays and a client that computes each find a field made for it.
- **Documented:** the shape appears in Swagger.
- **Small:** no extra call to Hedera for data the account query already returns.

## Decision

1. **The change is additive.** The fields `hbarBalance`, `tokenAssociations` and `amount` stay as they are. New fields are added next to them. The old fields are marked "Kept for compatibility" in Swagger.
2. **`balance`** in the account response is an object with two strings: `hbar`, an exact decimal without a symbol (`to(HbarUnit.Hbar).toFixed()`), and `tinybars`, the same balance as an integer (`toTinybars().toString()`).
3. **`tokens`** in the account response is a list of `{ tokenId, symbol, balance }`. `balance` is a string in the smallest unit of the token. The decimals of the token are not part of the response.
4. **The transfer response** gets `value`, the amount as a number, and `unit`, the text `"HBAR"`, next to `amount`.
5. **Swagger describes the two responses** with classes (`AccountInfoResponseDto`, `TransferHbarResponseDto`), and the transfer is documented with its real status, 201, instead of 200.

## Alternatives considered

- **Replace the old fields.** Rejected on the "stable contract" criterion: any client that reads `hbarBalance` or `tokenAssociations` would break. The cost of keeping them is a longer response: for the account with 285 tokens, the `content-length` header of the answer is 20,543 bytes, and the list of tokens is present twice (IDs, then objects).
- **Numbers for the balances.** Rejected on the "exact values" criterion: the SDK gives 64-bit integers (`Long`), and a JSON number read by JavaScript is exact only up to 2^53.
- **Only `hbar`, as one string.** Rejected on the "one reading per use" criterion: `tinybars` is an integer that a client can compute with, `hbar` is the one it displays.
- **`amount` as an object `{ value, unit }`.** Rejected on the "stable contract" criterion: it changes the type of an existing field. Two fields named `amountValue` and `amountUnit` were also discarded as too heavy, hence `value` and `unit`.
- **A new versioned route (for example `/v2/accounts/:id`).** Not chosen: a second route to keep for a single consumer. It was not tested.
- **Asking Hedera for the decimals of each token (`TokenInfoQuery`).** Rejected on the "small" criterion: one more query per token, and the queries are paid by the operator account (observed: each `AccountInfoQuery` lowered the balance of that account by 0.00113361 ℏ). The cost of a `TokenInfoQuery` was not measured.
- **Reading token balances from the public mirror node.** Not chosen: a second data source and a new dependency of the backend. Not examined further.

## Consequences

- A client can keep reading the old fields, and a new client reads `balance`, `tokens`, `value` and `unit`.
- The old fields can be removed only by a later decision. Until then, the response carries the same data twice.
- `hbarBalance` keeps changing its unit with the amount (see Context), so a client that computes should use `balance`.
- A token balance is raw: for a token with decimals, the response shows the smallest unit, and the decimals are not available in it.
- The list `tokens` has no limit: all the associations of the account are returned. A list of the tokens created by this backend (`GET /tokens`) is a separate subject, not decided here.
- The shape is written twice, in the services (the returned object) and in the response classes of Swagger. A change in one is not detected in the other.

## Verification

### Proven

All observed by the author on 2026-10-13, with the backend started by `pnpm start`.

- `pnpm test` runs 5 suites and 26 tests, all passing. `pnpm --filter backend lint` reports no problem, `format:check` passes and `test:e2e` runs its 3 tests, all passing. `pnpm --filter frontend lint` reports no problem and `pnpm --filter frontend build` passes.
- `GET /accounts/0.0.6106565`, with curl and with Swagger, answers HTTP 200 with the five fields. `balance` is `{ "hbar": "933.15590901", "tinybars": "93315590901" }` on the first read, and `tinybars` is `hbar` times 100,000,000 in each response read. `tokens` and `tokenAssociations` both hold 285 entries, in the same order. The first two tokens are `TST2` with the balance `"1000"` and `TST` with `"990"`, each with its symbol.
- For this account, the 285 associations equal the number given by the public mirror node (`https://testnet.mirrornode.hedera.com/api/v1/accounts/0.0.6106565/tokens`, pages of 100 followed to the end).
- On the page `/accounts` of the frontend, the lookup of this account lists the tokens with symbol, ID and balance in a scrolling list, and the first two entries are the same as in the JSON (screenshots).
- `POST /accounts/transfer` of 1 HBAR, through Swagger, answers HTTP 201 with `"amount": "1 ℏ"`, `"value": 1` and `"unit": "HBAR"`. Swagger then shows the 201 with its description, the schema `TransferHbarResponseDto` and an example with `value` and `unit`. Before the status was corrected, Swagger showed this 201 as "Undocumented".
- The schema of the 200 of `GET /accounts/{accountId}` in Swagger lists `accountId`, `hbarBalance`, `tokenAssociations`, `balance` and `tokens`.
- Each read of this account lowered its balance by 0.00113361 ℏ (three successive values: 933.15590901, 933.1547754 and 933.15364179). This account is the one in the operator variables of the backend, and the client of `AccountsService`, which runs the query, uses those variables: the drop is consistent with the query fee being paid by this account (the fee amount was not checked in the Hedera documentation).

### Not proven

- The page `/transfer` of the frontend after this change (not run in the browser).
- A token with a number of decimals other than 0, and what its raw balance looks like.
- An account with more than 285 associations, and whether the account query has a limit.
- The conversion `balance.hbar` for other balances than the one observed, for example below 1 ℏ. The unit test replaces `to()` and does not check that `HbarUnit.Hbar` is the unit passed.
- The wording of the descriptions "Kept for compatibility" in Swagger: they are in the code, but were not seen on the screen.
- The status of `POST /accounts` (documented 200, not observed).
- The CI with this change.
