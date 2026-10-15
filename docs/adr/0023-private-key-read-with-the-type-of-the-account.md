# ADR 0023: A private key of 64 hexadecimal characters is read with the type of the account

- Status: Accepted
- Date: 2026-10-15

## Context

Item 26 of `docs/backend-evolutions.md` records that the backend read a private key of 64 hexadecimal characters as Ed25519, whatever the type of the account. Facts that can be checked:

- In a Node script run by the assistant with the SDK 2.68.0, on keys generated for the occasion, `PrivateKey.fromString` gave:

  | Key | Read as | Same public key |
  |-----|---------|-----------------|
  | Ed25519, 64 hexadecimal characters, with or without `0x` | Ed25519 | yes |
  | Ed25519, DER, with or without `0x` | Ed25519 | yes |
  | ECDSA, 64 hexadecimal characters, with or without `0x` | Ed25519 | **no** |
  | ECDSA, DER, with or without `0x` | secp256k1 | yes |

  The only wrong case is an ECDSA key as 64 hexadecimal characters. `PrivateKey.fromStringECDSA` and `PrivateKey.fromStringED25519` read the text with the type that the caller gives.
- A DER key carries its type. On 200 generated keys of each type, an Ed25519 key in DER form has 96 characters, starts with `302e020100300506032b657004220420` and ends with its 64 raw characters; an ECDSA key in DER form has 100 characters, starts with `3030020100300706052b8104000a04220420` and ends with its 64 raw characters.
- The frontend reads the key with the type of the account when an account is activated (ADR 0019), then sends the text as the user typed it. The backend read it with `PrivateKey.fromString` in `transferHbar`, `associateToken` and `transferToken`.
- Observed by the author on 2026-10-15, on the code before the change (`111ac7f`), with the ECDSA account `0.0.6101287` activated with its key as 64 hexadecimal characters (the activation succeeded, so the key belongs to the account): a transfer of 1 ℏ to `0.0.11035637` showed `Hedera rejected the request: INVALID_SIGNATURE`, and the association of the token `0.0.11037973` showed the same message. A transfer from the unknown account `0.0.99999999`, with a random key, answered HTTP 404 with `{"message":"Hedera does not know this account (INVALID_ACCOUNT_ID)","error":"Not Found","statusCode":404}`.
- `AccountInfoQuery` costs 0.00119243 ℏ, paid by the operator (measured for ADR 0019).

The criteria used to choose:

- **Correct signature for every account that the frontend accepts.**
- **No change of the format of the requests**, for the frontend and for a client that uses curl or Swagger.
- **No change for the keys that already work.**
- **Testable** without the network, then proved on the testnet.

## Decision

1. **A helper reads the key.** `readPrivateKey(client, accountId, keyText)` in `backend/src/hedera/read-private-key.ts` is called by `transferHbar`, `associateToken` and `transferToken`, with the account that signs. Its rules:
   1. A text that is not 64 hexadecimal characters (optionally after `0x`), which in practice is a DER key, is read by `PrivateKey.fromString`, with no query.
   2. A text of 64 hexadecimal characters is the only ambiguous form. The helper asks Hedera for the key of the signing account (`AccountInfoQuery`, with the shared client). If it is a single public key, the text is read with `PrivateKey.fromStringECDSA` when its type is `secp256k1`, and with `PrivateKey.fromStringED25519` otherwise (the `0x` is removed first).
   3. If the key of the account is not a single public key (a list, a threshold key, a contract), the helper keeps the previous behaviour, `PrivateKey.fromString`.
2. **The errors of the query are not caught.** `HederaExceptionFilter` (ADR 0014) turns them into HTTP responses.
3. **The requests do not change.** Only the Swagger descriptions of the three key fields say that the form is DER or 64 hexadecimal characters, and that the type is then read from the account.

## Alternatives considered

- **B. Accept only the DER form.** Not chosen: any client that sends 64 characters, even an Ed25519 key that works today, would get a 400, and the frontend would have to convert the key. It would need no query. Not tried.
- **C. A field `keyType` in the three requests.** Not chosen: a client that omits the field keeps the wrong reading for ECDSA, and the frontend would have to remember and send the type. Not tried.
- **Query the account for every key, DER included.** Not chosen: the DER form already carries the type, so the query would cost 0.00119243 ℏ and a call for nothing.
- **Refuse, with a 400, an account whose key is not a single key (rule 3).** Not chosen: it would turn a case that works (see "Proven": a threshold key of 1 of 2 signed with its Ed25519 key) into an error.
- **Look for the key among the keys of a list (rule 3).** Not done: it needs a walk through nested lists and a new proof, and the limit it would remove is rare and has a proven workaround. It stays possible.

## Consequences

- A raw key costs one more query and one more network call per operation, paid by the operator, and the operation fails if the query fails. A DER key costs nothing more.
- The answer for an unknown signing account comes from the query, before the transaction; it was observed to be the same as before (see "Proven").
- **A known limit.** For an account whose key is not a single key, a raw ECDSA key is still read as Ed25519 and the signature is refused (see "Proven"). The form in DER avoids it.
- The shared client carries the query, so the operator account is the one that pays it (ADR 0017).
- `transferHbar`, `associateToken` and `transferToken` await the helper before they sign; their unit tests check that it is called with the signing account.

## Verification

### Proven

All the network results were observed by the author on the testnet on 2026-10-15; the transaction IDs begin with the operator account, which pays (ADR 0017).

- Before the change, the failures of "Context" (the transfer and the association of `0.0.6101287` with its raw ECDSA key, and the HTTP 404 for an unknown account).
- After the change (`a025b07`), with the same raw ECDSA key of `0.0.6101287`:
  - the transfer of 1 ℏ to `0.0.11035637`: `Status: SUCCESS`, transaction `0.0.6106565@1792080267.306113160`;
  - the association of `0.0.11037973`: `Status: SUCCESS`;
  - a transfer of 5 tokens `0.0.11037973` to the operator: `Status: SUCCESS`, transaction `0.0.6106565@1792080622.554124003` (the operator had sent 10 of them to `0.0.6101287` first, transaction `0.0.6106565@1792080511.201451817`);
  - the unknown account `0.0.99999999` with the same request as before: HTTP 404 with the same body, the same size (105 bytes) and the same ETag.
- Keys that already worked, after the change: the Ed25519 account `0.0.11035637` with its key as 64 hexadecimal characters (taken from its DER form): 1 ℏ sent, `SUCCESS`, `0.0.6106565@1792080821.878744942`; the same account with its DER key: `SUCCESS`, `0.0.6106565@1792081123.454400726`; `0.0.6101287` with its ECDSA key in DER form: `SUCCESS`, `0.0.6106565@1792081242.499939637`.
- A threshold account (rule 3). The account `0.0.11038285` has a list of two keys with a threshold of 1 (one Ed25519 and one ECDSA), created by a script that the author ran with the operator account. `POST /accounts/transfer` with curl, 1 ℏ to `0.0.6101287`:
  - the Ed25519 key as 64 hexadecimal characters: HTTP 201, `SUCCESS`, `0.0.6106565@1792081364.657265135`;
  - the ECDSA key as 64 hexadecimal characters: **HTTP 400, `Hedera rejected the request: INVALID_SIGNATURE`** (the known limit);
  - the ECDSA key in DER form: HTTP 201, `SUCCESS`, `0.0.6106565@1792081368.069542492`.
- `pnpm test` runs 8 suites and 58 tests, all passing (observed by the author). The suite `read-private-key.spec.ts` has 7 tests, with real keys of the SDK and a mocked `AccountInfoQuery`: a DER key and a `0x` DER key (no query), a raw ECDSA key, a raw Ed25519 key, a raw key with `0x`, an account whose key is a list (previous behaviour), and an error of the query that is passed on. A spy test in each of the two services checks that the helper is called with the signing account (3 tests). The lint, the format check, `test:e2e` and the build pass.
- The CI was green on the commit of this decision, `a025b07` (reported by the author).

### Not proven

- The HTTP status of the first failure of the HBAR transfer before the change: only the message of the page was seen. The HTTP 400 of the threshold account is the status that was seen.
- A raw key with the `0x` prefix on the network (covered by a unit test only).
- The association and the transfer of tokens for the threshold account (only the HBAR transfer was tried).
- A public key typed in the field of the private key (item 21), now that a text of 64 hexadecimal characters starts a query: not tried.
- A failure of the query other than the unknown account (for example, no network): not tried.
- The cost of the query in this lot: it was not measured again; 0.00119243 ℏ is the value measured for ADR 0019.
