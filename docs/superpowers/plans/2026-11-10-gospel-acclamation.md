# Daily Gospel Acclamation Implementation Plan

**Goal:** A manual Bash command prepares locally sourced daily verses, displayed automatically in the appropriate song in Philippine time.

**Architecture:** Keep music and lyrics in MDX. Generate a separate 30-day dated JSON calendar from the local lectionary and Philippine Romcal. A shared Astro component selects today's saved verse, including confirmed anticipated Simbang Gabi rules. No workflow, download, commit, or push.

**Tech stack:** Astro/MDX, Node, Bash, existing Romcal/calendar helpers, Node tests and JSDOM.

1. Test and implement verse-only extraction, memorial fallback, Sunday cycles, Lent, Christmas Mass choices, missing dates and Simbang Gabi (December 15–23; following day except Sunday evenings).
2. Add a Bash/Node updater with date/range/dry-run/output options and atomic, idempotent JSON writing. Preserve Sunday snapshot and MDX source lyrics.
3. Embed a shared dated-verse component in Magnificat and Misa Pasyon. Preserve existing Lenten practice versions. Client selection rolls over at Manila midnight and never substitutes an old verse for missing data.
4. Generate the initial calendar; document the command and publishing requirements. Verify Node tests, client behavior, Astro check/build, song pages and unchanged existing publisher/workflow.

No commits or pushes are authorized for this implementation turn.

## Follow-up: cycle-aware Lenten practice

The user requested replacing the manually maintained collapsible Lenten verses with their local lectionary equivalents. Prepare all three cycles plus Ash Wednesday in the same generated JSON, using the existing manual command. Keep seven collapsible celebrations and their line breaks. Default to the current/upcoming Lent (2027 Year B as of November 2026), expose A/B/C practice buttons, and use Philippine dates for rollover. Test all source mappings, future/current Lent selection, client switching without closing an open celebration, and both real song pages. Do not change the source lectionary or commit/push.

## Follow-up: scheduled review workflow

The user subsequently requested a GitHub workflow instead of manual upkeep. Add a daily 04:27 Philippine-time workflow that calls the existing updater, tests/checks/builds, and opens or updates one review PR containing only the generated JSON. Preserve owner review: no direct main push, approval, auto-merge, bypass, or deployment. Retain the local command as a fallback, document the required repository Actions setting, validate YAML/action inputs and run the exact workflow checks locally. Do not commit/push or run the remote workflow in this turn.

The user then requested less frequent updates. The final workflow runs on the **1st of every month at 04:27 Asia/Manila**, preparing **35 days**, which covers a 31-day month with at least four days of overlap for manual review. Manual dispatch offers 30/35/60/90 days. The local Bash default remains 30 days. All review protections remain unchanged.
