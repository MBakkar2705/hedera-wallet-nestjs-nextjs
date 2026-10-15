# ADR 0019: Check of the account and of its key when an account is activated

- Status: Accepted
- Date: 2026-10-14
- Note (2026-10-15): The backend now reads a private key of 64 hexadecimal characters with the type of the account, as the frontend does (ADR 0023, item 26 of `docs/backend-evolutions.md`); the difference between the two that this ADR describes is gone. The first item of "Not proven" (the answer `null` in the JSON of the backend) is no longer current: observed by the author on 2026-10-15 with `curl.exe http://localhost:3000/accounts/0.0.11038285`, an account whose key is a list of two keys with a threshold of 1 (ADR 0023): the answer is `{"accountId":"0.0.11038285","hbarBalance":"3 ℏ","tokenAssociations":[],"balance":{"hbar":"3","tinybars":"300000000"},"tokens":[],"key":null}`. The third item of "Not proven" (the activation of the Ed25519 account with the key as 64 hexadecimal characters, after the check of the text was added) is no longer current: observed by the author on 2026-10-15, `0.0.11035637` was activated with its key as 64 hexadecimal characters (taken from its DER form) and sent 1 ℏ (`SUCCESS`).

## Context

Item 19 of `docs/backend-evolutions.md` records that activating an existing account checked only the format of the account ID: an ID typed with one digit missing (`0.0.1100279` instead of `0.0.11002792`) was accepted, and the error appeared at the first transfer (`INVALID_SIGNATURE`).

Facts that can be checked:

- The account `0.0.1100279` exists on the testnet: `curl.exe http://localhost:3000/accounts/0.0.1100279` answered with the information of the account, a balance of 0 and one token, `MYRO` (observed by the author, 2026-10-14). A check of the existence of the account alone would have accepted the example of item 19.
- Before this decision, the answer of `GET /accounts/:accountId` did not contain any key. The SDK gives it: the type `AccountInfo` of `@hashgraph/sdk` 2.68.0 has a field `key` of the generic type `Key`. `Key._fromProtobufKey` returns a contract ID, a delegatable contract ID, a public key (Ed25519 or ECDSA), a threshold key, a list of keys, or `null` (source read by the assistant). The type of a public key, `PublicKey.type`, is `"ED25519"` or `"secp256k1"` (source of `@hashgraph/cryptography` 1.9, read by the assistant).
- A private key written as 64 hexadecimal characters does not say its type. In a Node script run by the assistant with the SDK 2.68.0, `PrivateKey.fromString` read such a key as Ed25519 even when it was an ECDSA key, which gives another public key and no error. `fromStringED25519` and `fromStringECDSA` gave the right public key for the right type, and `fromStringDer` reads the type from the DER prefix. `fromStringDer` also accepts 64 hexadecimal characters, with or without a `0x` prefix, and reads them as Ed25519 whatever the real type, so a `0x…` ECDSA key given to it is read as the wrong type; `fromStringED25519` and `fromStringECDSA` accept the `0x` prefix. `PrivateKey.toString()`, which is what the application shows when it creates an account, is the DER form (`302e…` for Ed25519, `3030…` for ECDSA).
- In the browser build of the SDK 2.68.0 (`lib/encoding/hex.browser.js`), the decoding of a hexadecimal text does not check it: the text is cut in pairs of characters and each pair is read with `parseInt`. A text of 63 characters is read as 32 bytes (the last character becomes a byte), and a pair that is not hexadecimal becomes a byte `0`, without error. The Node build (`hex.js`) does not do this: with the same SDK, a text of 63 characters made `fromStringDer` throw. Both facts were checked by the assistant, by running the code of the two builds. In the page, before the check described in Decision 3, a key of 63 characters gave the message `This private key does not belong to this account.` instead of a message saying that the key cannot be read (observed by the author).
- ADR 0009 decides that the frontend keeps the private key in page memory only, and that the backend keeps receiving it in the body of the requests that sign. It does not forbid a verification endpoint in words. Item 19 reads sending the key for this check as going against ADR 0009.
- The activation was synchronous and made no call to the backend (`handleActivate` in `frontend/app/accounts/page.tsx`).

The criteria used to choose:

- **The private key does not travel for the check.**
- **The check catches the example of item 19**, not only unknown accounts.
- **One address of the API in the frontend** (`frontend/lib/api.ts`), so that the backend can later be split into services.
- **A change that can be reviewed:** one new field in one response and one new file in the frontend.

## Decision

1. **`GET /accounts/:accountId` also returns `key`.** For a single public key: `{ "type": "ED25519" | "secp256k1", "publicKey": "<raw hexadecimal>" }`. For any other key (a list of keys, a threshold key, a contract key): `null`. The field is added next to the others; nothing is removed. The Swagger schema and the unit tests of `getAccountInfo()` are updated.
2. **The activation of an existing account is checked in the browser.** The page calls `GET /accounts/:accountId`, then computes the public key of the private key that was typed and compares its type and its value with `key`. The private key is not sent for this check, stored or logged.
3. **How the typed key is read** (`frontend/lib/account-key.ts`): the spaces and line breaks around the text are removed, then an optional `0x` prefix. The remaining text must be made of hexadecimal characters, in an even number; otherwise the key cannot be read, and the SDK is not asked to read it (see the last fact of the Context). Then 64 hexadecimal characters are read as an Ed25519 or an ECDSA key according to the type of the account, and any other text is read as a DER key, which carries its type.
4. **The activation is refused, with its own message, when:** the account does not exist (HTTP 404), the backend cannot be reached, the key of the account is not a single key (the application signs with one key only), the typed key cannot be read, or the typed key does not belong to the account. The active account is not changed by a refused activation. After a refusal, the typed key stays in the field so that a typing mistake can be corrected; it is cleared only when the activation succeeds.
5. **The SDK is a dependency of the frontend** (`@hashgraph/sdk` `^2.68.0`, as in the backend) and is loaded with `import()` when a key is checked, not when the page loads.
6. **The lookup of an account shows its public key** with its type and a Copy button, or says that the key is not a single key.
7. **Not changed:** the button "Use this account" of the panel that creates an account (the key comes from the backend that has just created the account), and the transfer screens (the key is not checked again there).

## Alternatives considered

- **Check only that the account exists** (the first idea of item 19). Not chosen: `0.0.1100279` exists, so the example of the item would still have been accepted.
- **Send the private key to the backend, which compares.** Not chosen on the first criterion: the key would travel one more time, for a request that signs nothing. This is a choice, not a rule of ADR 0009.
- **Ask the public mirror node from the browser.** Not chosen: it adds a second address to the frontend and another origin to allow in the Content Security Policy. Not examined further.
- **A smaller cryptography library instead of the SDK in the frontend.** Not chosen: the formats of the keys (the DER prefixes) would be written by hand. Not examined further, and its weight was not measured.
- **Prove the key with a signature** (sign something and have it verified). Not examined.
- **Accept an account whose key is not a single key, with a warning.** Not chosen: the application signs with one key, and such an account would never be checked.
- **Let the activation succeed when the backend cannot be reached.** Not chosen: every operation of the application goes through the backend, so an activation without it would be of no use.

## Consequences

- Each activation costs one `AccountInfoQuery` paid by the operator account, also when the activation is refused: 0.00119243 ℏ per activation, the same as a lookup of an account, measured on 2026-10-14 (see Verification). This adds to items 7 and 24 of `docs/backend-evolutions.md`. The fee is the one of the testnet on that day and can change.
- The frontend now depends on `@hashgraph/sdk`. In production mode, the file that holds the SDK is loaded when an account is activated, not when the page loads: 293 kB transferred for 1,435 kB of JavaScript, observed by the author (see Verification). A scratch application outside the repository gave a similar figure (about 1.4 MB, about 283 kB compressed, measured by the assistant).
- The public key of an account is returned by the API. A public key is public on the network; it is not a secret.
- Only an account with a single key can be activated.
- The check is made once, at the activation. A key of the account that is changed on the network later is not noticed before the next activation (not examined).
- The private key is still in page memory and readable by any script of the page, as in ADR 0010; the check does not change that.

## Verification

### Proven

Observed by the author on 2026-10-14, with the backend on the testnet, in the account `0.0.11002792` (Ed25519) and the account `0.0.6101287` (ECDSA, `Public key (secp256k1)` in the lookup), unless said otherwise. "Development mode" is `pnpm --filter frontend dev`; "production mode" is `pnpm --filter frontend build` then `start`, on port 3001.

Tests and builds

- `pnpm test` runs 7 suites and 48 tests, all passing (46 before, 2 added). `pnpm --filter backend lint` printed nothing, `format:check` printed "All matched files use Prettier code style!", `pnpm --filter backend test:e2e` runs 7 tests, all passing, and `pnpm --filter backend build` printed no error.
- After the last change of `frontend/lib/account-key.ts`, `pnpm --filter frontend lint` printed nothing and `pnpm --filter frontend build` succeeded, with the six routes listed.
- The CI was green on GitHub Actions for the commit that holds these changes (run of 2026-10-14, 21:28 UTC) and again on the head of the branch on 2026-10-15 (run #55, which also holds the changes of ADR 0020). The CI installs with `--frozen-lockfile`, so the lockfile changed by `pnpm add` was accepted.

The answer of the backend

- `curl.exe http://localhost:3000/accounts/0.0.11002792` answered with `"key":{"type":"ED25519","publicKey":"09a1…fec2"}` (64 characters). The author had noted the public key of this account at its creation, in DER form (`302a300506032b6570032100` followed by 64 characters); the last 64 characters are identical to `publicKey` (compared by a script run by the assistant).
- `curl.exe http://localhost:3000/accounts/0.0.1100279` answered with `"key":{"type":"secp256k1","publicKey":"0262…07e0"}` (66 characters, starting with `02`).
- Swagger shows `key` in the schema of the response 200 of `GET /accounts/{accountId}`, with `type` and `publicKey` and `nullable: true` (screenshot).

The activation of an account (the key forms are in Decision 3)

- Ed25519 account `0.0.11002792`: the activation succeeded with the key in DER form (`302e…`) and with the key as 64 hexadecimal characters (development mode, before the check of the text described in Decision 3). The button showed "Checking...", the top bar showed the account and the field of the key was emptied. The same with the DER key for `0.0.10940355`.
- ECDSA account `0.0.6101287`: the activation succeeded with the key in DER form, as 64 hexadecimal characters with the prefix `0x`, and as 64 hexadecimal characters without it (development mode, before the check of the text). It also succeeded after the check of the text was added (production mode) with the key as 64 hexadecimal characters, with `0x` before them, in DER form, and as 64 hexadecimal characters with a space after them.
- The activation was refused, with the active account unchanged (the top bar kept the previous active account), in these cases:
  - `0.0.1100279` with a key of another account: `This private key does not belong to this account.`; the key stayed in the field, and the top bar kept `0.0.11002792` (screenshots before and after).
  - `0.0.99999999`: `This account does not exist on the Hedera testnet.` (the console showed the 404 of the backend).
  - a short text as the key: `The private key cannot be read. Enter its 64 hexadecimal characters, or its DER form.`
  - the backend stopped: `Cannot reach the API at http://localhost:3000. Is the backend running?` (the console showed `ERR_CONNECTION_REFUSED`).
- With the check of the text (production mode, no active account before): a key of 63 hexadecimal characters, and a key of 64 characters with one `z` in the middle, were each refused with `The private key cannot be read. Enter its 64 hexadecimal characters, or its DER form.`, and the top bar showed `No active account`.
- An account whose key is not a single key: the lookup of `0.0.2`, `0.0.50` and `0.0.800` each showed `The key of this account is not a single key.` The activation of `0.0.2` with a valid key was refused with `The key of this account is not a single key. This application signs with one key only.`; the top bar showed `No active account` and the key stayed in the field.

The display of the key

- The lookup of `0.0.11002792` showed `Public key (ED25519)` with the key and a Copy button, the lookup of `0.0.1100279` and of `0.0.6101287` showed `Public key (secp256k1)`; the key of 66 characters wrapped on two lines and did not overflow the panel (screenshots).
- After a click on Copy for `0.0.6101287`, the text pasted in a text editor was the public key of 66 characters, identical to the displayed one (compared by the assistant, character by character).

The weight of the SDK and when it is loaded

- In development mode (Network tab, JS filter), before the activation the list showed 17 requests and 3,791 kB of resources, and after it 27 requests and 8,535 kB. The console message `Patching Protobuf Long.js instance...`, which the SDK prints when it is loaded, appeared after the activation and not before.
- In production mode, the page `/accounts` loaded 10 JavaScript files, 157 kB transferred, the largest being 72.4 kB. After a click on "Use this account", one new JavaScript file was loaded, `0cl7ethvul3q3.js`: 293 kB transferred, 1,435 kB of resources, 155 ms. The whole activation made 2 requests: this file and one `fetch`.

What leaves the browser, and what stays in it

- The `fetch` of an activation is `GET http://localhost:3000/accounts/0.0.6101287`, status 200; the detail of the request has no Payload tab, and the address contains only the account ID.
- In a private window, before an activation and after it (account active), Local storage, Session storage, Cookies, IndexedDB and Extension storage of `http://localhost:3001` were empty.
- In the same private window, with all the levels of the console shown and the console cleared, a refusal (key of another account), a refusal (key of 63 characters, with the build before the check of the text) and a success were made one after the other. The console then held one line, a warning of the SDK (`Consider using fromStringECDSA() or fromStringED25519() on a HEX-encoded string and fromStringDer() on a HEX-encoded string with DER prefix instead.`), without any key. A filter on the first 12 characters of the key showed no line.

The cost

- The balance of the operator account `0.0.6106565`, read on Hashscan about 15 seconds after each step, with nothing else using the backend (said by the author): 913.33057300 ℏ before; 913.32938057 ℏ after one lookup of an account; 913.32818814 ℏ after one refused activation (the account ID typed was the operator's own, with another key); 913.32699571 ℏ after one successful activation. Each step cost exactly 0.00119243 ℏ.

Run by the assistant in a scratch project outside the repository (Next.js 16.4.0 and `@hashgraph/sdk` 2.68.0, a production build, headless Chromium), not by the author:

- The page compiled, loaded the SDK, generated an Ed25519 key, computed its public key and compared it with `PublicKey.equals`: it displayed `ED25519 true`. The same page worked with a Content Security Policy without `'unsafe-eval'` and with a nonce-based policy.
- The Node scripts on the formats of the keys and on the decoding of hexadecimal text, described in "Context".

### Not proven

- The answer `null` in the JSON of the backend for an account whose key is not a single key: only the message of the page was observed (it is shown when `key` is `null`, by the reading of the code), and the unit test.
- A key of the account that is changed on the network after an activation (not examined).
- The activation of the Ed25519 account with the key as 64 hexadecimal characters after the check of the text was added: it was observed before, and after it only for the ECDSA account.
- The console and the browser storage after the check of the text was added: they were examined with the build before it. The new check returns before the SDK is called.
- A key in PEM form or a mnemonic typed in the field: the check of the text refuses them (they are not hexadecimal), but none was tried.
- The origin of the entries of the normal window of the author's browser, `WCM_VERSION`, `theme` and `wallet_address` in Local storage and a database `WALLET_CONNECT_V2_INDEXED_DB` in IndexedDB: they were absent from the private window, before and after an activation, and no file of the repository, nor the lockfile, mentions WalletConnect (searched by the assistant).
- The behaviour in another browser than the one of the author.
