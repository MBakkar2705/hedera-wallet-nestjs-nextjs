# ADR 0020: Content Security Policy with a nonce for each request

- Status: Accepted
- Date: 2026-10-15

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

- The CI with these changes (it runs the frontend lint and build; the frontend has no test).
- The operations themselves (an HBAR transfer, a token or a topic operation) under the enforced policy: only the pages were loaded, and the lookup and the activation (calls to the API) were run.
- The links between pages (`next/link`, which prefetch) under the enforced policy: the pages were opened by typing their address.
- That two requests get two different nonces: only one header was read.
- Browsers other than Edge, and the normal window of Edge (an extension could add reports).
- A deployment other than localhost: another address of the API, HTTPS, `upgrade-insecure-requests`.
- A reporting address (`report-uri`, `report-to`): none is set, the reports were read in the browser only.
- The line of the `eval` error in the console: it was seen in the Issues panel, the console list of the screenshot showed only the SDK message.
- The backend and Swagger: no policy is set there, and none was examined.
