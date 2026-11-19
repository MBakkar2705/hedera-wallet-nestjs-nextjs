# ADR 0011: Design system with Tailwind tokens and local components

- Status: Accepted
- Date: 2026-10-09
- Note (2026-11-19): Observed by the author in Chrome 157 (private window, production mode, `prefers-color-scheme: dark` emulated in DevTools): the dark mode displays on the four pages and the author judges it good. The theme follows the system; there is no switch. Lighthouse 13.5.0 (Snapshot, Desktop, Accessibility) on `/topics`: dark mode 20 audits passed and 1 failed (contrast, 4 elements: the active tab, "Create topic", "Publish", "Load messages"); light mode 21 of 21. The ratios were computed by the assistant from `frontend/app/globals.css`, not measured by Chrome: active tab 5.25:1 in light and 3.43:1 in dark, buttons 6.12:1 in light and 4.35:1 in dark (4.5:1 is needed); the same `--brand` colour is used for text and for button backgrounds, so a fix needs two values (item 36 of `docs/backend-evolutions.md`). Not proven: the contrast of each element measured by a browser tool; the pages other than `/topics`; the manual checks of Lighthouse (10); the browsers other than Chrome.

## Context

The four screens were first built with Tailwind classes copied from page to page (then gathered in `frontend/lib/styles.ts`), in black and grey. The goal was a more lively look, in indigo and violet, applied to every page, without adding dependencies and without changing the behavior of the screens. The user chose the indigo/violet direction and asked to review the result before accepting it.

## Decision

1. The colors are defined once, as CSS variables in `frontend/app/globals.css`, and mapped to Tailwind names with `@theme inline` (`background`, `foreground`, `surface`, `surface-muted`, `line`, `muted`, `brand`, `brand-strong`, and the tones `success`, `danger`, `warn`). Dark values are defined under `prefers-color-scheme`.
2. The repeated parts of the interface are local components in `frontend/components/ui/`: `Button`, `Field` (with `Input` and `Textarea`), `Panel` (with `PageHeader` and `PanelList`), `Callout`, and `CodeValue` (a value shown in monospace with a Copy button).
3. The layout shared by all pages is in `frontend/components/`: `AppHeader` (sticky header with navigation), `ActiveAccountBar`, `BrandMark`, `NoActiveAccount`. The footer in `layout.tsx` states that the application is an independent demo, not an official Hedera product.
4. The brand mark is an original wallet icon. The Hedera logo is not used.
5. Keys and transaction values shown after an operation have a Copy button, with a warning that the clipboard may be read by other programs on the computer.
6. No dependency is added: the fonts are Geist Sans and Geist Mono and the styling is Tailwind only. `frontend/lib/styles.ts` is deleted.

## Alternatives considered

- A component library such as shadcn/ui. Not chosen: it adds dependencies and generated code to maintain, for six pages.
- A complete UI library such as MUI. Not chosen: it brings its own styling system next to Tailwind, for a small application.
- Keeping classes copied into each page or in `lib/styles.ts`. Not chosen: a change of color or spacing would have to be repeated in many places.
- Using the Hedera logo in the header. Not chosen: it could suggest an official Hedera product.

## Consequences

- Changing the palette means editing `globals.css` only.
- A new screen should use the components of `components/ui/` instead of new copied classes.
- The dark values are written but were never looked at on screen.
- The colors depend on the Tailwind 4 `@theme inline` syntax, which is specific to this version.

## Verification

### Proven

- No dependency was added: `git status` before the commit listed neither `frontend/package.json` nor `pnpm-lock.yaml`.
- `pnpm --filter frontend lint` reports nothing and `pnpm --filter frontend build` succeeds on the final version, with the routes `/`, `/accounts`, `/transfer`, `/tokens`, `/topics` and `/_not-found`.
- In Edge, the home page, the accounts page, the transfer page, the tokens page (create and associate) and the topics page were displayed and found readable by the user. The sticky header stays visible when the window is reduced.
- At a narrow window width, all the screens (home, accounts, transfer, tokens, topics) were checked by the user.
- The Copy buttons of the accounts page copy the expected values, according to the user.
- The existing operations still work after the redesign: an HBAR transfer succeeded (`0.0.10952224@1791537756.598356876`), a token was created (`0.0.10952325`, symbol `TST2`) and associated with the active account, and topics were created and read back.
- The topics page shows the topic ID of the displayed list, clears the list and the last publication result when a new topic is created, and shows the "no message yet" hint only for a backend error. Each case was checked by hand.

### Not proven

- Color contrast was computed from the hex values, not measured on screen with a tool.
- The dark mode was not displayed.
- Other browsers than Edge, including the CSS masking of the key field (see ADR 0010).
- A token transfer from the operator account with the redesigned tokens page was not reported.
