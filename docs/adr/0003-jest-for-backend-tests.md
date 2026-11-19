# ADR 0003: Jest for the backend tests

- Status: Accepted
- Date: 2026-10-09
- Note (2026-11-18): The third item of "Not proven" is no longer current: the end-to-end test runs and its 10 tests pass (observed by the author, 2026-10-16, and in the step `Backend e2e tests` of the CI runs #68 and #71; item 11).

## Context

The backend services call the Hedera network and a database. Their unit tests must run without the network, without credentials and without a database file, so the Hedera SDK and the repositories have to be replaced by mocks.

The criteria used to choose the test tool:

- **NestJS integration:** a tool supported by the NestJS testing utilities (`@nestjs/testing`) and by the NestJS documentation.
- **TypeScript support:** tests written in TypeScript, with the decorators used by NestJS.
- **Mocks:** functions and modules can be replaced by mocks without another library.
- **Coverage:** a coverage report without another tool.
- **Few dependencies:** the runner, the assertions, the mocks and the coverage in one package.

## Decision

The backend tests are written with Jest, compiled with `ts-jest`, and use `@nestjs/testing` to build the modules under test. The configuration is `backend/jest.config.js`, and the tests are the `*.spec.ts` files next to the code they test.

How it meets the criteria:

1. **NestJS integration.** `Test.createTestingModule` from `@nestjs/testing` builds a module in which the dependencies of a service are replaced by mocks. The NestJS documentation uses Jest for its examples.
2. **TypeScript.** `ts-jest` compiles the TypeScript files, decorators included, so no separate build step is needed before the tests.
3. **Mocks.** `jest.fn()` and `jest.mock()` replace the repositories and the Hedera SDK objects.
4. **Coverage.** `pnpm test:cov` (`jest --coverage`) produces the coverage report.
5. **Few dependencies.** Jest provides the runner, the assertions (`expect`), the mocks and the coverage. The packages added are Jest, `ts-jest`, `@types/jest` and `@nestjs/testing`.

## Alternatives considered

- **Vitest.** Rejected on the NestJS integration and TypeScript criteria. Vitest is fast and close to the Jest API, but it compiles with esbuild, which does not emit the decorator metadata that NestJS dependency injection relies on, so it needs an additional plugin to run these tests. The NestJS documentation and its generated projects use Jest.
- **Mocha with Chai and Sinon.** Rejected on the few dependencies criterion. Mocha is only the runner: assertions (Chai), mocks (Sinon) and coverage (nyc) are separate packages to install and configure.
- **The Node.js built-in test runner.** Rejected on the NestJS integration and TypeScript criteria. It needs its own TypeScript setup, and the NestJS testing documentation and examples are written for Jest.

## Consequences

- The unit tests of the three services and of the root controller run offline, with `pnpm test` from the repository root.
- Tests that need the Hedera network or a real database are not unit tests and are not covered by this setup.
- The test code depends on the Jest API (`jest.fn`, `jest.mock`). Changing the tool later means rewriting the mocks.
- The end-to-end test in `backend/test/` is part of the NestJS template but cannot run: see `docs/backend-evolutions.md`, item 11.

## Verification

### Proven

- `backend/package.json` declares `jest` `^30.0.4`, `ts-jest`, `@types/jest` and `@nestjs/testing`, and the scripts `test` (`jest`) and `test:cov` (`jest --coverage`).
- `backend/jest.config.js` uses the `ts-jest` preset in a `node` environment.
- There are four unit test files: `app.controller.spec.ts`, `accounts.service.spec.ts`, `tokens.service.spec.ts` and `topics.service.spec.ts`. All four use `@nestjs/testing`, and the three service tests use `jest.fn` or `jest.mock`.
- `pnpm test` runs 4 suites and 20 tests, which pass (reported by the author after the reorganization, see ADR 0012).
- The README reports 100% of statements, branches, functions and lines for `app.controller.ts`, `accounts.service.ts`, `tokens.service.ts` and `topics.service.ts` (sections "Unit Testing").

### Not proven

- The coverage figures of the README are from the author's runs. They were not measured again for this record.
- That Vitest would need an extra plugin for these tests: this comes from its documentation and was not tried here.
- The end-to-end test: it cannot run as is (`docs/backend-evolutions.md`, item 11).
