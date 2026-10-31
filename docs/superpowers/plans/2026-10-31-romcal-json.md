# Romcal JSON Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task, with a final independent review.

**Goal:** Generate Philippine liturgical observances automatically as static yearly JSON and retain editable local events.

**Architecture:** Server-only Romcal adapter normalizes one year's primary celebrations. Static endpoints export each supported year; a cached client loader supplies the existing grid. Current-year JSON is embedded for the initial render.

**Tech Stack:** Astro 7, Node 22, pinned Romcal 3 preview and Philippines plugin, native fetch, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-31-romcal-json-design.md`

## Constraints and review focus

- Preserve 1900–2100 month range and Philippine date behavior.
- No optional memorials, no external runtime service, no Romcal browser bundle.
- Transfers, suppressed observances, malformed JSON, network retries, rapid year navigation, and local-override deduplication need behavioral verification.
- Work in the user-requested directory. No Git repository is initialized; no branch or commit operations apply.

## Tasks

- [x] 1. Adapter and endpoint: add `src/lib/liturgical-calendar.mjs`, presentation JSON in `src/config/liturgical-calendar.json`, and `src/pages/calendar-data/[year].json.ts`. Test 2026/2027 fixtures, Annunciation transfers, Sunday suppression, Philippine feasts, optional exclusion and valid range. Watch tests fail before implementing. Run tests and build endpoint.
- [x] 2. Calendar consumption: add `src/lib/calendar-data-client.mjs` with success/inflight caching, response validation and retry. Add matching override support to `calendar.mjs` and event schema. Embed initial yearly records, load selected-year JSON with stale-response guards and retry feedback. Test loader errors/retry and local deduplication. Preserve Upcoming Events from local schedules only.
- [x] 3. Migrate: remove imported/year-specific liturgical Markdown only after generated parity checks; retain five local schedules/chapel celebration files and add the October 7 replacement ID. Update docs and integration tests to verify JSON output, local schedule behavior and no duplicated calendar markers. Run build, all tests, Astro diagnostics and live endpoint checks. Request independent review, resolve important findings, and finish preview verification.

## Progress / rulings

- Dependencies installed and pinned. Preliminary generation of 201 years takes about 2.1 seconds locally; yearly static JSON is practical.
- Romcal serializes localized names only with `outputOptions.calculateProperties: true`.
- Romcal's primary entry is used when a day includes alternatives. This matches the previously checked Philippine calendar's June 5, 2027 Marian memorial and avoids displaying both competing memorial choices.
- Existing unrelated peer mismatch: Google Tag Manager integration requires Astro 6 while site uses Astro 7; tracking is disabled and this predates the Romcal dependencies.

## Completion evidence

- All 113 migrated Markdown entries have generated replacements on the same dates and categories; their migration backup is in ignored `.astro/romcal-migration-backup.json`. Five local Markdown files remain.
- 28 unit tests pass, including four adapter tests, four loader tests, and same-day replacement coverage. New tests were observed failing before implementation.
- Production build and static calendar integration pass. All 201 yearly JSON files validated; representative live requests cover both range boundaries and transfer years. Astro reports zero errors, warnings, and hints.
- Added a jsdom development-only test to execute the actual calendar client against the built HTML. It verifies marker/dialog contents, local Rosary deduplication, year fetch caching, delayed-response guards, retry after HTTP failure, retained local events, and an unchanged Upcoming Events panel. This passes as the 29th test. It is a DOM behavior check, not visual browser QA.
- Independent review found one issue: a missing URL separator for subpath deployments. The loader now joins the site base with `/calendar-data/`; root and subpath behavioral tests were observed failing and then passing. No deferred review findings remain.
- Ruling: Romcal's pinned Philippines package omits Santo Niño, so a source-backed third-Sunday-of-January rule is stored in the presentation JSON. Verify this supplement when updating the package to avoid future duplication; the generator already skips it if the library supplies the ID.
- Direct visual browser QA was blocked by automatic approval review because rebinding Safari could expose its unrelated Start Page. No private page was intentionally inspected. DOM, build, integration and live-data verification provide coverage, but no new visual sign-off is claimed.
- Development server restarted on port 4321 with the new dependencies and schema. No deployment was performed.
