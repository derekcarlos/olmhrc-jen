# Chapel Calendar Implementation Plan

**Goal:** A static-site calendar with month navigation, agenda, event details and editable recurring schedules.

**Architecture:** Validated Markdown events feed an Astro component. A pure date module expands occurrences; a browser controller renders the grid/list and handles a native dialog. Existing Calendar Markdown becomes MDX to embed the component through ContentPage.

**Tech stack:** Astro, TypeScript, native browser DOM, Node test runner; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-31-chapel-calendar-design.md`

**Constraints:** Sunday 15:30; December 15–23 and December 24 at 19:30. Philippine Time. Preserve shared typography, dark mode and static hosting. Future events must remain visible. Do not invent end times.

**Review focus:** month/year boundaries, leap days, annual ranges and exclusions, visitors in other time zones, keyboard dialog closing/focus, small-screen readability, empty months, Astro client-side navigation.

- [x] Test and implement `src/lib/calendar.mjs`: ISO dates, Manila Today, month grids, occurrence expansion and formatting. Tests in `tests/calendar.test.mjs` cover Sunday recurrence, December ranges, leap years, exclusions and boundaries.
- [x] Add validated events collection in `src/content.config.ts`, three seed files in `src/content/events/`, and calendar data query without news-style future-date filtering.
- [x] Add `src/layouts/components/ChapelCalendar.astro` and `src/lib/calendar-client.ts`; replace calendar.md with calendar.mdx. Verify month navigation, agenda, dialog, fallback and mobile styling.
- [x] Write `docs/managing-events.md`. Run date tests, production build and Astro checks; verify published routes and browser interactions. Keep preview on port 4321.

## Verification

Production build passed; Astro check: 0 errors, 0 warnings, one pre-existing MassSchedule unused-import hint. Twelve calendar/song filter/YouTube unit tests passed; static calendar integration checks passed. Safari verified month navigation, all 14 December 2026 occurrences, Simbang Gabi details and Escape returning focus to the opener. Independent review identified text-fallback month validation; fixed with numeric bounds and malformed/boundary input tests. Mobile agenda is provided by the responsive layout; native browser automation could not complete viewport emulation while the user was using the browser. Preview remains at localhost:4321/calendar.
