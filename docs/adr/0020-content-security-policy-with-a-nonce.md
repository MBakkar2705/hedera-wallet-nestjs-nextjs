# ADR 0020: Content Security Policy with a nonce for each request

- Status: Accepted
- Date: 2026-10-15
- Note (2026-11-17): Observed by the author with Next.js 16.4.6 (development mode, Edge InPrivate): `GET /accounts` answers HTTP 200 with a `content-security-policy` header that carries a nonce and `'strict-dynamic'` (and `'unsafe-eval'` in `script-src`, not compared with a production build), and the `Link` preload headers carry the same nonce; the four pages display and the console shows only the messages of the development server, no red error. The operations of the first item of "Not proven" (an HBAR transfer, the creation of a token and of a topic) are no longer unobserved: they were run in development mode, where `proxy.ts` sets the policy on every page, together with the creation of an account, the publication of a message and the association of a token; the transfer of tokens was not run. Still not proven: two requests with two nonces (one header read in this run), the production mode, and browsers other than Edge. The Edge window of that run also had the device emulation on (captures of 2026-11-17: Responsive 535×659, Save-Data).
- Note (2026-11-19): Observed by the author, frontend of Next.js 16.4.6 on port 3001. Nonces, read with `curl.exe` and `Invoke-WebRequest` (HTTP clients, no script run): in development mode (09:37 UTC) two requests to `/accounts` got two different nonces, `MTZkMmQ5Y2Qt…` and `NTI0MmQzYmYt…`, with `'unsafe-eval'` in `script-src` and `'unsafe-inline'` in `style-src`. In production mode (`pnpm --filter frontend build`, then `next start -p 3001`; 09:43 UTC) two requests got two different nonces, `NjViNjE1YjAt…` and `NTUzYzExYmEt…`; `script-src` is `'self' 'nonce-…' 'strict-dynamic'` without `'unsafe-eval'`; `style-src` is `'self' 'nonce-…'` without `'unsafe-inline'`; for each request, the one nonce found in the `nonce="…"` attributes of the page is the nonce of the header of that request, and the same nonce is in `script-src` and in `style-src`. The rest of the policy is the one of Decision 2. Edge 157, InPrivate, production mode. The runs of the morning (09:47 to 10:11 UTC) and the transfer of 17:43 were made with the device emulation of DevTools left on by mistake (Responsive 535×659, Pixel 10; the request headers carry `Sec-Ch-Ua-Mobile: ?1` and `"Android"`); the policy comes from the server, so this does not change the headers, but it changes what the pages displayed. The captures of 2026-11-17 show the same emulation. At about 18:00 UTC the emulation was turned off (`navigator.userAgent` with `Windows NT 10.0` and `Edg/157.0.0.0`) and the pages were loaded again. Edge, with the emulation: the four pages displayed with an empty console; a topic was created (`POST /topics` 201, `0.0.11527294`), a message was published (`POST` 201, transaction `0.0.6106565@1795081785.500388189`), then read twice (`GET` 200; one click on "Load messages" made one request); `0.0.11046727` was activated; an HBAR transfer of 1 ℏ to `0.0.11035637` ended with `SUCCESS` (preflight 204, `POST /accounts/transfer` 201; balances 7 to 6 ℏ and 14 to 15 ℏ, the operator paid the fees). In all these runs the Issues panel had 0 errors and 0 warnings, and only the notice about form fields (4, 7 or 11 resources according to the page, 15 after the activation, 6 after the transfer). The `eval` error described in Decision 6 and in the Consequences was not seen after the activation; the difference with 2026-10-15 is not explained. Edge, without the emulation: `/accounts` with the lookup of `0.0.11046727` (`GET` 200), `/tokens` (`GET tokens?page=1&limit=10` 200), `/topics` and `/transfer` loaded; console empty; Issues 0 errors, 0 warnings, notices 4, 7 and 11. Links: in Edge and in Chrome, the `?_rsc=…` requests of `next/link` for `/`, `transfer`, `tokens` and `topics` all answered 200 (20 requests of `/accounts` in Chrome, all 200), with no policy error; the pages were reached by clicking the tabs of the site. Chrome 157 (private window, Windows, `navigator.userAgent` without `Edg`, no emulation), production mode: the header of `GET /accounts` (200) is the production policy above (nonce `YWZlMDlm…`); the four pages load, the console is empty, Issues 0 errors and 0 warnings with the same notices (4, 7, 11); the lookup of `0.0.11046727` (`GET` 200, same response, 534 B) and the creation of a topic (`POST /topics` 201, `0.0.11531853`) work. No account was activated in Chrome. Not proven by this note: the creation, association and transfer of tokens under the policy in production (not run on 2026-11-19; only the `/tokens` page and its list were loaded); an activation or a transfer in Chrome, and a transfer or a topic in Edge without the emulation; the status of the preflight of `POST /topics` in Chrome (not shown); the browsers other than Chrome and Edge (same Chromium 157 engine); a deployment other than localhost; a reporting address.

## Context

ADR 0010 records that no Content Security Policy (CSP) is configured, and that any script that runs in the page can read the active private key. A CSP does not remove that second point. It limits which scripts the browser agrees to run, which reduces the chance that a script injected into the page runs at all.

Facts that can be checked:

- The frontend is Next.js 16.4.0 (Turbopack). The file `proxy.ts` is the place where Next.js 16 runs code before each request (it was called `middleware.ts` before).
- The Next.js documentation on Content Security Policy (page dated 2026-03-20, read by the assistant on 2026-10-15) says: a nonce must be new for each request, so the pages that carry it must be rendered for each request (`await connection()` forces this); Next.js reads the `'nonce-…'` value in the `Content-Security-Policy` header of the request and puts it on its own scripts; Partial Prerendering is incompatible with a nonce; in development `'unsafe-eval'` is needed because React uses `eval`, and it is not needed in production; an experimental option (Subresource Integrity) and a policy set in `next.config` with `'unsafe-inline'` are the alternatives that keep pages static.
- The browser calls the API directly, at `API_BASE_URL` (`frontend/lib/api.ts`: `NEXT_PUBLIC_API_URL`, or `http://localhost:3000`).
- The production build of the frontend has 13 JavaScript files in `.next/static/chunks`. Only one contains the text `eval(`: `0cl7ethvul3q3.js`, the file that holds the SDK (loaded at activation, see ADR 0019), once. None contains `new Function`. The text around it is the function `inquire` of `protobufjs`: `try{var mod=eval("quire".replace(/^/,"re"))(moduleName);…}catch(e){}return null`. A refused `eval` throws inside the `try`, is caught, and the function returns `null` (searched and read by the assistant in the build of the author's repository, 2026-10-15).
- No file of the frontend uses a `style=` attribute (searched by the assistant).

The criteria used to choose:

- **Only the scripts and styles that carry the nonce of the request run**, as in the Next.js example.
- **In production, no `'unsafe-inline'` and no `'unsafe-eval'` for scripts.**
- **Reversible:** the policy is first sent in report-only mode, which blocks nothing, then enforced.
- **A change that can be reviewed:** one new file and a few lines in the root layout.

## Decision

1. **A new file `frontend/proxy.ts` sets the policy on every page request.** It creates a new nonce for each request, builds the policy, and sets it in the `Content-Security-Policy` header of the request (so that Next.js puts the nonce on its scripts) and of the response (so that the browser applies it). The static files, the image files, `favicon.ico` and the prefetch requests of `next/link` are not matched.
2. **The policy:** `default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'`; `style-src 'self' 'nonce-…'`; `img-src 'self' blob: data:`; `font-src 'self'`; `connect-src 'self'` followed by `API_BASE_URL`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
3. **Development differs.** With `NODE_ENV=development`, `script-src` also has `'unsafe-eval'`, and `style-src` is `'self' 'unsafe-inline'` instead of the nonce (a nonce makes the browser ignore `'unsafe-inline'`, so only one of the two is given). The Next.js documentation does the same.
4. **The root layout is `async` and calls `await connection()`**, so that every page is rendered for each request and can carry the nonce.
5. **How it was put in place:** the header was first `Content-Security-Policy-Report-Only`, which reports in the browser console what the policy would block. After the pages were checked, the constant `CSP_HEADER` of `proxy.ts` was changed to `Content-Security-Policy`.
6. **`'unsafe-eval'` is not allowed in production.** The only `eval` of the production code is the one described in the Context, and the SDK works when it is refused. The browser shows one error in its Issues panel when the SDK is loaded (see Verification).
7. **Not changed:** the other security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, …), the backend (it answers JSON, and a CSP applies to pages), and the policy of Swagger.

## Alternatives considered

- **A policy in `next.config` (`headers()`) with `'unsafe-inline'` for scripts.** It keeps the pages static. Not chosen: `'unsafe-inline'` lets any inline script run, which is the case a CSP is meant to stop.
- **Experimental Subresource Integrity of Next.js.** Not chosen: the documentation calls it experimental, and the nonce is the documented way for the dynamic case. Not examined further.
- **`'unsafe-eval'` in production for scripts.** Not chosen: it would allow `eval` for every script of the page to avoid one error that the code already catches.
- **Replace `@protobufjs/inquire` by an empty module with a Turbopack alias**, so that the `eval` disappears from the build. Not needed as long as the activation works with the `eval` refused (it did). It stays the way out if a browser or a later version of the SDK makes that `eval` matter. Not tried in the repository.
- **Partial Prerendering.** Not used: the documentation says it is incompatible with a nonce.
- **`upgrade-insecure-requests`**, which the documentation example has. Not added: the API is called over plain HTTP on localhost (ADR 0010). Not tried.

## Consequences

- The pages are rendered for each request: the build lists the routes as dynamic (`ƒ`), and the documentation says they cannot be cached by a CDN without more configuration. For this application (a demo with a backend on localhost) the cost was not measured.
- The browser can only call the application itself and the API address. A script, a font or an image from another origin, or an inline script without the nonce, is blocked until the policy is changed.
- An inline `style=` attribute added later would be blocked in production. There is none today.
- The address of the API is part of the policy. If the API is served from another address, the policy follows `API_BASE_URL`.
- In production, the browser shows in its Issues panel an error about `eval` each time the SDK is loaded (observed once, after an activation). It is expected and harmless: the call is inside a `try`.
- The limits of ADR 0010 stay: a script that runs in the page can still read the active key. The policy lowers the chance that an injected script runs, it does not make the page safe against a script that is allowed.

## Verification

### Proven

Observed by the author on 2026-10-15, in an InPrivate window of Edge, with the backend on the testnet and the account `0.0.6101287` (activated with its key as 64 hexadecimal characters). "Production mode" is `pnpm --filter frontend build` then `start`, "development mode" is `pnpm --filter frontend dev`, both on port 3001.

Checks of the code

- `pnpm --filter frontend lint` printed nothing, with `proxy.ts` enforcing and the changed `app/layout.tsx`. The production build succeeded and listed the routes as `ƒ`.
- The search of the production build for `eval(` and `new Function` described in the Context (by the assistant).
- The CI was green on GitHub Actions for the commit that added `proxy.ts` (run #54, 1 min 4 s) and for the same content after the messages of the two commits of the branch were rewritten (run #55, 54 s). The CI runs the frontend lint and build; the frontend has no test.

Report-only, before enforcing

- In development mode, 33 reports in the console, all of the kind `style-src-elem`, came from a `style-src` with the nonce; the development `style-src` was then changed to `'unsafe-inline'`.
- In production mode, the five pages (`/`, `/accounts`, `/transfer`, `/tokens`, `/topics`) were loaded with no report. The only report was the `eval` after an activation, which led to Decision 6.

Enforced, production mode

- The header of `http://localhost:3001/accounts`, read with `curl.exe -s -D - -o NUL`, is named `content-security-policy` and holds the policy of Decision 2 with `connect-src 'self' http://localhost:3000`, a nonce in `script-src` and in `style-src`, and neither `'unsafe-eval'` nor `'unsafe-inline'`.
- `/accounts` loaded and showed its page; the console was empty. "Get info" for `0.0.6101287` showed the account (balance 1000 ℏ) and the request `0.0.6101287` was a `fetch` with status 200; the console was empty.
- The activation of `0.0.6101287` succeeded: the top bar showed the active account and the field of the key was emptied. The Network tab showed `0cl7ethvul3q3.js` loaded (293 kB) and the `fetch` with status 200. The Issues panel showed one error, "Content Security Policy of your site blocks the use of `eval` in JavaScript", with one directive, `script-src`, status `Blocked`, at `0cl7ethvul3q3.js:5`. The console list showed one line, `Patching Protobuf Long.js instance...` (the message the SDK prints when loaded, ADR 0019).
- `/transfer` and `/` loaded with an empty console and "No issues detected". `/tokens` and `/topics` loaded with an empty console. Their Issues panel showed only "A form field element should have an id or name attribute" (3 and 4 resources), which the author confirms was already there before the policy.

Enforced, development mode

- `/accounts` loaded and showed its page. The console showed `[HMR] connected`, and the websocket `hmr` had the status 101. The Issues panel showed 0 errors and 0 warnings of the policy, and the same notice about form fields (4 resources).
- The activation of `0.0.6101287` succeeded. The Issues panel still showed 0 errors, and the console showed `[HMR] connected` and `Patching Protobuf Long.js instance...`.

Run by the assistant in a scratch project outside the repository (Next.js 16.4.0, `@hashgraph/sdk` 2.68.0, a production build, headless Chromium), not by the author: a page that loads the SDK and uses it worked with a policy without `'unsafe-eval'` and with a nonce (also reported in ADR 0019).

### Not proven

- The operations on tokens (creation, association, transfer) under the enforced policy in production: the HBAR transfer, the topic and the message were observed (note of 2026-11-19), the operations on tokens were not run.
- Browsers other than Chrome and Edge (Chrome was tried on 2026-11-19, with the same Chromium 157 engine as Edge), and the normal window of Edge (an extension could add reports).
- A deployment other than localhost: another address of the API, HTTPS, `upgrade-insecure-requests`.
- A reporting address (`report-uri`, `report-to`): none is set, the reports were read in the browser only.
- The line of the `eval` error in the console: it was seen in the Issues panel, the console list of the screenshot showed only the SDK message.
- The backend and Swagger: no policy is set there, and none was examined.
