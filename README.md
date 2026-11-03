# Rosarium

Rosarium is the community website of **Our Lady of the Most Holy Rosary Chapel**, Jubilation Enclave North, Biñan, Laguna. It provides chapel information, Mass schedules, a liturgical and community calendar, readings, prayers, news, and choir practice resources.

**Intended production domain:** `https://holyrosarychapel.com`  
**Local development:** `http://localhost:4321`

This is an Astro static site. Content is maintained in Markdown, MDX, and JSON, then built for GitHub Pages. There is no administration dashboard, database, or contact-form backend.

## Contents

- [Local development](#local-development)
- [Where to edit things](#where-to-edit-things)
- [Pages, navigation, and appearance](#pages-navigation-and-appearance)
- [News and announcements](#news-and-announcements)
- [Prayers and readings](#prayers-and-readings)
- [Songs and choir selections](#songs-and-choir-selections)
- [Calendar and chapel schedules](#calendar-and-chapel-schedules)
- [Validation](#validation)
- [Publishing](#publishing)
- [Routine maintenance](#routine-maintenance)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Code and asset credits](#code-and-asset-credits)

## Local development

### Requirements

- **Node.js 22.23.4** is the tested runtime. Astro requires at least Node 22.12; use the tested version or a newer supported LTS release for the complete workflow, including native TypeScript imports in integration tests.
- **pnpm 11.17.0**, declared in [package.json](package.json).
- Dependencies installed from [pnpm-lock.yaml](pnpm-lock.yaml).

The main stack is Astro 7, Tailwind CSS 4, TypeScript, MDX, and React Icons. Romcal and its Philippines plugin run during the build to generate the liturgical calendar.

From the project root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Astro. The usual port is **4321**; if occupied, Astro may choose another port. Stop the server with **Ctrl+C** before restarting it.

On the original development machine, compatible Node/pnpm tools are available in the ignored `.local-tools/` directory. If the shell selects an older system Node, run this first:

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH"
```

This directory is a machine-local convenience, not part of a fresh clone. Other machines should install the required Node and pnpm versions normally. Check the active versions with `node --version` and `pnpm --version`.

| Command                                   | Purpose                                                     |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                                | Start development with file watching and automatic updates. |
| `pnpm check`                              | Check Astro and TypeScript diagnostics.                     |
| `pnpm build`                              | Generate the production site in `dist/`.                    |
| `pnpm preview`                            | Serve the latest production build; use its printed URL.     |
| `pnpm generate-llms`                      | Regenerate text/Markdown exports from an existing build.    |
| `pnpm exec prettier --write path/to/file` | Format a specific edited file.                              |

The development watcher uses polling for reliable change detection in this workspace. Ordinary Markdown and style edits should update automatically; schema and dependency changes can require a restart.

## Where to edit things

| What to change                                        | Source                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Homepage text, buttons, and hero image                | [src/content/homepage/-index.md](src/content/homepage/-index.md)                                        |
| Homepage structure, artwork frame, and spacing        | [src/pages/index.astro](src/pages/index.astro)                                                          |
| About text and chapel photograph                      | [src/content/about/-index.md](src/content/about/-index.md)                                              |
| Mass introduction and schedule tiles                  | [src/content/pages/mass.mdx](src/content/pages/mass.mdx)                                                |
| Calendar title and opening paragraph                  | [src/content/pages/calendar.mdx](src/content/pages/calendar.mdx)                                        |
| Filipino readings mode and syncing                    | [src/config/readings.json](src/config/readings.json) and [maintenance guide](docs/managing-readings.md) |
| Prayers hub and tiles                                 | [src/content/pages/prayers.mdx](src/content/pages/prayers.mdx)                                          |
| Prayer guides and chapel novena                       | [src/content/prayers/](src/content/prayers/)                                                            |
| News articles                                         | [src/content/news/](src/content/news/)                                                                  |
| Songs, lyrics, and listening links                    | [src/content/songs/](src/content/songs/)                                                                |
| Upcoming and archived choir selections                | [src/config/song-selections.json](src/config/song-selections.json)                                      |
| Local chapel events and schedules                     | [src/content/events/](src/content/events/)                                                              |
| Liturgical marker presentation and supplements        | [src/config/liturgical-calendar.json](src/config/liturgical-calendar.json)                              |
| Header navigation and footer links                    | [src/config/menu.json](src/config/menu.json)                                                            |
| Site identity, domain, metadata, and feature settings | [src/config/config.json](src/config/config.json)                                                        |
| Fonts and light/dark color palettes                   | [src/config/theme.json](src/config/theme.json)                                                          |
| Shared content typography                             | [src/styles/components.css](src/styles/components.css)                                                  |
| Calendar appearance                                   | [src/styles/calendar.css](src/styles/calendar.css)                                                      |
| Content field definitions and validation              | [src/content.config.ts](src/content.config.ts)                                                          |
| Images, documents, and local audio                    | [public/](public/)                                                                                      |

Edit source files, then rebuild to publish. `dist/`, `.astro/`, and `.json/` are generated outputs or caches, not the source of the site's content.

## Pages, navigation, and appearance

The header contains **Home, About, Mass, Calendar, Pray, News**. Pray contains Readings, Prayers, and Songs. Edit the `main` and `footer` arrays in `menu.json` to change links. A navigation change alone does not create or remove a page.

The shared [ContentPage layout](src/layouts/ContentPage.astro) controls ordinary page width, title, and top image. Calendar uses its `wide` and `compact_header` frontmatter options. In `calendar.mdx`, edit the paragraph below the import to change the visible introduction; `description` at the top is metadata.

Use `.md` for ordinary Markdown and `.mdx` for content containing components. Retain the imports and components a page needs. Article bodies normally start with `##` headings because the template already supplies the main title. For phrase divisions in prayers and lyrics, end a source line with two spaces to preserve its line break.

### Images and identity

Put images in `public/images/` and reference them as `/images/filename.ext`, without the `public` prefix. Use descriptive filenames and update the reference when replacing a cached asset with a new filename.

| Asset                   | Current source                                    |
| ----------------------- | ------------------------------------------------- |
| Homepage Marian artwork | `public/images/our-lady.png`                      |
| About chapel photo      | `public/images/chapel-front.jpeg`                 |
| Light-mode wordmark     | `public/images/rosarium-light.png`                |
| Dark-mode wordmark      | `public/images/rosarium-dark.png`                 |
| Favicon                 | `public/images/rosarium-favicon.png`              |
| Default sharing image   | `metadata.meta_image` in `src/config/config.json` |

The homepage uses portrait artwork without cropping the figure. The favicon is a square close-up of Mary and the Child Jesus. Keep the wordmarks on equivalent canvases so theme switching does not shift the header. Shared page-header images render within a 1200 × 600 frame; check the result so important parts of a photograph remain visible.

### Typography and themes

Body and navigation use **Figtree**; headings use **Gentium Book Plus**. Reading passages use **Gentium Plus**, scoped to `/readings`. Fonts are configured in `theme.json` and loaded through Astro's font integration. Light and dark palettes are defined separately in that file, with shared component/typography overrides in the stylesheets.

Theme CSS is generated during development and builds. Edit `theme.json` rather than `src/styles/generated-theme.css`. Check both themes and a narrow screen after changing colors, typography, images, or layouts.

## News and announcements

Create one `.md` or `.mdx` file directly in `src/content/news/`. Its filename becomes the URL: `chapel-update.md` appears at `/news/chapel-update`.

```markdown
---
title: "Chapel announcement"
description: "A short summary for neighbors."
date: 2026-11-01T09:00:00+08:00
author: "Our Lady of the Most Holy Rosary Chapel"
categories: ["Announcements"]
draft: true
---

Write the announcement here.
```

Set `draft: false` when ready and use the intended publication date. Drafts and future-dated articles are excluded from normal builds. A future-dated article appears only after a build runs on or after its publication time; there is no background publishing scheduler.

Articles sort newest first. `settings.pagination` in `config.json` controls listing size, currently **two articles per page**. The homepage automatically links to the latest published article. Author and category labels are plain text, with no separate author/category routes.

The `demo-` articles remain unpublished formatting references; leave them drafted. `welcome-to-rosarium.md` is an editable draft for a real first post. News shows an empty state until an article is published.

See [Publishing chapel news](docs/publishing-news.md) for image fields, formatting, and optional pagination checks.

## Prayers and readings

Prayer guides live in `src/content/prayers/`. Each needs a title, description, and `draft` flag. Add a new guide there and a tile/link in `src/content/pages/prayers.mdx` so visitors can find it.

The chapel's Tagalog novena runs **September 28–October 6**. Its text is in `novena-to-our-lady-of-the-most-holy-rosary.md`; the original reference is `public/documents/pagsisiyam-santo-rosaryo.pdf`. Preserve the chapel's wording and phrase divisions when editing it. The Holy Rosary guide is maintained separately in `how-to-pray-the-holy-rosary.md`.

Filipino readings use a rolling Awit at Papuri snapshot committed at `src/data/readings/snapshot.json`: next Sunday by default, or today plus six days when configured. Run `pnpm readings:sync` to download locally without committing, or `pnpm readings:publish` to download, validate, commit the snapshot if content changed, and push. GitHub Pages deploys the committed data and does not contact Awit at Papuri. A VM can schedule `scripts/publish-readings.sh`; test source access from that VM first. Reading text uses Gentium Plus; headings retain Gentium Book Plus. See [Managing Filipino readings](docs/managing-readings.md) for setup, scheduling, and recovery.

## Songs and choir selections

Create song entries in `src/content/songs/` using stable lowercase filenames such as `song-title-setting.md`. Use `.mdx` for components such as callouts. The filename is the song ID used by selections and URLs.

Each entry contains its title, description, composer/arranger, language, Mass-part tags, Marian flag, season/occasion labels, lyrics, and optional `audio`/`youtube` links. Completed entries use `placeholder: false` and `draft: false`. Empty placeholder songs have been removed.

- Put local recordings in `public/audio/` and use paths such as `/audio/song-title.mp3`. Create that folder when recordings are ready.
- Put practice-video URLs in `youtube`, not `audio`. Either or both may be provided; neither autoplays.
- Set `marian: true` for the Marian library. Mass-part tags control inclusion/filtering in the Mass library.
- Keep credit fields and season/occasion labels consistent.

Edit `src/config/song-selections.json` for the next celebration. Only one selection may have `status: "upcoming"`; it appears first on Songs. Archive the previous selection, then create a uniquely identified new list with the actual date and song IDs. Dates do not automatically change selection status.

```json
{
  "part": "pater-noster",
  "song": "ama-namin-missa-magnificat",
  "used": true
}
```

Use `"song": null` for a song still to be chosen and `"used": false` when a Mass part is not used. The display follows the 13-slot order, including 9a Ama Namin and 9b Sapagkat. Keep selected songs published; missing/draft references are rejected during the build.

Renaming a song changes its URL and ID, so update every selection reference. Lyrics and recordings are shared: editing a song updates all selections that use it, including archived lists.

See [Managing the choir's songs](docs/managing-songs.md) for full frontmatter, part IDs, YouTube formats, audio controls, and archiving.

## Calendar and chapel schedules

### Automatic liturgical observances

Romcal generates the Philippines' **solemnities, feasts, and obligatory memorials**, along with the existing Ash Wednesday, Holy Week, Easter, and First Sunday of Advent markers. Optional memorials are excluded.

The build generates `/calendar-data/1900.json` through `/calendar-data/2100.json`. The current year is embedded in the page; another year loads from the site's own JSON and is cached. Visitors need no calendar account or external calendar API. A failed load displays Retry while retaining local chapel events.

There is no need to create annual liturgical Markdown files. Adjust marker wording/icons in `src/config/liturgical-calendar.json`. Romcal calculates movable dates, transfers, and precedence. A source-backed supplement supplies Santo Niño on the third Sunday of January because it is missing from the pinned Philippines plugin.

Romcal and the Philippines plugin are preview versions pinned together at **3.0.0-dev.143**. Review their data and supplements together when upgrading. The range uses current Roman calendar rules, including for years before 1969; it is not a historical reconstruction.

The Year A/B/C label follows the viewed month and changes at the First Sunday of Advent. A transition month displays both cycles.

### Local chapel entries

Maintain local entries in `src/content/events/`:

| File                                        | Purpose                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `sunday-mass.md`                            | Sunday Mass at 3:30 PM, with the Simbang Gabi exception.                     |
| `simbang-gabi.md`                           | December 15–23, 7:30 PM, recurring yearly.                                   |
| `christmas-eve-mass.md`                     | December 24, 7:30 PM, recurring yearly.                                      |
| `rosary-novena.md`                          | September 28–October 6, recurring yearly; review its time before the season. |
| `our-lady-of-the-most-holy-rosary-feast.md` | The chapel's October 7 calendar-only celebration.                            |

Use `repeat: "none"` for a dated entry, `weekly` with `weekday` for weekly schedules, or `yearly` for the same month/day each year. Dates and times are Philippine Time; `time: "15:30"` displays as 3:30 PM. `excluded_dates` cancels individual occurrences; `excluded_annual_ranges` handles seasonal exceptions.

`all_day` has a specific meaning here:

- **`true`:** a clickable calendar-only observance, excluded from Upcoming Events. It does not schedule a Mass.
- **`false` or omitted:** a scheduled activity eligible for Upcoming Events. A blank time displays “Time to be confirmed.”

Upcoming Events shows **today and the following six dates in Philippine Time**, independently of the displayed month. Past starts are excluded. Activities may include Masses, rehearsals, meetings, and other community gatherings.

The homepage chapel card automatically selects the next scheduled Mass using these same calendar dates, times, repetitions, and exclusions. Add `is_mass: true` to any Mass event; `category: "mass"` also qualifies automatically. This lets special Masses retain categories such as `novena`, `christmas`, or `holy-week`. All-day markers are always excluded, even if marked as a Mass. No filename or code changes are needed for a new Mass.

The chapel card looks ahead 14 days so it can still show next Sunday just after this Sunday's Mass, while Upcoming Events retains its seven-day window. The card updates on page load and every minute while open, using Philippine Time. Editing event files on the published static site still requires a rebuild and deployment.

The card's **Save this Mass** action downloads one calendar event with the selected date, start time, and location. It is available only when the Mass has a confirmed start time. This is a single occurrence, not a subscription; later schedule changes do not automatically update an imported copy. No end time is guessed.

October 7 uses `replaces_liturgical_id: "our_lady_of_the_rosary"` to replace the matching general marker without removing unrelated events. Keep actual Mass times in separate scheduled entries.

**When Mass times change, update all three places:** the appropriate event file, the tiles/copy in `src/content/pages/mass.mdx`, and the homepage Mass notice in `src/content/homepage/-index.md`. The Mass page is not automatically populated from calendar data.

See [Managing chapel events](docs/managing-events.md) for complete examples, categories, exceptions, and the generated-calendar configuration.

## Validation

Run from the project root with the required Node/pnpm versions:

```sh
node --test tests/*.test.mjs
pnpm check
pnpm build
node tests/calendar.integration.mjs
node --test tests/calendar-client.integration.mjs
```

Integration checks depend on the freshly built `dist/`. Tests cover song filtering, YouTube links, recurring events and exceptions, liturgical calculations, JSON loading/retry, marker deduplication, and calendar DOM behavior. DOM tests do not replace visual browser checks.

Run `pnpm preview` and inspect the main pages, both themes, and a narrow/mobile viewport. Check calendar navigation/dialogs, Upcoming Events, lyrics, practice players, the choir selection, changed articles/images, and the 404 page. Saving locally does not update the published site; changes must be rebuilt and deployed.

## Publishing

### First launch

The intended host is **GitHub Pages** at **holyrosarychapel.com**. The [deployment workflow](.github/workflows/deploy-to-github-pages.yml) exists, but its initial settings still need updating:

- [x] Connect this project to `https://github.com/derekcarlos/olmhrc-jen` on branch `main`.
- [x] Set the workflow's deployment branch to `main`.
- [x] Use tested Node 22.23.4 in the deployment workflow.
- [ ] Change `site.base_url` in `src/config/config.json` from `http://localhost:4321` to `https://holyrosarychapel.com`.
- [ ] Keep `site.base_path` as `/` for the custom domain.
- [ ] Select **GitHub Actions** in repository **Settings → Pages**.
- [ ] Add the custom domain in Pages settings, configure its DNS for GitHub Pages, and enable HTTPS when the certificate is available.
- [ ] Validate, deploy, and check the live HTTPS site, direct page URLs, and `/calendar-data/2027.json`.

The production URL supplies sitemap and sharing URLs. Keep it as the public HTTPS address even while running local development.

For an apex domain, GitHub supports A/ALIAS/ANAME configurations; `www` uses a CNAME to the account's GitHub Pages hostname. Follow current values and setup order in [GitHub's custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). With this custom Actions workflow, a repository `CNAME` file is not required; configure the domain in Pages settings. See also [Astro's GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/).

### Later updates and recovery

Once configured, edit source content, run checks, commit and push to the deployment branch, and confirm the Pages workflow succeeds. Only a successful deployment updates the live site. To undo a problematic release, revert the relevant source commit and deploy again.

The build produces HTML, optimized assets, yearly calendar JSON, and a sitemap. It also generates `llms.txt`, `llms-full.txt`, and per-page Markdown exports according to `llms` settings in `config.json`. These are public copies of built content; unpublished drafts should remain absent.

## Routine maintenance

| When                               | Review                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Before each choir celebration      | Confirm selection, date, notes, and practice links; archive the previous list.                      |
| When chapel times change           | Update event files, the Mass page, and homepage Mass notice together.                               |
| Before the novena/Christmas season | Confirm prayer and Mass times and seasonal exceptions with the chapel.                              |
| When publishing news               | Confirm facts/dates, review images, and publish only intended articles.                             |
| Periodically                       | Check YouTube availability, audio files, internal links, domain renewal, and deployment status.     |
| When updating dependencies         | Review release notes, update the lockfile deliberately, and run complete validation.                |
| When Church calendars change       | Review Romcal and the Philippines plugin together, including local supplements and known transfers. |

Keep `package.json` and `pnpm-lock.yaml` together in version control. Keep generated output, dependencies, local tools, and machine-specific caches ignored as configured in `.gitignore`. Versioned source content and assets provide the maintainable backup.

### Content still to prepare for launch

- Maintain Filipino reading source attribution and run/schedule the local publication job to keep the rolling snapshot current.
- All News articles are drafted; publish a genuine first announcement when ready.
- Review choir selection dates/statuses and “Placeholder selection” rehearsal notes.
- Check the default sharing image and metadata.

Comments and analytics are disabled. Contact, Blog, Authors, Categories, Tags, and Elements routes have been removed. Privacy is drafted and not published. Some unused starter content remains in the source tree but is not an active website section.

## Troubleshooting

| Symptom                                 | What to check                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| An edit is missing locally              | Save the correct source, inspect terminal validation errors, and reload. Restart after schema/dependency changes if needed.      |
| Astro uses a different port             | Stop the older development process, restart `pnpm dev`, and check its printed URL.                                               |
| An event/category is missing            | Check `draft`, dates, category spelling, and server errors. Restart to refresh a changed schema.                                 |
| Future-year markers fail                | Check `/calendar-data/<year>.json` on the deployed site and ensure the full `dist/` was deployed. Retry after a network failure. |
| A marker is absent from Upcoming Events | `all_day: true` is calendar-only. Scheduled entries must fall within the next-seven-day window.                                  |
| A News article is missing               | Check `draft`, publication time, and whether a rebuild ran after that time.                                                      |
| A choir selection fails the build       | Check unique IDs, one upcoming selection at most, valid Mass parts, and published song IDs matching filenames.                   |
| YouTube will not play inline            | Check the URL and try Open on YouTube; video owners can disable embedding.                                                       |
| An image/favicon remains old            | Check the path, reload, or use a new filename to avoid a cached asset.                                                           |
| A font build fails                      | Astro's Google font provider may need network access to obtain fonts; inspect the error before retrying.                         |
| Published metadata uses localhost       | Correct `site.base_url`, rebuild, and redeploy.                                                                                  |
| Text is hard to read in one theme       | Check palette values and explicit colors, including inherited text in custom MDX components.                                     |

## Project structure

| Location                | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `src/config/`           | Site, menu, theme, choir, and liturgical JSON settings.     |
| `src/content/`          | Editable pages, articles, prayers, songs, and local events. |
| `src/content.config.ts` | Content validation schemas.                                 |
| `src/layouts/`          | Shared layouts, components, header, and footer.             |
| `src/lib/`              | Calendar, liturgy, songs, news, and content helpers.        |
| `src/pages/`            | Astro routes and yearly JSON endpoint.                      |
| `src/styles/`           | Typography, component, and calendar styles.                 |
| `public/images/`        | Artwork, logos, favicon, and chapel photographs.            |
| `public/documents/`     | Chapel novena PDF.                                          |
| `public/audio/`         | Optional practice recordings; create when needed.           |
| `docs/`                 | Content-management guides and development notes.            |
| `scripts/`              | Theme, search-data, and text-export build helpers.          |
| `tests/`                | Unit and integration checks.                                |
| `.github/workflows/`    | GitHub Pages deployment workflow.                           |
| `dist/`                 | Generated production site, ignored by Git.                  |

Detailed guides: [Events](docs/managing-events.md), [Songs](docs/managing-songs.md), and [News](docs/publishing-news.md).

## Code and asset credits

Rosarium was built from Astroplate and customized for the chapel. The code license and upstream copyright notice remain in [LICENSE](LICENSE). Photographs, artwork, prayers, lyrics, recordings, and embedded videos may have separate credits and permissions; the code license does not establish ownership of those materials.
