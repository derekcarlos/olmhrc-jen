# Daily Gospel Acclamation verses

The two Gospel Acclamation songs share a dated verse calendar:

- `src/content/songs/gospel-acclamation-missa-magnificat.mdx`: displays today's verse outside Lent, between the existing Alleluia refrains.
- `src/content/songs/gospel-acclamation-misa-pasyon.mdx`: displays today's verse in Lent. Its seven collapsible practice celebrations remain below the daily section, now populated from the local lectionary for Years A/B/C.
- `src/layouts/components/DailyGospelAcclamation.astro`: shared display.
- `src/data/gospel-acclamations.json`: generated, dated verses. Edit the local lectionary to correct a source; rerun the command to regenerate this file.

## Scheduled GitHub update

`.github/workflows/update-gospel-acclamations.yml` prepares the next **35 days** and all A/B/C Lenten practice texts on **the 1st of each month at 04:27 Philippine time** (`27 4 1 * *`, with `timezone: Asia/Manila`). This is a calendar-month schedule rather than an exact elapsed 30-day interval. The 35-day range covers 31-day months and leaves at least four calendar days of overlap for review after the next scheduled run. Scheduled runs can be delayed by GitHub. The workflow becomes active when this workflow and the supporting feature files are committed and pushed to the default branch (`main`).

The job uses the local lectionary, runs the verse/client tests and Astro check/build, verifies the generated song pages, then opens or updates one pull request on `automation/gospel-acclamations`. It includes **only** `src/data/gospel-acclamations.json` and requests review from `derekcarlos`. Unchanged data produces no new change request. An existing open request is updated instead of creating duplicate requests; new commits may dismiss an earlier approval according to the branch rules.

It does not push directly to `main`, approve or merge its request, bypass repository protection, or deploy. Review and merge the request yourself; that human merge triggers the existing Pages deployment. The already-approved calendar keeps switching its daily verse until its prepared date range ends, even if the next request is still awaiting review.

One repository setting is required: **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**. Save the setting. The workflow uses the built-in `GITHUB_TOKEN` with `contents: write` and `pull-requests: write`; no extra secret is needed. Despite the setting's name, no approval or merge operation is included. Keep the `main` ruleset active without granting this bot bypass access. See [GitHub's Actions settings documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

To run now: **Actions → Update Gospel Acclamation verses → Run workflow → main**. The manual run defaults to 35 days and also offers 30, 60 or 90 days. Review and merge the monthly request before the currently published date range ends; approval without merging does not publish it. Source access to Awit at Papuri is not required. The separate Monday Sunday-readings workflow and `scripts/publish-readings.sh` are unchanged.

## Optional manual/local update

```sh
# Prepare today and the following 29 days, using Philippine dates
bash scripts/update-gospel-acclamations.sh
# Equivalent pnpm command
pnpm songs:update:acclamations

# Include a longer practice period, such as the upcoming Simbang Gabi
bash scripts/update-gospel-acclamations.sh --days=60

# Preview a different range without writing it
bash scripts/update-gospel-acclamations.sh --from=2027-02-10 --days=40 --dry-run

# Prepare an isolated preview without replacing the site's current calendar
bash scripts/update-gospel-acclamations.sh --from=2026-12-15 --days=10 --output=.astro/simbang-acclamations.json
```

Node and installed project dependencies are required. The Bash wrapper finds the project from its own location and uses the local Node installation when present. `--days` accepts 1–366; its default is 30. The script reads the local lectionary, performs no network requests and installs no schedule. It updates **only the generated verse JSON**; it does not rewrite song lyrics, change the Sunday readings snapshot, commit, push, deploy, or modify any workflow or `scripts/publish-readings.sh`.

Review the reported date range and missing dates. Writes are atomic and protected by a separate lock. Identical content leaves the saved file unchanged. Invalid options, corrupt source data and an entirely unavailable range fail without replacing the existing file. Individual missing entries are recorded as unavailable for their dates; another day's verse is never substituted.

Preview at `http://localhost:4321/songs/gospel-acclamation-missa-magnificat` or `/songs/gospel-acclamation-misa-pasyon`. After approval, commit/push the generated JSON and initial component/song changes through the repository's review process. The live site only receives the new range after deployment. Existing local edits and repository protections are not bypassed.

## Date and liturgy selection

The browser selects today's dated record in **Asia/Manila**, rechecking every minute and when the tab is revisited. Within the prepared date range, no new build is needed for each day. Outside the range, the page says that the verse has not been prepared. JavaScript-disabled browsers see the build-time date and verse, explicitly labelled with that date.

Philippine Romcal selects the primary celebration, Sunday cycle and weekday cycle. A memorial missing its own local entry can use its underlying weekday readings. Only the final main Gospel Acclamation section is used, so an Easter/Pentecost Sequence is not mistaken for the verse. Standalone Alleluia refrain lines are removed at the boundaries; the verse's internal line breaks and punctuation remain intact. The Scripture reference is shown when the source supplies it; a blank reference is not invented. The source link retains the original Awit at Papuri page even when reused in another year.

The Misa Pasyon display is used during Lent and on Good Friday. Magnificat is used outside Lent. The other song displays a seasonal explanation and a link to the appropriate setting; the composition's written lyrics are not automatically rewritten.

### Lenten practice sections

The same manual command also fills `lenten_practice` in the generated JSON with Ash Wednesday and Lent Sundays 1–5/Palm Sunday for all three Sunday cycles. `LentenAcclamationPractice.astro` renders the seven native collapsible sections. It suggests the current Lent through Easter Sunday in Philippine time, otherwise the next Lent; in November 2026 the default is **Lent 2027, Year B**, even though the current Sunday cycle is still A. The prepared calendar includes seasonal dates for the previous year through two years ahead. Rerunning the manual command keeps that default-date window current.

Year A/B/C buttons switch every practice verse, reference and source link without closing a section already being rehearsed. All text and line breaks come from the local lectionary; punctuation or spelling differences in those files are preserved. The Fourth/Fifth Sunday and Palm Sunday placeholders are replaced with actual source verses. No separate hard-coded copy remains in the song MDX. Without JavaScript the suggested cycle's seven sections still open normally.

In the current library, the First/Second Sunday and Palm Sunday verses are substantially the same across A/B/C. The Third/Fourth/Fifth Sunday verses differ by cycle. Some source copies have small punctuation/spelling differences even when the verse is otherwise the same. A blank reference, such as Lent II in these local copies, remains blank. For any permitted alternative chosen by the celebrant, select the corresponding cycle for practice; the defaults do not override the parish's actual readings.

The chapel confirmed this Simbang Gabi rule in `src/config/gospel-acclamations.json`: **December 15–23 at 7:30 PM anticipates the following day's readings, except Sunday evenings, which retain Sunday's readings.** The display date remains the actual evening date. December 16's fixed-date Aguinaldo verse is located from its original source date because the imported library stores it under an Advent weekday key. This avoids changing that verse when the weekday changes in another year.

Holy Thursday defaults to the evening Mass of the Lord's Supper. Other celebrations use the first saved non-vigil Mass unless overridden. Holy Saturday's saved Vigil does not currently have an explicit Gospel Acclamation section; it is reported unavailable instead of treating an unrelated section as the verse. Multiple Christmas Masses, other anticipated Masses, optional memorial choices and local changes require an explicit selection matching the actual celebration.

## Override a particular celebration

In `src/config/gospel-acclamations.json`, `overrides` is keyed by the actual chapel date. Specify a `reading_date` and, if needed, the **exact** `mass_label` from the lectionary. For example, if the chapel confirms use of Christmas Mass During the Night:

```json
"overrides": {
  "2026-12-24": {
    "reading_date": "2026-12-25",
    "mass_label": "Mass During the Midnight (White)"
  }
}
```

This example is not enabled by default. Rerun the command after editing overrides. A misspelled Mass label fails visibly; it does not silently select another Mass. Confirm local liturgical choices with the chapel's priest/Ordo.

## Verification

```sh
node --test tests/gospel-acclamations.test.mjs tests/gospel-acclamation-client.test.mjs
pnpm check
pnpm build
node tests/gospel-acclamation.integration.mjs
```
