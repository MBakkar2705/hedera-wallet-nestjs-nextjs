# ADR 0016: A paginated list of the tokens created by the backend

- Status: Accepted
- Date: 2026-10-13

## Context

Before this decision, `createToken` saved each new token in the table `tokens` (`TokenEntity`) and nothing read it: no route returned the tokens (`docs/backend-evolutions.md`, item 5). From the code, the table holds only the tokens created through this backend, not the tokens of Hedera. On 2026-10-13 the local database held 2 tokens, then 3 after a token was created from the frontend (observed by the author).

- The column `createdAt` has a resolution of one second: the two dates observed end with `.000Z` (observed).
- The `ValidationPipe` registered globally (note of ADR 0014) validates the requests but does not transform them: a value read from a query string stays a string.
- The frontend needs a list to show, with a way to move from page to page.

The criteria used to choose:

- **Bounded:** the size of a response does not grow with the number of tokens.
- **Simple for the client:** a page number and a total are enough to show "page X of Y".
- **Validated:** a wrong value is refused with 400, before any read of the database.
- **Documented:** the parameters and the response appear in Swagger.
- **Local:** no call to Hedera.

## Decision

1. **`GET /tokens` answers `{ items, page, limit, total }`.**
2. **The query** has two optional parameters: `page` (a whole number from 1, default 1) and `limit` (a whole number from 1 to 100, default 20). They are described by `ListTokensQueryDto` and checked by class-validator. The `@Query` of the route has its own `ValidationPipe({ transform: true })`, which turns the strings into numbers. The global pipe is not changed.
3. **The order is newest first:** `createdAt` descending, then `id` descending, so that two tokens saved in the same second keep a fixed order.
4. **Each item** has `tokenId`, `name`, `symbol`, `initialSupply` and `createdAt`. The internal `id` is not returned.
5. **The route reads only the local table.** It does not call Hedera.
6. **Swagger describes the route** with `ListTokensQueryDto` and `TokenListResponseDto`. The type of the two parameters is written in the decorator (`type: 'integer'`).
7. **The frontend** shows the list in a panel of the page `/tokens`, 10 tokens per page, with Previous and Next. The list is loaded when the page opens and loaded again after a token is created.

## Alternatives considered

- **No pagination (return every token).** Rejected on the "bounded" criterion: the response grows with each token created. The table is small today, and pagination was chosen anyway.
- **A cursor instead of a page number.** Rejected on the "simple for the client" criterion: an opaque cursor gives neither a total nor a jump to a page, and it is heavier for a small table. It would keep the pages stable when tokens are added. Not tested.
- **`offset` and `limit` instead of `page` and `limit`.** Not chosen: equivalent, and `page` fits the display "Page X of Y". Not tested.
- **`transform: true` in the global pipe.** Rejected: it would also change how every other route receives its body (class instances). The effects on the other routes were not examined.
- **Converting the strings in the service (`Number(query.page)`).** Rejected: the controller would hand strings, typed as numbers, to the service.
- **Listing the tokens from Hedera (for example the public mirror node).** Not chosen on the "local" criterion: a second data source, and a list that does not match the tokens created here. Not examined further.

## Consequences

- The list contains only the tokens saved by this backend. A token created elsewhere, or before the table existed, is not in it, and a new local database starts empty.
- With a page number, a token created between two requests shifts the following pages: a token can appear twice or be missed. This follows from how `skip` and `take` work and was not observed.
- A page after the last one answers HTTP 200 with an empty list (observed).
- A wrong value answers HTTP 400 with the messages of class-validator. For `page=abc` there are two messages, and one of them ("must not be less than 1") is misleading (observed).
- `total` comes from a count made at each request (`findAndCount`). Its cost was not measured.
- Without a written `type`, Swagger showed `page` and `limit` as `object` (observed). The type is therefore written in the decorator.
- There is no authentication: whoever reaches the API can read the list (`docs/backend-evolutions.md`, item 7).

## Verification

### Proven

All observed by the author on 2026-10-13.

- `pnpm test` runs 5 suites and 28 tests, all passing (two tests of `listTokens`: the first page without the internal `id`, and the skip of the previous pages). `pnpm --filter backend lint` reports no problem, `format:check` passes, and `test:e2e` runs 4 tests, all passing, including `GET /tokens?limit=500` refused with 400 and the message `limit must not be greater than 100`. `pnpm --filter frontend lint` reports no problem and `pnpm --filter frontend build` passes.
- With curl on the running backend, `GET /tokens?page=1&limit=2` answers HTTP 200 with `page` 1, `limit` 2, `total` 2, and two items, `TST2` then `TST` (`createdAt` `2026-10-09T09:23:32.000Z` and `2026-10-09T08:28:50.000Z`), without `id`.
- With `limit=1`, page 1 returns `TST2`, page 2 returns `TST`, and page 3 returns no item, with `total` 2. `page` comes back as a number.
- `limit=500` answers HTTP 400. `page=0` answers HTTP 400 with `page must not be less than 1`. `page=abc` answers HTTP 400 with two messages, `page must not be less than 1` and `page must be an integer number`.
- After the creation of a token from the frontend (`TST3`, `0.0.11012318`), `GET /tokens?page=1&limit=1` returns `TST3` with `total` 3.
- On the page `/tokens`, the panel lists `TST2` and `TST`, shows "Page 1 of 1 (2 tokens)" and the buttons Previous and Next are disabled (screenshot). After the creation of `TST3`, the list was updated by itself, without reloading the page, with `TST3` first (screenshot and answer of the author).
- In Swagger, `GET /tokens` first showed `page` and `limit` as `object` with an empty JSON box. After `type: 'integer'` was added, it shows two integer fields with the default values 1 and 20, a 200 with an example response (`items`, `tokenId`, `name`, `symbol`, `initialSupply`, `createdAt`) and the 400 "Invalid page or limit".

### Not proven

- The buttons Previous and Next with more than one page (the database holds 3 tokens and the page has room for 10).
- The behaviour with many tokens: response time and cost of the count.
- A token created between two requests of pages.
- The page `/tokens` when the backend is not running.
- The CI with this change.
