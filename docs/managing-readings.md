# Managing Filipino readings

Rosarium's `/readings` page renders Filipino readings with Gentium Plus body text and Gentium Book Plus headings. Existing Figtree text elsewhere is unchanged. It uses a small rolling snapshot, not a full lectionary archive.

## Preview on localhost

From the project directory, using the documented local Node installation if necessary:

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH"
pnpm readings:sync
pnpm dev
```

Open `http://localhost:4321/readings`. The sync command retrieves Awit at Papuri's public reading page(s) once and stores normalized text in `.astro/readings/snapshot.json`, which Git ignores. Reload after syncing. The development server reads the snapshot when rendering the page; font configuration changes may require restarting Astro.

This local source preview does not establish permission to republish the text. Before activating production imports, confirm the provider's access/reuse terms and required attribution. The source identifies its text as the Tagalog Lectionary; see [Awit at Papuri's FAQ](https://www.awitatpapuri.com/faqs/).

## Choose the window

Edit `mode` in `src/config/readings.json`:

- `next-sunday`: today when it is Sunday, otherwise the coming Sunday. This is the default.
- `next-seven-days`: today plus six following Philippine dates. Includes weekday readings when the source supports them; a second reading is not required for ordinary weekdays.

Then run `pnpm readings:sync` again. Only the chosen day's text appears on a page; seven-day mode adds date links to separate pages. Sunday remains the default through the whole day. Generated expired pages are removed on the next successful deployment; there is no historical archive.

For a one-off importer test without changing configuration:

```sh
pnpm readings:sync --mode=next-seven-days
```

The page still follows the configured mode. To display all seven date choices, change the configuration as well.

## Daily production sync — activation is optional

The prepared workflow runs at **04:17 Philippine Time daily** (20:17 UTC the preceding day), but scheduled builds are skipped unless the repository Actions variable `READINGS_SYNC_ENABLED` equals `true`.

After source reuse is confirmed and the implementation is reviewed and published:

1. Open **GitHub repository → Settings → Secrets and variables → Actions → Variables**.
2. Add `READINGS_SYNC_ENABLED` with the value `true`.
3. In **Actions → Deploy Astro site to GitHub Pages → Run workflow**, leave **Refresh Filipino readings** checked and run on `main`.
4. Verify the job summary, `/readings-data/index.json`, `/readings`, and the dated page. Confirm the provider's actual date and content before leaving unattended syncing enabled.
5. Review failure notifications. GitHub schedules can be delayed, and public-repository schedules may be disabled after 60 days of inactivity. [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Daily/manual refreshes recover the last published snapshot and replace valid retrieved dates. Ordinary source pushes recover/prune the published snapshot without requesting Awit at Papuri again. The workflow writes no content commits and requires no repository write permission. Disabling the variable publishes an empty readings window on the next source/manual deployment; it does not immediately change a live deployment.

## Missing dates and failures

Dates not yet available from the source are labeled unavailable. A failed date refresh retains a previously validated record for that date only while it remains in the active window. A complete provider outage on first bootstrap fails instead of publishing a fake success. A malformed published baseline also stops deployment. A successfully evaluated but unpublished date can produce a truthful empty window.

The source importer validates the page date and supported section structure. It preserves paragraph/line breaks, excludes audio/video and prayers of the faithful, and renders plain escaped text. Unsupported alternative structures are rejected rather than guessed. This version uses the main reading form on the provider's dated page; it does not combine vigil/weekday alternatives.

The displayed retrieval timestamp belongs to the actual record. Reusing it during an outage does not make it newly retrieved. A date check in the browser prevents the entry page from presenting an expired Sunday as current after a missed deployment; native date links and reading text remain available without JavaScript, with a build-date caveat.

If a source markup change breaks parsing, review `src/lib/readings-source.mjs`, add a small original-prose regression fixture, and run the tests before retrying. Do not bypass date/section validation. Do not copy the whole provider archive to repair a single missing day.

## Validation

```sh
node --test tests/*.test.mjs
pnpm check
pnpm build
node tests/readings.integration.mjs
node --test tests/readings-client.integration.mjs
node tests/calendar.integration.mjs
node --test tests/calendar-client.integration.mjs
```

Source text, celebration choices, and optional forms still need editorial review; passing tests checks structure and behavior, not the provider's liturgical accuracy.
