# Filipino readings with a daily rolling sync

**Status:** Proposed design and setup guide. No site implementation, source import, or deployment authorized by this document.

**Site:** Rosarium — Our Lady of the Most Holy Rosary Chapel, Jubilation Enclave North, Biñan, Laguna.

## Purpose and agreed direction

Provide Sunday Mass readings in Filipino directly on Rosarium, with a comfortable reading experience on phones and larger screens. The user requested an experience similar to ACFC's readings page, **Gentium Plus for reading text**, and **Gentium Book Plus for headings**, then requested this design before implementation.

**Revision, November 2, 2026:** The user requested a smaller rolling dataset sourced from Awit at Papuri, refreshed once daily by GitHub Actions. Support next-Sunday-only and next-seven-days modes, removing expired readings as new dates enter the window. This supersedes the initial suggestion to prepare four Sundays and maintain an archive.

The default mode, sync time, persistence, and failure details below are recommendations for review. Awit at Papuri is the intended provider, but its automated access and republication terms and advance availability have not been confirmed. The existing Readings page is currently a placeholder; the rest of the site uses Figtree body text and Gentium Book Plus headings.

## Reference and source findings

- [ACFC's readings page](https://www.acfc-catholic.org.nz/readings) provides a dated lectionary with week navigation, Filipino/English controls, the reading sections, and PDF controls. These observations do not establish its data source, licensing arrangements, or a reusable API. Rosarium's initial version focuses on Filipino; English switching and PDF export are later additions.
- [Awit at Papuri's FAQ](https://www.awitatpapuri.com/faqs/) identifies the Philippine ORDO and _Ang Pagpapahayag ng Salita ng Diyos_ / Tagalog Lectionary as its references. It also identifies the lectionary's copyright. A publicly readable page or RSS feed does not establish permission to republish full readings.
- No supported Filipino lectionary API with confirmed republication terms has been verified during this investigation. Do not promise an automated source until its access, coverage, text accuracy, and reuse terms are checked.
- [Gentium Plus is available through Google Fonts](https://fonts.google.com/specimen/Gentium+Plus). The site's existing Astro font configuration already uses the Google provider for other fonts.

## Approaches and recommendation

| Approach                                            | Advantages                                                                | Conditions and tradeoffs                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Permissioned content entered into dated JSON        | Predictable layout; editorial review; works with the existing static site | Requires preparation and review for each published Sunday; entering text manually does not itself grant republication rights |
| Authorized API/feed/import → the same JSON contract | Less repeated editing; compatible with scheduled builds                   | Requires a confirmed source and rights; importer must preserve liturgical choices and detect missing or changed content      |
| References and links to a provider                  | Can offer a useful directory while full-text sourcing is unresolved       | Readers leave Rosarium; does not deliver the requested full-text reading experience                                          |

**Revised recommendation:** Use an authorized Awit at Papuri adapter to generate a small JSON snapshot once daily. Default to `next-sunday`, with `next-seven-days` as an optional setting. Keep the rendering contract independent of the adapter so the source can be replaced if necessary. Full-text import remains conditional on confirming suitable access and reuse terms; it is now the intended implementation direction, rather than a later optional enhancement. A references-and-links page remains an interim fallback if full-text sourcing cannot be established.

## Rolling window and daily workflow

| Setting                                     | Dates retained and published                                                        | Default display                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `next-sunday` — recommended initial default | One date: today if it is Sunday, otherwise the coming Sunday                        | The target Sunday                                                          |
| `next-seven-days`                           | Today plus the following six Philippine calendar dates, at most seven daily records | The target Sunday within that window; readers can select any available day |

For example, on Monday, November 2, 2026, Sunday-only mode targets November 8. Seven-day mode covers November 2–8. On November 3, that window becomes November 3–9: November 2 expires and November 9 enters. On Sunday, retain that Sunday's readings until midnight in Manila; do not advance immediately after Mass.

This is date-based retention, rather than removing records by download order. A correction fetched today for an older date does not make that date newer. No permanent public archive is proposed. Expired static pages disappear on the next successful deployment; previously shared links may consequently return 404. Removing a published record does not promise deletion from external caches or any retained deployment artifacts.

### Proposed daily run

1. Use Philippine Time to compute the active window and configured mode.
2. Read and validate the last published snapshot from Rosarium's fixed same-site JSON URL. This is a reusable baseline, not a GitHub Actions cache that must happen to exist. Reject incompatible schemas or an unexpected source identity.
3. Request only the target date(s) from the permitted source interface, with bounded retries and request timeouts. Refresh existing target dates too, so source corrections can be picked up. Avoid fetching the full archive. Prefer a date-range endpoint if the provider offers one; otherwise make at most one request per eligible date plus narrowly bounded discovery requests, excluding retries.
4. Validate each retrieved record's actual celebration date, language, content sections, and source. An HTTP success status or matching URL alone does not prove the correct reading was returned.
5. Replace a target date's record only with a complete, valid result. Keep its previously validated version if that date is still in the window and its refresh fails. Record per-date retrieval timestamps and failures; never mark reused content as newly retrieved.
6. Remove records outside the active window. Dates not yet published by the source remain explicitly unavailable, rather than being filled with another day's text. Recheck them at the next daily run.
7. Generate JSON, dated pages, and the date index atomically; validate, build, and deploy through the existing Pages workflow. The browser renders only the selected day's text, not seven expanded days at once. Other records can remain separate dated pages/JSON assets.

Recommended schedule: **04:17 Philippine Time daily**, expressed as `17 20 * * *` in UTC (20:17 UTC the preceding day). Preserve manual **Run workflow** support with a force-refresh option. Other source-code deployments reuse the latest validated snapshot, prune it to today's window, and do not need to contact Awit at Papuri again. The first activation must run an explicit sync to bootstrap the snapshot. Local development uses labeled fixtures or an explicitly downloaded permitted snapshot.

If the proposed hourly community-calendar feature is also implemented, coordinate both schedules through the existing deployment workflow and its concurrency group. Only the daily readings trigger or explicit manual refresh performs the readings import; hourly event refreshes carry forward and prune the published readings snapshot. Do not create independent workflows that can deploy incompatible snapshots over one another.

GitHub schedules can be delayed or dropped and run from the default branch. In public repositories, inactivity can disable scheduled workflows after 60 days. Monitor Actions and show freshness information; a daily schedule is not an exact publication-time guarantee. [GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

### Persistence, failures, and unavailable dates

- Publish `/readings-data/index.json` as the small validated snapshot/manifest, including mode, window dates, source, per-date status, last attempted sync, and per-record last successful retrieval. The daily build can recover still-valid records from it. Do not automatically commit imported text to the public repository.
- A provider-confirmed “not published yet” result is different from a timeout, blocked request, invalid HTML, or parser failure. Surface the distinction in the Actions summary; both can leave a target date unavailable. Do not infer permanent deletion from one transient 404.
- Partial source failure may publish a valid partial window: retain eligible old records and explicitly label missing dates. A source-wide outage without valid new content must not publish fabricated or misdated text. Validation failure of a supposedly complete record is reported and that record is not accepted.
- On first run, a missing snapshot is expected; valid retrieved dates can bootstrap it. On later runs, an unreadable/corrupt previous snapshot combined with failed source requests blocks deployment to avoid inadvertently erasing all available readings. A manual reset/disable operation is required to publish an intentionally empty state in that situation.
- Once baseline and source results have been successfully evaluated, an empty active window is allowed when none of its dates has been published yet. Show the target date, an unavailable message, and a verified provider link. Never preserve expired readings as if they satisfied the new window.
- If the entire deployment fails, the last live deployment remains. The entry-page date check must detect expired coverage and show it as unavailable/stale instead of silently presenting last week's readings as current. Historical dated pages may remain online until the next successful deployment.
- “Last checked” and “reading last retrieved” are distinct. Display a concise stale/unavailable notice when the current target lacks a valid record; put detailed per-date errors in Actions logs rather than the public page.
- A website can publish corrections between runs; daily refresh gives eventual updates, not a promise of immediate correction. Advance availability of a full next-seven-day window must be verified with Awit at Papuri. The design accepts gaps if future readings are not yet available.

This feature is separate from the proposed Google Calendar community-event sync. Calendar event feeds and Romcal observance records do not supply approved Filipino reading texts.

## Reader experience

Page order:

1. Existing site navigation and a compact **Mga Pagbasa sa Linggo** page heading.
2. Sunday date written in Filipino, followed by the celebration title supplied with that day's reading record.
3. In Sunday-only mode, show the target Sunday without previous/next archive controls. In seven-day mode, show a compact date selector for the active window, with unavailable dates clearly marked.
4. Quick links to **Unang Pagbasa**, **Salmong Tugunan**, **Ikalawang Pagbasa**, **Pagpapahayag bago ang Mabuting Balita**, and **Mabuting Balita**.
5. The complete readings in order, with clear section headings, Scripture references, and comfortable paragraph spacing.
6. Source, permission/required attribution, and content review information.

Show **Aleluya** only when appropriate; the pre-Gospel acclamation heading comes from the reading record, allowing the Lenten form. Psalm responses are bold and visually distinct without relying on color alone. Preserve approved introductions, conclusions, stanza divisions, and response placement.

Use a single reading column with sections expanded by default. Avoid forcing readers to repeatedly open accordions while following Mass. A compact quick-navigation area may wrap on phones.

### Default Sunday and navigation

Use Philippine Time (`Asia/Manila`). On Sunday, select that day's readings for the whole day; Monday through Saturday, select the coming Sunday. Do not switch to next week's readings immediately after the chapel's 3:30 PM Mass.

Use explicit dated routes such as `/readings/2026-11-01`, with `/readings` as the entry page. Native date links must work without JavaScript. A small client enhancement can select the correct entry Sunday on arrival, independent of the visitor's device time zone; the no-JavaScript entry page offers the dated reading list and identifies its build-time suggested Sunday explicitly.

There is no previous/next week archive in the rolling design. If the target Sunday is unpublished, show its date and **Hindi pa available ang mga pagbasa para sa Linggong ito**, plus a verified provider link. In seven-day mode, visitors may choose another available date without silently changing the Sunday target. Do not show older readings under the current date. Date controls only cover the active window.

The precise entry-page routing mechanism is left to implementation, but must not rely only on a build-time “today.” The site is static and can remain deployed across multiple Sundays.

## Typography and accessibility

| Element                                                                    | Proposed treatment                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Reading paragraphs, psalm verses, responses, and introductions/conclusions | Gentium Plus; 22px on phones, 24px from tablet widths; regular 400 with 700 for emphasis         |
| Page and section headings                                                  | Existing Gentium Book Plus; clear heading hierarchy, with section headings approximately 28–32px |
| Scripture references                                                       | Gentium Plus, 20–22px; distinct through spacing and weight, not faint contrast                   |
| Date controls, quick links, site navigation                                | Existing Figtree; at least 18px for reading-page controls, with comfortable tap targets          |
| Body line height and width                                                 | Approximately 1.65 line height; maximum reading width around 65 characters; left aligned         |

These are initial sizing targets to verify on actual phone widths rather than a promise of identical line counts across fonts. Do not change the site's global body font. Scope Gentium Plus to the reading content. Keep headings in Gentium Book Plus and use serif fallbacks if a font fails to load.

Use existing light/dark text and background tokens, checking at least 4.5:1 contrast for normal text. Avoid text over artwork, justified paragraphs, fixed-height text boxes, or disabled browser zoom. Preserve prose as paragraphs; preserve meaningful psalm/acclamation stanza breaks without hard-wrapping every prose line.

Mark Filipino content with `lang="fil"` while retaining the site's existing surrounding language behavior. Use semantic headings, a labeled quick-navigation region, visible keyboard focus, and text labels on date controls. Reading order must match visual order.

Add Gentium Plus through the existing Astro font mechanism, serving its generated assets with the site. Review `Base.astro`'s current preload-every-family behavior so the extra reading font is not unnecessarily preloaded on every page. Register the font using a separate reading variable, such as `--font-readings`, rather than replacing `--font-primary`. Bold must use the real font weight; add italic files only if required by the approved content styling.

## Content model

Proposed build staging directory: `.astro/readings/`, with one generated JSON record per retained date. This is disposable build input, not the persistent store. Recover the prior validated published snapshot as described above; emit `/readings-data/index.json`, static dated routes, and their available-date index. Do not add daily generated content commits.

| Field              | Purpose                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`   | Allow deliberate future format changes                                                                                    |
| `date`             | Actual Philippine celebration date, `YYYY-MM-DD`; must match filename                                                     |
| `language`         | `fil` for the initial release                                                                                             |
| `celebration`      | Reviewed Filipino title for the actual celebration, including a solemnity replacing the ordinary Sunday where applicable  |
| `lectionary_cycle` | Reviewed A/B/C metadata where applicable; do not use it alone to determine the day's readings                             |
| `status`           | `draft` or `published`; drafts are excluded from public pages and data                                                    |
| `sections`         | Ordered records for readings, psalm, pre-Gospel acclamation, and Gospel                                                   |
| `source`           | Provider/publisher name, source URL when available, edition, required attribution, and confirmed permission/license basis |
| `retrieved_at`     | Timestamp of this record's last successful source retrieval; unchanged when cached text is reused                         |
| `reviewed_at`      | Optional actual editorial review timestamp; automated fetching must not invent a human review                             |

Each section includes a stable `type`, a display `heading`, its Scripture `reference`, and ordered content blocks. Block types are limited to `paragraph`, `stanza`, and `response`; stanza text is represented as an array of lines. A response block can be repeated at the approved positions. Introductory and closing formulas are explicit blocks, not reconstructed from a generic Bible API.

Do not store arbitrary HTML. Escape text when rendering, and validate external source links. Keep copyright wording and attribution as publisher-supplied metadata. Store private permission correspondence separately; only a publishable permission statement/reference belongs in the public repository.

Do not place dummy Scripture text in production. Fixtures used for development contain clearly labeled original sample prose, not fabricated passages attributed to Scripture.

## Accuracy and editorial rules

- Use the approved Filipino lectionary text and selections for the celebration observed in the Philippines. A generic Tagalog Bible translation is not automatically interchangeable with the lectionary.
- Check actual dates, solemnities replacing Sundays, Philippine transfers, citations, psalm responses, and the pre-Gospel acclamation. Do not infer the proper readings solely from the ordinary Sunday number or A/B/C cycle.
- Where long/short forms or alternative readings exist, preserve the authorized options with explicit labels. Initially publish one reviewed selection matching the chapel's intended celebration; do not silently concatenate alternatives. Special celebrations with substantially different structures require supported section ordering rather than invented standard sections.
- Sunday-only mode imports Sunday Mass readings. Seven-day mode additionally supports the provider's ordinary daily readings and weekday solemnities: do not require a second reading on ordinary weekdays. Explicitly identify the provider's celebration/form; vigil and daytime alternatives must not overwrite one another under one date key. If a day contains an unsupported special service structure, mark it unsupported/unavailable and provide a source link rather than inventing standard sections.
- Do not use an AI translation or generate missing scriptural text. Missing or unreviewed readings remain unpublished.

## Initial preparation and setup

### Steps for the chapel maintainer

1. Confirm whether the chapel/parish or a publisher can provide approved Filipino Sunday readings with website republication permission. Awit at Papuri or the lectionary publisher are possible contacts to investigate; no message will be sent automatically.
2. Confirm permitted use: full-text web display, caching/storage, inclusion in a public GitHub repository, required attribution, and whether automated retrieval is allowed. PDF redistribution and audio require their own explicit coverage if added later.
3. Supply the permitted source material or documented feed/API details. Credentials, if needed later, go in GitHub Actions secrets rather than source files.
4. Choose `next-sunday` or `next-seven-days`; the proposed default is Sunday-only. Check whether Awit at Papuri publishes the desired dates far enough in advance for the selected mode.
5. Review representative source records against the chapel/parish's celebration and reading choices before activation. Validate weekdays, Sunday solemnities, responses, optional forms, and missing-date behavior. Assign a maintainer to review reported exceptions and corrections after activation.
6. After implementation, preview on a phone and desktop in light and dark modes. Confirm Gentium Plus body text, Gentium Book Plus headings, correct Filipino dates, and readable references.
7. After the implementation is separately authorized, configure its source access and mode in GitHub, run an initial manual sync, inspect the generated dates and attribution, then enable the daily schedule. Subsequent daily imports do not require manual content commits.

### Steps for the proposed automatic source

1. Verify that the provider permits the planned automated retrieval and republication; confirm its release schedule, available date range, and handling of special celebrations.
2. Implement a provider-specific adapter producing the same JSON contract, with attribution and provenance preserved.
3. Validate dates, language, sections, and complete response content. A missing page, login page, partial response, or parse failure must not become apparently valid readings.
4. Validate sample imports with human review before activation. Once approved, publish automatically only when schema, date, and supported-service checks pass; retain human review for exceptions. Source extraction cannot itself certify that the chapel selected the same optional form.
5. Add the proposed daily 04:17 PHT trigger and a manual force-refresh control. Reuse the site's existing deployment workflow, but keep readings and community-calendar refresh policies independent.
6. Preserve the last published readings when retrieval fails. Do not relabel an old Sunday's record as new. A public unavailable state is preferable to an incorrect date or fabricated text.

Daily automatic ingestion from Awit at Papuri is the intended direction, subject to source verification and approval of implementation. No hourly scraping, whole-archive import, or implementation is authorized by this design update.

## Future implementation map

| Proposed file or area                         | Responsibility                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `.astro/readings/YYYY-MM-DD.json`             | Generated, disposable normalized records for the active window                                              |
| `src/config/readings.json`                    | Mode, source identity, enable flag, and supported-service configuration                                     |
| `scripts/sync-readings.mjs`                   | Bounded source requests, prior-snapshot recovery, validation, window pruning, and status reporting          |
| `src/pages/readings-data/index.json.ts`       | Publish the validated reusable snapshot/manifest                                                            |
| `src/lib/readings.mjs`                        | Schema validation, public record loading, Sunday/date helpers, available-date index                         |
| `src/pages/readings/index.astro`              | Entry page, available dates, graceful default-selection behavior                                            |
| `src/pages/readings/[date].astro`             | Static retained-date pages with accurate titles, canonical URLs, and active-window date links               |
| `src/layouts/components/SundayReadings.astro` | Shared semantic sections and source attribution                                                             |
| `src/styles/readings.css`                     | Scoped typography, responsive spacing, theme styling                                                        |
| Theme/font configuration and `Base.astro`     | Register Gentium Plus; selectively load/preload reading fonts                                               |
| `src/content/pages/readings.md`               | Retire the placeholder when the dedicated `/readings` route is introduced; avoid duplicate route generation |
| `tests/readings*.mjs`                         | Date boundaries, schema checks, missing-date behavior, rendering, and draft exclusion                       |
| `docs/managing-readings.md`, `README.md`      | Content preparation, review, publication, and source maintenance                                            |

These are proposed changes, not files created by this design task. Recheck the installed Astro documentation and project guidance before implementation.

## Verification and acceptance

1. On a Sunday in Manila, `/readings` selects that Sunday; on Monday through Saturday it selects the next Sunday. Test overseas browser time zones, midnight boundaries, year rollover, and a site build older than one week.
2. Dated pages and date navigation work without JavaScript. Missing Sundays are accurately labeled; drafts are neither emitted as pages nor leaked through public data/indexes. Published links have no broken destinations.
3. Reviewed section text, Psalm responses, citations, and alternatives render in the approved order without lost or invented text. A solemnity replacing a Sunday displays its actual approved celebration and readings.
4. Gentium Plus applies to reading body text, Gentium Book Plus to headings, and Figtree remains elsewhere. Verify real regular/bold assets and useful serif fallbacks.
5. Check 320px, 375px, 390px, tablet, and desktop widths in both themes: no horizontal overflow or clipped long references; paragraph/stanza wrapping remains clear; browser zoom and keyboard navigation work.
6. Source attribution is visible and content reuse terms are recorded before full-text publication. Readings can render as text without arbitrary HTML execution.
7. Run meaningful schema/date tests, page integration checks, `pnpm check`, and a production build. Content review against the authorized source remains necessary even when automated checks pass.
8. Test both modes with a fixed Manila clock. At midnight, prune expired dates, retain valid in-window records, and add newly available dates. Verify Sunday itself remains selected through the entire day, and Monday advances to the next Sunday.
9. Test missing future dates, a weekday without a second reading, source corrections, timeouts, parser changes, partial failures, and first-run bootstrap. Freshness timestamps must distinguish a new retrieval from reused text.
10. On a fresh Actions runner, recover the prior published snapshot without a warm cache or repository content commits. A failed import must not silently delete a still-valid record; expired records must not be mislabeled as current.

## Decisions pending before implementation

- Confirm Awit at Papuri's permitted automated access/republication method and required attribution, including temporary storage in published JSON.
- Confirm whether its future-date availability supports Sunday-only and/or the seven-day mode; gaps must be acceptable if it does not publish dates in advance.
- Confirm the proposed Sunday-only default, optional seven-day mode, 04:17 PHT daily refresh, and reading sizes before implementation.

The requested font families and Filipino reading focus are established. No source permission has been assumed, and no code, readings dataset, workflow, or live site change is included in this design.
