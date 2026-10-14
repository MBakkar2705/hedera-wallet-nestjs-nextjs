# ADR 0018: TypeScript strict mode in the backend, with `!` on the properties filled by a library

- Status: Accepted
- Date: 2026-10-14
- Note (2026-10-14): The first item of "Not proven" (the CI with these changes) is no longer current: the CI ran green on commit `1718c2a`, including the new step `pnpm --filter backend build` (reported by the author).

## Context

Before this decision, `backend/tsconfig.json` had `strictNullChecks: true`, `noImplicitAny: false` and `strictBindCallApply: false`, and did not set `strict`. The frontend uses `strict: true` (item 16 of `docs/backend-evolutions.md`).

Item 16 recorded 49 errors in 12 files, measured earlier by the author. On 2026-10-14 the author measured again, with nothing modified: `tsc --noEmit --strict --noImplicitAny --strictBindCallApply --incremental false`, once with `tsconfig.build.json` (`src/` only) and once with `tsconfig.json` (`src/` and the tests). Both gave **75 errors, all `TS2564`** ("Property has no initializer and is not definitely assigned in the constructor"), in 15 files: 6 entities (32 errors) and 9 DTO (43 errors). The two extra flags were added because a value written explicitly in `tsconfig.json` overrides `strict`. The tests and `test/` add no error.

The error is raised for each property of a class that has no initial value and is not set in the constructor. The TypeScript Handbook gives the definite assignment assertion, `!`, for a field that is initialized "through means other than the constructor (for example, maybe an external library is filling in part of your class for you)". In this backend, the entities are filled by TypeORM and the request DTOs by the `ValidationPipe`. The response DTOs only describe the answers for Swagger; whether each of them is instantiated in the code was not examined.

The criteria used to choose:

- **No change at runtime:** the validation, the database and Swagger behave as before.
- **The check stays on for new classes:** the lot Microservices will add many.
- **Same strictness as the frontend:** `strict: true`, without exceptions left in the file.
- **A change that is easy to review:** the same small edit everywhere.

## Decision

1. **`"strict": true` in `backend/tsconfig.json`.** The three lines `strictNullChecks`, `noImplicitAny` and `strictBindCallApply` are removed, because they are now redundant or would switch a check off. `noFallthroughCasesInSwitch: false` is kept: it is not part of `strict`.
2. **A `!` after the name of each of the 75 properties** reported by `TS2564` (`id!: number;`), in 6 entities (`account`, `association`, `token-transfer`, `token`, `message`, `topic`) and 9 DTO (`account-info-response`, `create-account`, `transfer-hbar-response`, `transfer-hbar`, `associate-token`, `create-token`, `token-list-response`, `transfer-token`, `send-message`). Nothing else changes in these files.
3. **Not changed:** `ListTokensQueryDto` (its properties have initial values), `CreateTopicDto` and the `memo` of `TopicEntity` (optional properties), and all the `*.spec.ts` files and `test/`.
4. **The CI builds the backend** (item 25 of `docs/backend-evolutions.md`, note of 2026-10-14 in ADR 0006).

## Alternatives considered

- **Initial values** (`name = ''`). Not chosen on the first criterion: it changes the runtime. A DTO is built by `class-transformer` from the plain body of the request; if a missing field keeps its initial value, `@IsString()` would accept it and the validation of the lot Error handling would no longer reject a missing field. This is a reading of how the library works: its README does not state it, and it was not tested.
- **`strictPropertyInitialization: false` with `strict: true`.** Not chosen on the second criterion. It is one line and changes no file, and it is what `nestjs/typescript-starter` has (`"strict": true` and `"strictPropertyInitialization": false`, read in its `master` branch on 2026-10-14). But the check would stay off for every future class. The contributors of TypeORM issue #2797 are divided: one writes that `!` "tells compiler, that property is always initialized which isn't the case" and prefers to disable the flag, another proposes to document the three ways. This is not an official position of TypeORM: the page does not say who is a maintainer.
- **`strict: true` and keep the three explicit lines.** Not chosen: `noImplicitAny` and `strictBindCallApply` would stay off, so `strict: true` would not mean what it says.
- **Switch the options on one by one.** Not chosen: a longer file, and an option that is forgotten stays off. Not examined further.
- **Leave the backend as it is.** Not chosen: this is item 16.

The documentation of TypeORM (FAQ) and of NestJS (validation) does not mention strict mode, `strictPropertyInitialization` or `!`; their examples declare the properties without `!`.

## Consequences

- The `!` is a promise made to the compiler, and it is not checked: if a property is never filled by anything, TypeScript will not say so.
- A new class is checked. A property set in the constructor or with an initial value needs nothing; a property filled by a library (a new entity or a request DTO) needs a `!`.
- The compiled JavaScript is identical (see "Proven"): the `!` only exists in the types.
- The unit tests and the end-to-end test are compiled by `ts-jest` with the new options and pass without any change of the tests.
- The CI now runs `pnpm --filter backend build`.

## Verification

### Proven

All observed by the author on 2026-10-14, except the third point.

- Before the change, `tsc` with the strict flags printed 75 `TS2564` errors with `tsconfig.build.json` and 75 with `tsconfig.json`, and no other code. Per file: `account-info-response.dto` 10, `create-account.dto` 1, `transfer-hbar-response.dto` 7, `transfer-hbar.dto` 4, `account.entity` 6, `associate-token.dto` 3, `create-token.dto` 3, `token-list-response.dto` 9, `transfer-token.dto` 5, `association.entity` 5, `token-transfer.entity` 7, `token.entity` 6, `send-message.dto` 1, `message.entity` 5, `topic.entity` 3.
- After the change, `pnpm exec tsc --noEmit --incremental false -p tsconfig.json` printed nothing.
- In the diff of `backend/src/`, 75 lines were removed and 75 added, and each added line differs from the removed one only by the `!` (checked by a script on the diff, run by the assistant).
- `pnpm test` runs 7 suites and 46 tests, all passing. `pnpm --filter backend lint` printed nothing, `format:check` printed "All matched files use Prettier code style!", `test:e2e` runs 7 tests, all passing, and `pnpm --filter backend build` printed no error.
- The compiled output is identical: `tsc -p tsconfig.build.json` was run into two temporary folders, one before the change and one after. Each holds 70 files (`.js` and `.d.ts`), and `Compare-Object` on the file names and the hashes (`Get-FileHash`) printed no difference. The `.js.map` files were not compared, because the positions in them change with the `!`.
- `pnpm start` started the backend. `GET /tokens?page=1&limit=20` answered 4 tokens (`TST4`, `TST3`, `TST2`, `TST`) with `"total":4`, read from `hedera-wallet.db`. In the frontend, the page `/tokens` listed the same 4 tokens, and on `/accounts` the lookup of `0.0.10940355` showed a balance of `4.99554774 ℏ`, 1 association and the token `TST` (`0.0.10951658`) with a balance of 10; the author confirmed that both behave as before.
- In Swagger, the schemas `AccountInfoResponseDto` and `TokenListResponseDto` list their properties, descriptions, examples and required markers.

### Not proven

- The CI with these changes.
- Any write to the database after the change (creation of an account, a token, a topic or a message, association, transfers): none was run. The identical compiled JavaScript is the only evidence.
- The Docker build and the container, which have never been run with real credentials (ADR 0007).
- Whether the response DTOs are instantiated anywhere in the code.
- The effect of initial values on a DTO built by `class-transformer` (the second alternative).
