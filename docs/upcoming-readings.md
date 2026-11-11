# Upcoming celebration readings

The Readings landing page prepares for the nearest upcoming celebration. Sundays, solemnities, Ash Wednesday, Holy Week, December 15–23 Simbang Gabi, and Christmas Eve are included. Its clock uses **Asia/Manila**, regardless of the visitor's device time zone.

## Navigation

When several celebrations share the period, linked date tiles appear above the reading. On phones the row scrolls sideways; a single-celebration week has no tile row. Holy Week keeps Palm Sunday through Easter together. Each tile links a stable `/readings/YYYY-MM-DD` page. Simbang Gabi tiles link the anticipated evening Mass; Christmas Eve links the Christmas Vigil. These links remain useful without JavaScript because all source texts and Mass anchors are rendered.

Masses are chosen with a row of links styled as buttons, not a dropdown. `?mass=...` plus the article anchor shares a particular Mass. The existing step-by-step reader, full-text view, long/short options, source attribution, and complete Easter Vigil remain available.

Manually opened dated pages do not expire or redirect. After using a Mass button, reading shortcut, verse option or step control, the current choice is pinned. The automatic landing view can follow the clock until reading begins. Automatic redirects remove their internal `auto` flag from the visible URL; a copied dated link opens as a fixed selection for its recipient.

## Clock rules

`src/config/readings.json` uses mode `upcoming-celebrations` and whole-hour settings:

- `evening_hour: 18`: anticipated evening context begins at 6 PM.
- `sunday_preparation_hour: 18`: ordinary Sunday retires from the landing-page default at 6 PM, preparing for the next available celebration.
- `simbang_sunday_hour: 24`: keep Simbang Gabi Sunday's readings until midnight, protecting the 7:30 PM Mass.

Saturday evening prepares for Sunday. On Simbang Gabi weekdays, the civil date has both daytime readings and the next day's anticipated readings; at 6 PM the untouched landing page selects the evening Mass. The header distinguishes the actual evening date from the reading date. Sunday evenings during Simbang Gabi keep Sunday's readings. Christmas Eve selects Christmas's **Vigil Mass**, not an arbitrary Christmas set. Holy Saturday remains on the full **Easter Vigil** until midnight.

These are website preparation defaults, not a claim that a Saturday evening Mass is scheduled at the chapel. The Sunday 6 PM preparation cutoff does not mean Monday's liturgical readings replace Sunday during Mass. A deliberately opened Sunday/date/Mass remains readable after the cutoff.

## Offline preparation and publishing

```sh
pnpm readings:update
# or
bash scripts/update-upcoming-readings.sh

bash scripts/update-upcoming-readings.sh --dry-run
bash scripts/update-upcoming-readings.sh --as-of=2026-12-15 --output=.astro/simbang-readings.json
```

The updater writes `src/data/readings/snapshot.json` for the current Monday–Sunday week and the following week, from the existing local lectionary. It writes atomically, shares the existing readings lock, and preserves timestamps if content is unchanged. Missing source entries are recorded as unavailable; malformed or structurally invalid data fails without writing. No downloads, Git operations, schedules, or deployment occur in the local command.

Date routes are additionally built for selected celebrations in the previous/current/following civil years, using the local source. They support previews, sharing, and a default rollover even when a weekly refresh is delayed. A genuinely absent local entry gets an unavailable page rather than another day's readings. A malformed source aborts the build. Source dates and URLs remain the original provider's, even when the reading is reused in another year.

The existing Monday workflow calls `pnpm readings:update`, so it now prepares this richer snapshot and runs the new selection tests. The standalone Sunday command remains available for Sunday-only configurations or custom-output previews. The old network downloader refuses the richer mode instead of flattening its data. `scripts/publish-readings.sh` is unchanged. Review and publish repository changes through the chosen Git process; local edits alone do not update GitHub Pages.

## Gospel Acclamation consistency

Run `pnpm songs:update:acclamations` to prepare daytime **and** evening verse choices in the dated JSON. `reading-selection.mjs` supplies the common anticipated-Mass cutoff for both the reader and song pages. Before 6 PM Simbang Gabi shows the day's verse; afterward it shows the next day's verse. Saturday evening uses Sunday's verse, Christmas Eve uses the Vigil's verse, and Holy Saturday never silently becomes Easter Sunday's verse. The song page remains a daily verse view; the Readings landing page is an upcoming-celebration preparation view, so their weekday defaults have different purposes.

## Verification

```sh
node --test tests/*.test.mjs
pnpm check
pnpm build
node tests/upcoming-reader.integration.mjs
node tests/readings.integration.mjs
node tests/gospel-acclamation.integration.mjs
```

Useful local previews: `/readings`, `/readings/2026-12-08`, `/readings/2026-12-15`, `/readings/2026-12-24?mass=christmas-vigil`, and `/readings/2027-03-27`.
