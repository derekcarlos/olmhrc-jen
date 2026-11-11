# Daily offline update for next Sunday's readings

**Sunday-only reference:** the current site uses [Upcoming readings](upcoming-readings.md), including celebration tiles and anticipated evening Mass choices. `pnpm readings:update` now calls the upcoming-celebrations updater. The standalone Sunday-only command below remains available for custom-output previews or Sunday-only configurations.

This is a separate job from the Awit at Papuri downloader/publisher. It reads the existing local lectionary, resolves the upcoming Sunday with the Philippine Romcal calendar, and atomically updates `src/data/readings/snapshot.json`. It always uses `next-sunday`, matching the site's current configuration. Sunday remains selected throughout Sunday in `Asia/Manila`, advancing after midnight on Monday.

```sh
# Preview without changing the snapshot
bash scripts/update-sunday-readings.sh --dry-run

# Update the snapshot
bash scripts/update-sunday-readings.sh
# Equivalent package command
pnpm readings:update:sunday
pnpm readings:update

# Preview another Manila date (the date anchors which Sunday is selected)
bash scripts/update-sunday-readings.sh --as-of=2029-11-12 --dry-run
```

The wrapper works from any current directory and uses the project-local Node installation when available. Node and dependencies must already be installed. It does not download, rebuild the lectionary, install a schedule, build/deploy the site, or commit/push anything. It does not modify `scripts/publish-readings.sh` or its publisher.

## Selection rules

1. Use the primary non-optional celebration from the full Philippine Romcal calendar, including the same local Santo Niño supplement used by the Calendar. The displayed Calendar is a filtered view of that calendar; its exclusions are presentation settings, not reading rules. All Souls, for example, still needs its own readings when it falls on Sunday.
2. Resolve the celebration's existing lectionary collection/key. Sunday cycles change at Advent; calendar dates do not restrict reuse of an entry. A feast or solemnity that replaces an Ordinary Sunday supplies that celebration's readings. Optional memorials do not replace the Sunday.
3. Require the exact local entry. Do not fill a missing Sunday from another cycle, a nearby date, or a different celebration. Christmas Sunday uses the Mass During the Day. For other entries with several Masses, choose the first saved non-vigil set, a documented default rather than a claim about which set the celebrant will choose. This job is for the Sunday daytime Mass; anticipated Saturday liturgies and local choices require a separate editorial selection.
4. Use the main saved readings rather than additional sections marked `alternative`. Preserve Palm Sunday's procession Gospel separately from the Passion, and preserve the supplied Sequence before the Alleluia. Easter and Pentecost require a Sequence; absent data is an error. Extra liturgical readings that cannot fit the snapshot are reported rather than discarded. The next-Sunday job does not attempt to schedule the Saturday Easter Vigil.
5. Validate the sections and their closing formulas before writing. Preserve the original Awit at Papuri URL and `source_date`, and record `origin`, `lectionary_key`, `liturgical_id`, and `mass_label`. The source date is distinct from the Sunday currently displayed. Preparation time is labelled as preparation rather than a new source download.
6. Failed lookup, malformed data, missing required sections, and unsupported structures exit unsuccessfully and leave the previous snapshot intact. A successful identical result preserves the previous file byte-for-byte, including timestamps. The existing readings client hides an old snapshot after its Sunday expires.

This deliberately implements **Sunday selection only**. It does not assert that all downloaded weekday/memorial records are ready for automatic reuse. The separately available weekday command and its rules are unchanged. The lectionary manifest still needs editorial review for gaps and questionable source mappings. Romcal does not represent every local dedication, patronal observance, episcopal transfer, or pastoral reading choice; check the current Philippine/diocesan Ordo for those cases before publication.

## Basis in Roman Catholic practice

- [Introduction to the Lectionary, 66 and 69](https://www.liturgyoffice.org.uk/Resources/Rites/LM-Introduction.pdf): recurring cycles and liturgical-year boundaries.
- [GIRM 353–354, 357–361](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html): the calendar of the celebrating church, assigned readings, memorials, and permitted alternatives.
- GIRM 64: the Sequence is obligatory on Easter Sunday and Pentecost, and precedes the Alleluia.
- [Universal Norms, Table of Liturgical Days](https://www.liturgyoffice.org.uk/Calendar/Info/Days.shtml): precedence. Romcal handles the standard Philippine calendar; the current local Ordo remains the reference for local exceptions.

## Monday GitHub Actions update

`.github/workflows/update-sunday-readings.yml` runs every **Monday at 04:17 Philippine time** (`17 20 * * 0` in UTC). GitHub may delay scheduled runs. The workflow becomes active once it and the offline updater/library are committed and pushed to the default branch (`main`).

It installs the pinned Node/pnpm dependencies, runs `pnpm readings:update` using only the local lectionary, validates the snapshot and tests the Sunday resolver. If the snapshot changed, it commits **only** `src/data/readings/snapshot.json`, pushes to `main`, then explicitly dispatches `deploy-to-github-pages.yml` to validate/build/deploy the new commit. Unchanged snapshots create no commit or deployment. Lookup or validation errors stop the job without publishing. A rejected push stops deployment; it never force-pushes.

The job requests `contents: write` for its commit and `actions: write` for deployment dispatch. It uses the built-in `GITHUB_TOKEN`; no additional secret or access to Awit at Papuri is required. GitHub does not trigger push workflows from a `GITHUB_TOKEN` commit, which is why deployment is dispatched separately. Branch protection must permit the bot's push; otherwise the job fails visibly in Actions.

To run manually: **Actions → Update next Sunday's readings → Run workflow → main**. If deployment dispatch fails after a successful push, manually run **Deploy Astro site to GitHub Pages** on `main`. `scripts/publish-readings.sh` is unchanged and is not called by this workflow.

## Optional local/VM schedule

To run daily at 04:17 when a VM's cron uses **Asia/Manila**:

```cron
17 4 * * * /bin/bash /absolute/path/to/holyrosarychapel/scripts/update-sunday-readings.sh >> /absolute/path/to/sunday-readings.log 2>&1
```

For a UTC cron, the corresponding time is `17 20 * * *` (04:17 PHT the following day). Use absolute paths and ensure Node is available to the scheduler. No local schedule has been installed. There is no need to schedule a VM job if using the Monday GitHub workflow. The local updater shares `.astro/readings-publish.lock` with the existing publisher so they cannot overwrite the snapshot concurrently; an existing lock is not removed automatically.

On GitHub Pages, changing a local snapshot alone does not update the live site: validate/build, then commit and push through your chosen publication process. Keep the two jobs separate and avoid scheduling the old downloader immediately after this one, which would replace the newly prepared snapshot.

## Verification

```sh
node --test tests/next-sunday-snapshot.test.mjs
pnpm readings:validate
pnpm check
pnpm build
node tests/readings.integration.mjs
```
