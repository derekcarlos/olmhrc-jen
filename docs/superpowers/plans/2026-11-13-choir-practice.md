# Choir Practice Implementation Plan

> Execute inline using superpowers:executing-plans. Keep all changes local;
> do not commit or push without a new user request.

**Goal:** One editable, ongoing song list with lyrics navigation and personal
practice checkmarks, independent of dated Mass lineups.

**Architecture:** Validate song references in a separate JSON list. Reuse
SongPractice for lyrics/audio/video, supplying a practice navigation context.
Reuse the existing practice-progress helpers with stable song IDs and a new
storage key; use a small client for both list and detail checkboxes.

**Tech stack:** Existing Astro, TypeScript, JSON, Node tests and JSDOM.

**Spec:** ../specs/2026-11-13-choir-practice-design.md

## Constraints and review focus

- No required Mass parts or dates; no duplicate, missing or draft songs.
- Empty list is valid; do not invent the initial song choices.
- Song order survives navigation, and marks survive reorder/add/remove.
- Storage failures allow temporary checks; JavaScript-free lyric links work.
- Dates, lineup links, progress, Tagalog content and media behavior stay intact.
- User clarification: prioritize a list of links to full lyrics; listening
  remains on the existing song page rather than requiring an extra list player.
- Missing astro-template-guidance skill remains unavailable; use the existing
  Songs page/component conventions as in the previously authorized work.

## Task 1: Practice catalog and progress

Files: src/config/choir-practice.json, src/lib/choir-practice.mjs,
src/lib/choir-practice-client.ts, tests/choir-practice.test.mjs,
tests/choir-practice-client.integration.mjs.

- [x] Test flexible ordering, optional notes, invalid references/duplicates,
  empty list, progress restoration/reorder, storage failure and reversible marks.
- [x] Run tests red, implement parser/path helpers and list/detail client,
  run tests green. Keep one stable progress key and song ID keys.

## Task 2: Pages and navigation

Files: src/lib/songs.ts, src/layouts/components/ChoirPracticeProgress.astro,
src/layouts/components/SongPractice.astro, src/pages/songs/practice/index.astro,
src/pages/songs/practice/[slug].astro, src/pages/songs/index.astro,
src/styles/choir-practice.css, docs/managing-choir-practice.md.

- [x] Add list loading, reserved route filename, list and selected-song static
  routes. Give SongPractice an optional context for practice links and notes.
- [x] Render ordered song links, progress, checkbox labels and an empty state;
  add the Songs shortcut and editing instructions with an example JSON entry.
- [x] Verify empty and populated pages, previous/next/full-list links, identical
  song content and absence of dated-lineup links in the practice context.
- [x] Run relevant song tests, Astro check/build and local UI checks for both
  themes and mobile. Review the diff for scope and update this checklist.

## Execution record

- List markup lives directly in its Astro page; only the progress section needs
  to be shared with SongPractice. The browser-safe path helper lives alongside
  lyric-size helpers, avoiding a browser import of the validation schema.
- Parser/progress tests observed failing before implementation, then passed.
- All 180 unit tests passed. Astro check reports no errors, warnings or hints.
  Production build generated 395 pages with the empty editorial list.
- Tested three temporary existing songs (including two processional songs)
  through every lyrics page. Verified native links, original content, notes,
  previous/next, device storage and checkbox restoration after navigation.
- Headless Chrome at widths 390 and 1280 in light/dark: no horizontal overflow,
  controls ready, legible typography. Screenshots inspected. Temporary choices
  restored to the empty list after verification.
- Independent read-only code review found no actionable issues.
- Unrelated user audio-file changes discovered during work were left untouched.
- No commits or pushes performed.
