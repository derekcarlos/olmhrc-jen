# Managing the Filipino lectionary

`src/data/readings/lectionary/` holds a reusable lectionary built from every Awit at Papuri post that carries full reading text. The daily snapshot (see `managing-readings.md`) is tied to calendar dates. The lectionary is keyed by liturgical day instead, so it can serve any year.

## Build

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH" # this workstation
pnpm lectionary:fetch   # download all posts again, then build
pnpm lectionary:build   # rebuild from the local cache only
node --test tests/lectionary.test.mjs
```

Posts are read from the WordPress REST API (`/wp-json/wp/v2/posts`, 25 per request, 1.5 s apart; about 100 requests) and cached in the ignored `.astro/lectionary-source/`. `lectionary:build` downloads only when that cache is missing. Files are rewritten only when their content changes; no timestamps are stored. Review the diff before committing.

## Files

| File               | Contents                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `year-a/b/c.json`  | Sundays and the Lord's celebrations (Palm Sunday, Easter Vigil, Pentecost, Santo Niño…) by Sunday cycle        |
| `weekday-1/2.json` | Ordinary Time weekdays by weekday cycle (I in odd years, II in even years)                                     |
| `seasonal.json`    | Advent, Christmas, Lent, Holy Week and Easter weekdays; Christmas, Mary Mother of God, Epiphany, Easter Sunday |
| `saints.json`      | Proper of saints, plus memorials whose posts used proper or common readings                                    |
| `votive.json`      | Votive Masses the source offered as options (e.g. Care of Creation)                                            |
| `manifest.json`    | Coverage per collection, missing days, skipped posts and source warnings                                       |

Each file has `entries` keyed by romcal liturgical id (e.g. `ordinary_time_33_sunday`). Each entry gives the romcal `name`, the date it was taken from (`occurs`), and one or more `masses`. Each mass has its source `label`/`celebration`, `source_url`, and `sections` in the same shape as the readings snapshot. A day can hold several masses: a vigil (`vigil: true`), Christmas's Masses, All Souls' sets, Holy Thursday's Chrism Mass alongside the Lord's Supper. Optional readings appear as extra sections with `alternative: true` and a `label` such as `o kaya: Maikling Pagbasa`; the Easter Vigil keeps all seven readings and the epistle.

## Looking up a day

```js
import { lectionaryKeyForDate } from "../lib/lectionary-keys.mjs";
const { collection, key, fallback } = await lectionaryKeyForDate("2026-11-11");
// saints/martin_of_tours_bishop, fallback weekday-2/ordinary_time_32_wednesday
```

Memorials usually take the weekday readings, so use `fallback` when the saint has no entry. `lectionary-keys.mjs` uses romcal and stays build-only, like `liturgical-calendar.mjs`.

To refresh the full celebration snapshot from these files, run `pnpm readings:update` (or the compatibility alias `pnpm readings:sync:lectionary`). See [Celebration readings](celebration-readings.md) for the complete guide and daily job.

For the dedicated daily **next-Sunday** job, use `pnpm readings:update:sunday` or `bash scripts/update-sunday-readings.sh`. It uses the full primary Philippine calendar, keeps a supplied Sequence and Palm Sunday procession Gospel, fails safely for missing/incomplete data, and records the original source date. See [Daily Sunday readings](daily-sunday-readings.md). It performs no downloads or Git operations; the existing publisher is unchanged.

## How posts are classified

- The post title gives the date (older titles were sometimes posted on another day). romcal plus the Philippine supplements in `src/config/liturgical-calendar.json` give that date's celebrations.
- The English label (`… (White)`) is matched against the day's celebrations, the underlying weekday, and the next day's solemnity for vigils.
- A memorial post that says `Mga Pagbasa mula sa <weekday>…` is stored as that weekday's readings. It ranks below a plain weekday post from another year.
- When several years supply the same day, the most recent is kept.

The source re-dates and reuses posts, so 2010–2014 posts contain references only; full text exists for some days from 2015 and for every day from mid-2025. `manifest.json` lists the remaining gaps. Automated checks verify structure; translations and celebration choices still need editorial review.
