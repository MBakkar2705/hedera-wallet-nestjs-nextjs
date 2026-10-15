# ADR 0010: Active account held in memory

- Status: Accepted
- Date: 2026-10-08

## Context

ADR 0009 decided that the user enters a private key explicitly and that the frontend keeps it in page memory only. The HBAR transfer screen is the first screen that needs the key of the sender, and the token screens will need it too. The question is how the key travels from the user to each screen.

## Decision

1. The user activates one account (account ID and private key) on the accounts page. It is kept in React state in `frontend/lib/active-account.tsx`, shared by all pages through a context provider added in `layout.tsx`.
2. Screens that sign an operation read the sender from the active account. The user does not type the key again.
3. Mitigations:
   - The key is typed in a text field whose characters are hidden with CSS (`-webkit-text-security: disc`), with `autoComplete="off"` and `spellCheck={false}`, and the field is cleared once the account is activated. It is not a `type="password"` field, because Edge offered to save the key in its password manager for such a field, whatever `autoComplete="off"` says.
   - The top bar shows the account ID only, never the key.
   - A Forget button removes the active account.
   - The active account is forgotten after 5 minutes without a click or a key press (`INACTIVITY_LIMIT_MINUTES`).
   - A page reload removes it, because it is never written to `localStorage`, `sessionStorage`, cookies, URLs or logs.
4. The backend is not changed. The key is still sent in the request body, as decided in ADR 0009.

## Alternatives considered

- Asking for the key in every form. The key is exposed only while an operation is prepared, but it is typed on every screen and every time. Not chosen: it multiplies the places where the key is typed.
- A `type="password"` field for the key. It was the first version. Replaced because the browser offered to save the key as a password.
- Signing with a wallet, so that no key reaches the page or the API. Still a possible evolution (see ADR 0009), not implemented.

## Consequences

- The key stays in memory longer than with per-form entry: until Forget, the 5 minute limit, or a reload.
- Any script that runs in the page can read it, and so can the browser developer tools. A Content Security Policy is not configured yet.
- The key is sent to the backend over plain HTTP on localhost. This is acceptable for a testnet demo only, never for real funds.
- Moving between pages with the in-app links keeps the active account. Loading a page again clears it.
- The CSS masking was checked in Edge only. If a browser ignores that CSS property, the key would be displayed in clear text.
- Every new screen that signs must use the active account and must not store the key.

## Verification

### Proven

- `pnpm --filter frontend lint` reports nothing and `pnpm --filter frontend build` succeeds, with the `/transfer` route listed.
- From the active account `0.0.10937780`, a transfer of 1 HBAR to `0.0.10937901` showed `Status: SUCCESS` on the transfer page, with the transaction ID `0.0.10937780@1791480449.935752603`. The balance of the recipient, read with the accounts page, went from 1 to 2 HBAR.
- After "Use this account", the top bar showed the account ID and no key.
- The association and transfer forms of the tokens screen used the active account: an association and a transfer of tokens succeeded with accounts activated from the form.
- After Forget, the bar showed "No active account", and the transfer page showed the message with the link to the accounts page.
- After a page reload, the active account was gone.
- With the account active and no click or key press, the bar showed "No active account" at 18:56, about 5 minutes after the last click (the transfer, at about 18:50). The exact moment of the change was not observed.
- The "Use an existing account" form, first version with a `type="password"` field: the key was shown as dots, the bar showed the account ID and not the key, the field was empty after activation, and a transfer of 1 HBAR from that account succeeded (transaction `0.0.10940355@1791485468.075806260`).
- With that `type="password"` field, Edge displayed "Enregistrer votre mot de passe ?" with the account ID as user name, although `autoComplete="off"` was set. The user chose "never" for the site, so nothing was saved.
- After the field was changed to a CSS-masked text field, in an InPrivate Edge window the key was shown as dots and no save prompt appeared. Lint and build passed.
- A search in the files of the four screens and the active account (`app/`, `components/`, `lib/active-account.tsx`, `lib/transfer.ts`, `lib/accounts.ts`, `lib/tokens.ts`, `lib/topics.ts`) found no call to `localStorage`, `sessionStorage` or cookies. The only match is a comment.

### Not proven

- The exact delay of the automatic forget: only the result about 5 minutes after the last click was observed.
- The activation and a transfer with the final CSS-masked field: only the masking and the absence of the save prompt were checked after the change.
- The masking and the absence of a save prompt in browsers other than Edge.
- The error path of a transfer, for example an insufficient balance: no failing transfer was tried.
- The HTTP status of the `transfer` request in the Network tab was not reported.
- That nothing stores the key: the browser storage was not inspected, and the Network and console logs were not searched for the key.
- Protection against scripts in the page: no Content Security Policy exists.

## Note of 2026-10-15

A Content Security Policy now exists: see [ADR 0020](0020-content-security-policy-with-a-nonce.md). The sentences above that say no policy is configured describe the state of 2026-10-08. The other limits of this record are unchanged: a script that runs in the page can still read the active key.
