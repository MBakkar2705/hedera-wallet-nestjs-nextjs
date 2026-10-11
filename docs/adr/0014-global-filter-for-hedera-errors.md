# ADR 0014: A global filter that turns Hedera errors into HTTP responses

- Status: Accepted
- Date: 2026-10-11

## Context

Before this decision, every error raised by the Hedera SDK reached the client as HTTP 500 with the body `{"statusCode":500,"message":"Internal server error"}` (`docs/backend-evolutions.md`, items 1 and 2). Nest answers like this for any error that is not an `HttpException`. Four cases were run against the backend on 2026-10-11:

- `GET /accounts/0.0.99999999` (unknown account): HTTP 500. The backend log shows an SDK `StatusError` with the status `INVALID_ACCOUNT_ID`, raised at the precheck by node `0.0.4`. `getAccountInfo` wrapped it in `new Error('Failed to fetch account info: ...')`.
- `GET /accounts/abc` (malformed ID): HTTP 500. The log shows a plain `Error` raised by the SDK before any network call: `failed to parse entity id: abc`.
- `POST /accounts/transfer` from an account whose balance is lower than the amount: HTTP 500. The log shows a `PrecheckStatusError` with the status `INSUFFICIENT_PAYER_BALANCE`. `transferHbar` has no error handling.
- `POST /accounts/transfer` with the body `{}`: HTTP 500, `TypeError: Cannot read properties of undefined (reading 'startsWith')` in `AccountId.fromString`. The validation decorators of the DTOs are not applied, because no `ValidationPipe` is registered. This case is not part of this decision.

The frontend reads the standard Nest error body (`message` as a string, or an array of strings) in `frontend/lib/api.ts`.

The criteria used to choose:

- **One place:** the rule that links a Hedera error to an HTTP status is written once, not in each method.
- **Right status:** the client receives 404 for an unknown account and 400 for a request Hedera refuses.
- **Same body:** the format of the error body does not change, so the frontend reads it as before.
- **Hedera knowledge in one file:** the code of the services stays about the business, not about the SDK error classes.
- **Testable:** each rule can be checked by a test.

## Decision

1. **A global exception filter**, `HederaExceptionFilter` (`backend/src/hedera/hedera-exception.filter.ts`), registered with `APP_FILTER` in `HederaModule`. It extends the default `BaseExceptionFilter` of Nest, so everything it does not map is handled as before.
2. **The rules**, in the function `toHttpException`:
   - an error that is already an `HttpException`: unchanged;
   - an SDK `StatusError` (the parent class of the precheck and receipt errors) with the status `INVALID_ACCOUNT_ID`: 404, message `Hedera does not know this account (INVALID_ACCOUNT_ID)`;
   - any other `StatusError`: 400, message `Hedera rejected the request: <STATUS>`;
   - an `Error` whose message contains `failed to parse entity id`: 400, with the message of the SDK;
   - anything else: unchanged, so HTTP 500 with the generic message.
3. **The services do not catch or wrap SDK errors.** `getAccountInfo` no longer has its `try/catch`: the original error goes up to the filter.
4. **The format of the body stays the one of Nest:** `{ statusCode, message, error }`.

## Alternatives considered

- **A `try/catch` in each service method.** Rejected on the "one place" and "Hedera knowledge in one file" criteria: the three services have several methods that call the SDK, and each would repeat the same mapping. An error raised outside the service code would not be covered.
- **A helper function called from each `catch`.** Rejected for the same reason: each method still has to catch the error and call the helper.
- **An interceptor that maps the errors.** Not chosen: no advantage over the filter was found, and the filter is the mechanism of Nest meant to turn an error into a response. It was not tested.
- **A custom error body (for example with a Hedera status field).** Rejected on the "same body" criterion: the frontend does not need more than `message`.
- **Recognizing every case by the text of the message.** Not used for Hedera refusals, which carry a `status` that is checked with `instanceof StatusError`. The text is used only for the malformed ID, because that error has no status: the SDK raises it locally.

## Consequences

- The filter applies to every route, so a refusal by Hedera on a token or topic route also answers 400 with the status name. This was observed on a topic route (unknown topic) and not on the token routes.
- A malformed ID is recognized by the wording of the SDK message. If a later SDK version changes this wording, the error falls back to HTTP 500. The unit test of the filter throws the same text, so it would not detect this change.
- The status `INVALID_ACCOUNT_ID` always gives 404 with the message "Hedera does not know this account", including when it comes from the recipient of a transfer. This was observed with an unknown recipient.
- Every Hedera status other than `INVALID_ACCOUNT_ID` gives 400. Some statuses may not be the fault of the client (for example a busy network). They were not examined.
- The messages are in English and name the Hedera status (`INSUFFICIENT_PAYER_BALANCE`). The frontend shows them as they are.
- An unexpected error is still HTTP 500 with the generic message. Its details are only in the backend log.
- The old message `Failed to fetch account info: ...` no longer exists.
- Validating the body of a request is not part of this decision.

## Verification

### Proven

- The four cases of the Context, run before the change (observed by the author, with the backend log).
- After the change, with curl on the running backend (observed by the author): `GET /accounts/0.0.99999999` answers HTTP 404 with `{"message":"Hedera does not know this account (INVALID_ACCOUNT_ID)","error":"Not Found","statusCode":404}`, and `GET /accounts/abc` answers HTTP 400 with `{"message":"failed to parse entity id: abc","error":"Bad Request","statusCode":400}`.
- `pnpm test` runs 5 suites and 26 tests, all passing. `pnpm --filter backend lint` reports no problem, `format:check` passes and `test:e2e` passes (reported by the author).
- `backend/src/hedera/hedera-exception.filter.spec.ts` sends real HTTP requests to a small application with routes that throw, and the Hedera errors are built with the real `PrecheckStatusError` class of the SDK. It checks the six rules: 404, 400 for `INSUFFICIENT_PAYER_BALANCE`, 400 for another status, 400 for a malformed ID, an unchanged `HttpException`, and 500 without the message for an unexpected error.
- After the change, through Swagger on the running backend (observed by the author):
  - a transfer from an account whose balance is lower than the amount answers HTTP 400 with `Hedera rejected the request: INSUFFICIENT_PAYER_BALANCE`;
  - a transfer to an unknown recipient answers HTTP 404 with `Hedera does not know this account (INVALID_ACCOUNT_ID)`;
  - `POST /topics/<unknown topic ID>/messages` answers HTTP 400 with `Hedera rejected the request: INVALID_TOPIC_ID`;
  - `POST /topics/abc/messages` answers HTTP 400 with `failed to parse entity id: abc`, the same wording as for an account ID.

### Not proven

- The answers of the token routes when Hedera refuses a request, and the wording of the error for a malformed token ID.
- The Hedera statuses other than `INVALID_ACCOUNT_ID`, `INSUFFICIENT_PAYER_BALANCE` and `INVALID_TOPIC_ID`: they all give 400 by the default rule.
- That a later SDK version keeps the wording `failed to parse entity id`.
- The CI with this change.
