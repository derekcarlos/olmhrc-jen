# Readings for Sundays and major celebrations

**Inactive design reference:** the site currently uses the Sunday-only snapshot and has no celebration picker. Follow [Daily Sunday readings](daily-sunday-readings.md). The broader resolver remains available for future work; its script refuses to replace the main snapshot while Sunday-only mode is configured.

The Readings page opens the next celebration in Manila time: Sundays, solemnities, Ash Wednesday, and the weekdays of Holy Week. Romcal's primary Philippine celebration determines the reading key, including Santo Niño. Easter Octave weekdays are also included because Romcal ranks them as solemnities; their proper Masses have two Scripture readings. Optional memorials are not added to this selection.

Open **Pumili ng pagdiriwang** to browse or search the current civil year, previous year, and next year. Dated pages are generated at build time from the local lectionary; they remain readable outside the old seven-day/Sunday window. The landing page advances at Manila midnight and can redirect to the next prebuilt dated page without waiting for another download. Rebuild at least annually to extend the calendar horizon. These dates are reading celebrations, not additional Mass schedules at the chapel.

## Guided reader

- Every main reading and psalm has its own step and unique anchor, including all seven Old Testament readings, their psalms, the Epistle, and Gospel at the Easter Vigil.
- Long and short alternatives belong to one reading step. **Bersiyon ng pagbasa** selects a form; it does not create a second obligatory Gospel step.
- **Pumili ng Misa** selects distinct Masses, such as Christmas Vigil/Night/Dawn/Day or Holy Thursday Chrism/Lord's Supper. Christmas defaults to Day Mass and Holy Thursday to the Lord's Supper. Other celebrations use the first saved non-vigil set; the Easter Vigil uses its Vigil set. This default does not determine the celebrant's actual pastoral choice.
- Palm Sunday's procession Gospel and Passion are separate steps. Supplied Sequences remain before the Alleluia. The required Easter/Pentecost Sequence and Easter Vigil Epistle are checked.
- **Basahin nang buo** shows all steps of the selected Mass. Controls stay fixed. Without JavaScript all saved Masses and their alternative forms are readable, with labels. With JavaScript only the selected Mass/form is shown. Printing shows the steps of the selected Mass.
- Each Mass retains its source URL and original source date; the displayed celebration date can belong to another year. The preparation timestamp is not presented as a fresh download.

## Daily offline job

```sh
pnpm readings:update --dry-run
pnpm readings:update
pnpm readings:validate
pnpm check
pnpm build
node tests/celebration-reader.integration.mjs
```

The scheduler entry point works from any directory:

```sh
bash /absolute/path/to/holyrosarychapel/scripts/update-liturgical-readings.sh
```

It uses the local Node installation when available, performs no downloads or Git operations, and updates only `src/data/readings/snapshot.json`. That file stores the next celebration with all its Masses/options, plus `calendar_dates`. The other dated pages read the reusable local lectionary during build. Identical content preserves timestamps. A lookup/validation failure preserves the previous snapshot; the shared readings lock prevents overlap with the other job.

`src/config/readings.json` now uses `mode: "next-celebration"`. `readings:sync:lectionary` is a compatibility alias for the new job. The old Sunday-only job is retained for legacy use; it refuses to overwrite the main snapshot in the new mode. The old downloader/publisher cannot preserve this richer structure and refuses this mode before writing. `scripts/publish-readings.sh` has not been modified. To publish, validate/build, then commit and push the updated files through your normal process.

To schedule a VM using Asia/Manila at 04:17:

```cron
17 4 * * * /bin/bash /absolute/path/to/repo/scripts/update-liturgical-readings.sh >> /absolute/path/to/celebration-readings.log 2>&1
```

For a UTC cron, use `17 20 * * *` (04:17 PHT on the following day). No scheduler has been installed. Do not run the old downloader afterward to replace the rich snapshot.

Preview another date without replacing the published snapshot:

```sh
pnpm readings:update --as-of=2027-03-27 --dry-run
```

## Calendar and source limits

The calendar follows the pinned Romcal Philippines configuration and the project's supplements. Local patronal/dedication observances or diocesan transfers still need the current Philippine/diocesan Ordo and an appropriate local override. The annual catalogue is not a claim that every saved text has been proofread.

An absent library entry receives an explicitly unavailable dated page, with its celebration name. Invalid/corrupt data or structurally incomplete required readings fail the build rather than silently publishing an empty page. The snapshot job also fails when the next required entry is unavailable. All 224 selected dates in the current 2025–2027 horizon resolved at implementation; future horizons can expose missing keys listed by the lectionary manifest.

For the Exaltation of the Holy Cross on a Sunday, both Numbers 21 and Philippians 2 are assigned. The local weekday source stores Philippians as an alternative first reading; the resolver uses that already-supplied text as the Second Reading on Sunday. It does not fetch or invent text. [Assignment reference](https://bible.usccb.org/bible/readings/091425.cfm).

The rules use [GIRM 64, 353–361](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html), the [Introduction to the Lectionary](https://www.liturgyoffice.org.uk/Resources/Rites/LM-Introduction.pdf), and Romcal's Philippine calendar. Long/short options and particular Mass choices should match the actual celebration led by the celebrant.
