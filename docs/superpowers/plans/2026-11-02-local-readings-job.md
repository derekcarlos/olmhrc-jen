# Local readings download and publication job

User authorized a local download job followed by commit/push. This supersedes GitHub-hosted retrieval: Cloudflare challenges both the HTML and JSON requests from GitHub runners.

## Implementation

1. Move the validated rolling snapshot to tracked `src/data/readings/snapshot.json`. Ignore retrieval timestamps when deciding whether a new snapshot commit is needed; preserve the prior published timestamps for unchanged content.
2. Make `readings:sync` a local download/validation command. Stop on transport/parser errors and keep the saved snapshot intact; an unavailable future date can remain explicitly unavailable when another valid target is available. Do not replace the entire window with an empty failed import.
3. Add `readings:publish`, a portable shell/Node job: lock, verify main/clean tracked state, fast-forward pull, install frozen dependencies, download, test/check/build, stage only the snapshot, commit if changed, and push main. Preserve a committed update after push failure; never force push or stage unrelated content. Roll back only this job's uncommitted snapshot on a check failure.
4. Remove GitHub's daily fetch and sync variable gating. Pushes and manual runs build the committed snapshot; CI fails if it is absent or structurally invalid. Existing calendar/readings validation remains.
5. Update README/maintenance instructions with local commands, VM prerequisites, cron example, locking, stale lock recovery, and failure behavior. Do not install an OS schedule here.
6. Download the current Sunday, run unit/DOM/static integrations and Astro/build checks, then commit/push implementation plus the downloaded snapshot together. Run the publication job here to confirm the repeatable command; unchanged content should not create another commit. Leave the separate Google Calendar design uncommitted.

## Verification

- Timestamp-only refresh produces no content change; changed text/window/error status does.
- Failed retrieval does not overwrite valid saved data.
- Git integration exercises selective snapshot commit, no-change run, tracked-edit protection, and no publication after failed checks using an isolated local bare remote.
- Final GitHub Pages deployment consumes committed November 8 readings without source requests.
