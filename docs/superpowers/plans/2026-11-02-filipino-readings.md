# Filipino Readings Implementation Plan

> Execute inline using the executing-plans and test-driven-development skills. User authorized implementation in the existing localhost workspace; do not commit, push, or deploy.

**Goal:** Render a rolling Filipino readings page on localhost:4321 with daily sync machinery prepared for later activation.

**Architecture:** A bounded Awit at Papuri adapter produces a validated JSON snapshot. A local sync script persists it under ignored `.astro/readings/`; Astro renders the selected date and dated pages from that snapshot. GitHub Actions can recover the last published snapshot and sync daily, but production activation is explicitly opt-in while source reuse terms remain unconfirmed.

**Tech stack:** Astro static pages, existing node-html-parser, Node test runner, Astro Google font provider.

**Spec:** `docs/superpowers/specs/2026-11-01-filipino-sunday-readings-design.md`.

## Constraints and review focus

- Gentium Plus reading body, Gentium Book Plus headings; keep Figtree elsewhere.
- Default next-Sunday mode; optional today-plus-six-days; use Manila dates and retain Sunday through midnight.
- Reject misdated pages, unknown source structure, and incomplete readings. Never substitute another date's text.
- Recovery must preserve eligible cached records and remove expired ones; no generated content commits.
- Daily workflow must not activate full-text production importing without an explicit repository variable.
- Work in the existing directory because the user explicitly requested this running localhost instance. Leave changes uncommitted.

## Task 1 — Source and rolling snapshot

Files: `src/lib/readings.mjs`, `src/lib/readings-source.mjs`, `src/config/readings.json`, `scripts/sync-readings.mjs`, `tests/readings.test.mjs`, original-prose HTML test fixtures.

- [ ] Write tests for Manila boundaries, date windows, HTML-to-sections, weekday structure, response line breaks, source date validation, and snapshot recovery/pruning.
- [ ] Run the tests red before creating the library.
- [ ] Implement window helpers, strict snapshot validation, bounded fetch and adapter, and atomic local snapshot writing. Reuse existing HTML parser; no new dependency.
- [ ] Run tests green and perform a local live-source smoke import.

## Task 2 — Reading pages and typography

Files: dedicated `/readings` routes, JSON endpoint, shared component, client date enhancement, scoped CSS, theme/font setup; remove placeholder route content.

- [ ] Create integration checks for five reading sections, source attribution, inactive dates, font scoping, escaped content, and seven-day selection.
- [ ] Render the default Sunday and available-date navigation from the validated snapshot; show explicit missing/stale states. Preserve no-JavaScript content.
- [ ] Register reading font through Astro and selectively preload it on reading pages. Keep headings and other body typography unchanged.
- [ ] Check rendering through generated HTML and localhost HTTP responses.

## Task 3 — Daily workflow, maintenance, verification

Files: existing deployment workflow, package scripts, `docs/managing-readings.md`, README.

- [ ] Add daily 04:17 PHT trigger, manual refresh, fixed-site baseline recovery, and explicit production activation variable.
- [ ] Document sync command, mode setting, source limitation, activation, freshness and recovery.
- [ ] Run complete unit suite, Astro check, production build, existing calendar integrations, and new reading integrations.
- [ ] Restart localhost:4321 only if required by font/routes configuration; verify `/readings` and a dated page return 200.

## Execution notes

- Astro documentation MCP reached directly via its configured HTTP endpoint; static endpoints and font preloading documentation read. The referenced astro-template-guidance skill is absent from available catalogs and local skills; use existing ContentPage and component conventions.
- Local preview uses a real source retrieval with visible attribution. This does not establish republication rights. Production syncing remains opt-in; source terms must be resolved before publishing full-text content.

## Verification ledger

- Task 1 complete: importer/window tests ran red before implementation and green afterward. A real Sunday import retrieved November 8. Seven-day smoke import retrieved six dates; November 2 was rejected for missing expected source content. Final local snapshot restored to Sunday-only.
- Task 2 complete: generated HTML integration checks ran red before routes existed, then passed. Local `/readings` and `/readings/2026-11-08` returned 200, with five sections and five response blocks. Three actual client DOM tests cover Sunday retention, midnight expiry, and seven-day pruning. Font asset preloads are checked on reading pages and excluded on Home.
- Task 3 complete: daily workflow and optional activation variable prepared; maintenance guide and README updated. Source changes remain uncommitted; no account settings changed and no workflow run or deployment initiated.
- Final independent review found one important issue: closing formulas alone passed source completeness checks. Two regression tests reproduced it red; parser now requires reading body and Psalm stanza content, preserves cached data on failure, and the full unit suite passed afterward.
- Final validation: 40 unit tests; three readings client DOM tests; existing calendar DOM test; static calendar/readings integrations; Astro check with zero errors/warnings/hints; production build passed.
- Visual limitation: in-app browser provider unavailable. Actual mobile/theme screenshots were not inspected; HTTP responses, generated HTML, font assets, source preservation, and client DOM behavior were checked.
- Additional configuration change: exclude the pre-existing ignored nested `olmhrc-jen` checkout from TypeScript checking. It was introducing an unrelated missing generated search JSON error; its files were left untouched.
