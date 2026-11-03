# Future choir lineups implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Keep all work local; no commits or pushes.

**Goal:** Publish multiple dated choir lineups, make future celebrations available for early practice, and preserve each lineup's rehearsal context.

**Architecture:** Separate publication (`draft`/`published`) from readiness (`preliminary`/`confirmed`). Generate static rehearsal and contextual song pages for every published selection. Reuse the existing playlist/player and lyric components. Filter the landing page and archive by Philippine dates in the browser, loading only the featured Sunday rehearsal when it changes.

**Tech stack:** Astro static pages, existing TypeScript/JavaScript clients, Zod, Markdown song library, existing MP3/YouTube players and browser-local practice marks.

**Spec:** User-approved design in this conversation: this Sunday first, Prepare ahead cards, full rehearsal pages, preliminary/confirmed labels, automatic Philippine-date grouping, scoped song navigation; Practice Focus deferred. User approved copying November 8 songs into clearly preliminary November 22 and 29 lineups.

## Global constraints

- No commits, pushes, deployment, new dependencies, or changes outside the current checkout.
- Preserve current songs, recordings, existing selection IDs, and progress keys.
- Draft selections must have no public routes or serialized public metadata.
- Published partial selections may leave songs unchosen; unused parts remain distinct.
- Main selection means this/next Sunday in Philippine Time. A distant future selection must not impersonate this Sunday's missing lineup.
- Keep one preview player at a time, no autoplay, ordinary lyric links and usable static pages.
- Preserve current homepage work and unrelated design document.

## Review focus

- Shared songs must retain the chosen lineup through Previous/Next, setlist, and return links.
- Philippine midnight must advance Sunday grouping without rebuilding, including year changes and missing Sundays.
- Drafts, invalid published dates, broken song IDs, duplicate IDs/parts must be handled deliberately.
- Switching a featured rehearsal must pause/remove old media, initialize once, and survive failed fetches.
- Progress must stay independent for two celebrations using the same songs.

## Task 1: Catalog and date grouping

**Files:** `src/lib/selection-catalog.mjs`, `src/lib/selection-dates.mjs`, `src/lib/songs.ts`, `src/config/song-selections.json`, `tests/song-selections.test.mjs`.

- [x] Write/run failing tests for multiple published selections, hidden drafts, readiness defaults, invalid dates/song references, stable scoped song paths, Philippine Sunday grouping and archive order.
- [x] Implement catalog validation and `groupSelections(selections, now)` returning `sunday`, `featured`, `future`, `past`; `selectionSongPath(selectionId, songId, base)` returns a static contextual URL.
- [x] Migrate existing entries to published, preserving preliminary status for old placeholder notes; copy November 8 into November 22 Christ the King and November 29 First Sunday of Advent as preliminary with clear notes.
- [x] Run model tests; keep filenames stable and no publication side effects.

## Task 2: Shared rehearsal and contextual lyrics

**Files:** `src/layouts/components/SelectionRehearsal.astro`, `src/layouts/components/SongPractice.astro`, song index/selection routes, new `src/pages/songs/selections/[id]/[slug].astro`, `src/lib/songs-hub-client.ts`, hub client tests.

- [x] Write/run failing client test proving scoped lyric/resume links and independent progress for repeated songs.
- [x] Extract existing rehearsal UI and lyric UI into reusable components, retaining rendering and typography.
- [x] Generate one full rehearsal page per published selection and contextual static lyric routes for used songs.
- [x] Reuse player/progress logic and selection-ID/date namespace; ensure incomplete published selections remain usable.
- [x] Verify player, scoped navigation and canonical song routes with check/build and generated-route assertions.

## Task 3: Landing page rollover, future cards, archive, maintenance

**Files:** `src/lib/selection-browser.ts`, shared selection cards, `src/styles/songs-hub.css`, archive route, docs, client and build integration tests.

- [x] Write/run failing DOM tests for future/past visibility, missing Sunday, midnight rollover, failed featured fetch and media cleanup.
- [x] Add Prepare ahead cards with dates, readiness and actual song counts; reuse the same cards for archive filtering.
- [x] On load/visibility/minute refresh, update Sunday and cards using Philippine dates. Fetch the prebuilt selected rehearsal only when the featured selection changes; preserve the existing UI with a retryable warning on failure. Never load all recordings in advance.
- [x] Update song maintenance docs for publication/readiness, future lineups, shared recording changes, and per-lineup progress.
- [x] Run all tests, Astro check/build, calendar/readings integration, new songs build integration, and repeated local fresh-load assertions. Restart the existing port 4321 server if fresh HTML embeds stale styles.
- [x] Request one fresh read-only review; fix material findings, document verification, and leave everything uncommitted.

## Execution ledger

- Ruling: Work in the user's current checkout to update their existing localhost preview; no worktree or commit because the user explicitly requested local-only changes here.
- Pre-flight: Catalog publication filtering feeds all generated routes; grouping operates only on public summary metadata; shared rehearsal and contextual song paths use the same selection IDs and progress namespace.

- Task 1: complete — catalog/date model tests pass; drafts are excluded and multiple public dated lineups are supported.
- Task 2: complete — shared rehearsal/lyric components built; scoped player links and independent progress tested; 4 rehearsals and 48 contextual lyric pages verified.
- Task 3: implementation and review complete — future/archive cards, midnight rollover, retries, late-response/navigation guards and maintenance docs are in place; actual localhost date promotion and contextual lyric links verified for all four Sunday lineups.
- Ruling: Static contextual lyric routes preserve selection without query-string hydration; all routes reuse the same Markdown and practice component. A canonical link points to the shared songbook URL.
- Ruling: Keep an old archived selection preliminary when its existing notes explicitly call it a placeholder; do not imply choir confirmation during migration.
- Final review: fresh read-only reviewer found no material issues; 16 targeted tests and generated-route checks passed. Visual browser/playback verification is unavailable.

- Final routing correction: Astro's configured trailingSlash=never rejected slash-terminated live requests. Updated the client to use the same slash-free URLs as public links; observed 3 failing regression cases before the correction and 5 passing cases afterward. Added the optional real-HTTP integration mode to cover this boundary.
- Final verification: 89 tests passed; Astro check 0 errors/warnings/hints; production build 83 pages; song integration 4 rehearsal pages and 48 contextual lyric pages; actual localhost promotion for 4 Sunday lineups; Calendar and Readings integrations passed; git diff --check clean. No commits or pushes.
