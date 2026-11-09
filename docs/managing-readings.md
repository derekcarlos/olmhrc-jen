# Managing Filipino readings

Rosarium uses the local Awit at Papuri lectionary to prepare `src/data/readings/snapshot.json` for next Sunday's prescribed readings. The page shows that snapshot without a celebration picker. See [Daily Sunday readings](daily-sunday-readings.md) for the current workflow. GitHub Actions validates, builds, and deploys committed data without downloading from the provider.

Reading text uses Gentium Plus and headings use Gentium Book Plus. The rest of the site keeps Figtree. Imported text remains attributed to its source; confirm applicable reuse terms when maintaining the site.

The page opens as a guided reading: one section at a time, with fixed **Bumalik / Susunod** controls and shortcuts to each section. **Basahin nang buo** shows the entire text; **Gabay sa pagbasa** returns to the current step. The final step invites a moment of reflection and offers restart/full-text options. Weekdays without a Second Reading naturally have one fewer step. The original text, Psalm response formatting, and attribution are preserved. Without JavaScript, and when printing, all sections remain available.

The interface is in `src/layouts/components/SundayReadings.astro`, its behavior in `src/lib/reading-walkthrough-client.ts`, and styling in `src/styles/readings.css`. Text remains in the snapshot; editing the interface does not require re-downloading readings.

## Download and preview only

For the current **offline, next-Sunday** refresh, use `pnpm readings:update` or `bash scripts/update-sunday-readings.sh`. Preview with `--dry-run`. This is separate from the downloader and does not commit or push.

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH" # this workstation
pnpm readings:update
pnpm readings:validate
pnpm dev
```

Open `http://localhost:4321/readings`. The command resolves the next Sunday's primary Philippine celebration and selects its daytime Mass and main readings, validates the result, and writes atomically. It performs no downloads or Git operations. A lookup/validation failure leaves the saved snapshot untouched.

If content is unchanged, the existing snapshot and its published retrieval timestamps stay unchanged. The console reports the successful check, but no timestamp-only Git commit is created. The page's “Kopyang nakuha noong” identifies when the published copy was obtained.

## Fill from the lectionary instead of downloading

```sh
pnpm readings:sync:lectionary   # compatibility alias for readings:update
pnpm readings:validate
```

This prepares the Sunday snapshot from `src/data/readings/lectionary/` without network access. Each record keeps its origin, liturgical key, source date and URL. Review, validate and commit the result through your normal process.

## Download, validate, commit, and push

**Separate downloader/publisher:** this section describes the existing Awit at Papuri download job, not the offline lectionary updater. `scripts/publish-readings.sh` is unchanged. To use only the local library, run `pnpm readings:update`, validate/build, then commit and push through your chosen publication process.

From a clean checkout on `main`, run:

```sh
pnpm readings:publish
```

Or run the scheduler-friendly entry point from any working directory:

```sh
bash /absolute/path/to/holyrosarychapel/scripts/publish-readings.sh
```

The wrapper selects this workstation's project-local Node installation when present. Otherwise, it uses Node and pnpm from the environment's `PATH`. Use Node 22.18 or newer; Node 22.23.4 and pnpm 11.17.0 are the tested versions.

The job:

1. Acquires `.astro/readings-publish.lock` to prevent overlapping runs.
2. Requires `main` with no pending tracked/staged edits. Unrelated untracked files are allowed and left untouched.
3. Pulls `origin/main` using fast-forward only and installs dependencies from the frozen lockfile.
4. Downloads the selected dates and validates them.
5. Runs unit tests, Astro checking, the production build, and the readings HTML integration check.
6. Stages only `src/data/readings/snapshot.json`, commits when that file changed, and pushes `main`.

The job also retries pushing a previously committed snapshot update. It refuses to publish existing unpushed commits that touch any other file; review and push those manually first. It never force-pushes or automatically rebases conflicts. If downloading or checking fails before commit, it restores only its own snapshot change and leaves unrelated files alone. If pushing fails after commit, the local commit is retained for inspection/retry.

If you previously ran `readings:sync` and the tracked snapshot is now modified, validate and commit it manually before using the publication job, or intentionally restore that file first. The job will not overwrite an existing pending tracked edit.

## Choose dates to retain

Edit `mode` in `src/config/readings.json`, then commit that configuration change before running the publication job:

- `next-sunday` (current): today's readings if it is Sunday; otherwise the coming Sunday. The offline updater always uses this mode.
- `next-seven-days`: today plus the following six Philippine dates. The page defaults to the target Sunday and offers links to the other available dates.

Dates are calculated in `Asia/Manila`, independently of the machine's time zone. Expired dates leave the snapshot on a successful refresh. Sunday stays selected through midnight; a failed or missed refresh is shown as stale/unavailable rather than relabeling an old reading as current.

Some future dates may not be published yet. Seven-day mode can retain a partial window when the source explicitly returns 404 and at least one valid reading is available. Transport failures, 403 responses, and unsupported source markup fail the local job rather than producing a successful empty publication.

## Prepare a VM later

1. Test the provider URL directly from that VM first. A cloud VM can encounter the same Cloudflare challenge as GitHub; do not assume local success transfers to every server.
2. Install Git, Node 22.23.4 (or another supported version), and pnpm 11.17.0. Clone this repository on `main` into a dedicated automation checkout.
3. Configure a Git author and noninteractive authentication limited to this repository, such as a repository deploy key with write access. Do not put credentials in the job script or repository.
4. Run `pnpm install --frozen-lockfile`, then run the job manually and confirm the push and Pages deployment succeed.
5. Schedule the wrapper and collect its output in a log. A Linux cron example, when the VM's system time zone is **Asia/Manila**, is:

   ```cron
   17 4 * * * /bin/bash /absolute/path/to/repo/scripts/publish-readings.sh >> /absolute/path/to/readings-job.log 2>&1
   ```

   Ensure cron's `PATH` includes Node and pnpm (or configure it explicitly in the crontab). On a UTC-configured VM, use `17 20 * * *` for 04:17 PHT the next day.

6. Monitor logs/failures and periodically confirm the published dates. The prepared script does not install cron or a background service automatically.

The previous `READINGS_SYNC_ENABLED` GitHub variable and daily GitHub download schedule are no longer used. The Actions **Run workflow** button rebuilds the committed snapshot; it cannot download newer readings. To update readings, run the local/VM job and let its push trigger deployment.

## Recovery

- **403 or timeout:** leave the saved data intact and resolve source access. Do not remove date/content validation or repeatedly hammer the provider.
- **Dirty working tree:** finish the existing tracked edits before retrying. Prefer a dedicated checkout on a VM.
- **Pull/push divergence:** inspect and reconcile the Git history manually; no automatic force-push occurs.
- **Stale lock after a crash:** inspect `.astro/readings-publish.lock/owner.json`, confirm no job is running, then remove that lock directory and retry.
- **Source layout changes:** add an original-prose regression fixture and fix the adapter in `src/lib/readings-source.mjs`. The importer rejects incomplete reading bodies and response-only psalms.

## Validation

```sh
pnpm readings:validate
node --test tests/*.test.mjs tests/readings-client.integration.mjs tests/calendar-client.integration.mjs
pnpm check
pnpm build
node tests/readings.integration.mjs
node tests/calendar.integration.mjs
```

Publication job tests use isolated temporary Git repositories and local bare remotes under ignored `.astro/`; they do not push test data to GitHub. Automated checks verify structure and behavior, while celebration choices and the source's text still need editorial review.
