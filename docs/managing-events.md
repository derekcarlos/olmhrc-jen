# Managing chapel events

Chapel schedules and local celebrations live in `src/content/events/`, one Markdown (`.md`) file per entry. The filename is its ID. The body contains the details shown when a visitor selects an event. Solemnities, feasts, obligatory memorials and the main seasonal markers are generated automatically as yearly JSON; you no longer need to create annual Markdown files for them.

## Automatic liturgical calendar

The site uses pinned **Romcal 3.0.0-dev.143** and its matching Philippines plugin. At build time, Astro generates `/calendar-data/1900.json` through `/calendar-data/2100.json`. The current year is embedded in the Calendar page; other years load from the published site's own JSON files and are cached during browsing. No external calendar service is contacted by visitors. The entire picker range is available after a deployment, with no annual content additions required.

The generator calculates Easter-related dates, Sunday-based feasts, transfers, and liturgical precedence. It imports the primary observance when ranked as a solemnity, feast, or obligatory memorial; optional alternatives are excluded. The current Ash Wednesday, Holy Week, and First Sunday of Advent markers are also calculated each year. All generated entries have `all_day: true` and stay out of Upcoming Events. Actual Masses must still be scheduled separately in Markdown.

`src/config/liturgical-calendar.json` holds display titles, descriptions and categories, plus small source-backed supplements to the pinned library. Dates are calculated by Romcal, not copied from one year's observance. Santo Niño is supplemented as the third Sunday of January because it is missing from this pinned plugin; its rule is documented by the [Philippines calendar](https://universalis.com/philippines/calendar-2027.htm). All Souls is excluded from the solemnity import because its status is a distinct commemoration. Romcal's primary Marian memorial is used when it returns alternatives on the same date.

The generator lives in `src/lib/liturgical-calendar.mjs`; the JSON endpoint is `src/pages/calendar-data/[year].json.ts`. Generated JSON is build output: do not edit `dist/calendar-data/` by hand. To change an automatic marker's wording or icon, add its stable Romcal ID under `presentation` in the configuration JSON. Keep `include: true` only for intended seasonal markers outside the three imported ranks.

The library versions are previews and are deliberately pinned. Review calendar changes when updating dependencies, particularly Philippine local changes. Years before 1969 use the current Roman calendar rules, not a historical reconstruction.

All dates and times refer to **Philippine Time**. Use quoted `YYYY-MM-DD` dates and 24-hour `HH:MM` times; `"15:30"` displays as 3:30 PM. Leave `time: ""` for “Time to be confirmed.” End times are not required.

## Event icons and legend

The label beside the month shows the Sunday reading cycle (Year A, B, or C) automatically. It changes at the First Sunday of Advent. A month containing the transition shows both cycles, such as “Year A → B”; hovering over the label gives the transition date. This follows the displayed month, independently of Upcoming Events, and requires no annual content edits.

The month grid shows colored icons instead of event titles. Select an icon to open the event's details; hover to see its title and time. A legend below the grid explains the icons. Use `category` in frontmatter to choose one:

`general`, `mass`, `novena`, `feast`, `solemnity`, `memorial`, `advent`, `christmas`, `lent`, `holy-week`, or `easter`.

Use `category: "solemnity"` for a crown icon or `category: "memorial"` for an open-book icon. These labels and icons are shown in the legend. Categories choose the marker; `all_day` independently controls whether an entry is a calendar-only observance or a scheduled event.

For example, `category: "mass"` shows a church icon. The default is `general`. Sunday Mass uses `mass`, Simbang Gabi uses `novena`, and Christmas Eve Mass uses `christmas`. The full title, time and location remain available in event details and upcoming event cards. The desktop grid always shows six complete weeks for a consistent height.

## Marking an event as a Mass

Add `is_mass: true` to a scheduled Mass so the homepage chapel card can select it automatically. The filename can be anything. An entry with `category: "mass"` also qualifies without this field. For special Masses, use `is_mass: true` alongside the category whose calendar icon you want:

```yaml
is_mass: true
all_day: false
category: "holy-week"
```

Give the entry its actual date, time, recurrence (if any), and `draft: false`. The homepage selects the earliest remaining Mass in the next 14 days using the same Philippine Time, recurrence, and cancellation rules as Upcoming Events. Upcoming Events continues to show all scheduled activities for today and the following six dates. An all-day marker is never eligible for the homepage Mass card. Published event changes require rebuilding and deploying the static site; advancing from one scheduled Mass to the next happens automatically in the browser.

## A one-off event

Create, for example, `src/content/events/choir-rehearsal.md`:

```markdown
---
title: "Choir rehearsal"
description: "Practice for Sunday's Mass."
location: "Our Lady of the Most Holy Rosary Chapel"
time: "18:00"
date: "2026-11-07"
end_date: ""
repeat: "none"
excluded_dates: []
draft: true
---

Add meeting details, instructions, and links here.
```

This is an example, not a confirmed rehearsal. Update its details and set `draft: false` when ready to publish. The `title` and `description` fields are required. For a multi-day event, set `end_date`; both dates are included and the same start time applies each day. Future events remain visible in their calendar months.

## Calendar-only observances

Set `all_day: true` for a feast day or other observance that should only be marked in the calendar. These entries retain their category icon and clickable details, but **never appear in Upcoming Events**. Their details display “All-day observance”; they do not imply a scheduled Mass. The `time` field is ignored for observances, so leave it blank. Set `location: ""` if there is no gathering at a particular venue.

For example, the local October 7 chapel celebration uses:

```yaml
title: "Feast Day of Our Lady of the Most Holy Rosary"
description: "Our chapel's annual feast day."
all_day: true
time: ""
location: ""
category: "feast"
date: "2026-10-07"
repeat: "yearly"
replaces_liturgical_id: "our_lady_of_the_rosary"
draft: false
```

`replaces_liturgical_id` suppresses the matching generated marker only on the date of the published local celebration. It keeps the local title and details without duplicating the general memorial. If the local celebration is drafted or excluded for a date, the general calendar marker can appear again. Unrelated Masses on that date are retained.

For an actual gathering, set `all_day: false` (or omit it; false is the default), then provide its time and location. A gathering can be any activity, including a rehearsal or meeting; it does not have to be a Mass. A false entry with a blank time still appears in Upcoming Events as “Time to be confirmed.” Keep observances and any Mass on the same date as separate entries.

## Weekly schedules

Use `repeat: "weekly"` and a `weekday`: **0 = Sunday**, 1 = Monday, through 6 = Saturday. Omit `date` and `end_date` (or leave both blank). For example, Sunday Mass uses:

```yaml
time: "15:30"
repeat: "weekly"
weekday: 0
```

## Annual celebrations

Use `repeat: "yearly"` with a `date` and optional `end_date`. The month/day repeat every year; the source year is ignored. Simbang Gabi uses:

```yaml
time: "19:30"
date: "2026-12-15"
end_date: "2026-12-23"
repeat: "yearly"
```

This produces nine evening Masses each December. Christmas Eve Mass is a separate December 24 entry. Review chapel schedules before each season; change the file when times change. Automatically generated liturgical observances need no yearly Markdown edits. For a local gathering whose date changes annually, use `repeat: "none"` and enter that year's actual date.

## Cancellations and changed times

Add individual excluded days to the original schedule:

```yaml
excluded_dates: ["2026-11-08"]
```

To reschedule that occurrence, also create a separate one-off event with the correct date and time. This preserves the normal recurring schedule for other days. Use `draft: true` to hide an entire event.

For an exception that repeats every year, use inclusive month/day ranges:

```yaml
excluded_annual_ranges:
  - start: "12-15"
    end: "12-23"
```

Sunday Mass uses this rule during Simbang Gabi: Sundays within December 15–23 show only the 7:30 PM Simbang Gabi Mass, with no 3:30 PM Mass. The rule works every year, including years with two Sundays in that period. The regular Sunday schedule resumes outside those dates.

## Preview and publish

### Migration and verification

The previous 113 imported and year-specific liturgical Markdown files were replaced after confirming that generated dates and categories cover their existing occurrences. Five local files remain: Sunday Mass, Simbang Gabi, Christmas Eve Mass, the Rosary novena, and the chapel's October 7 celebration. Baseline dates were checked against [GCatholic 2026](https://gcatholic.org/calendar/2026/PH-en) and [GCatholic 2027](https://gcatholic.org/calendar/2027/PH-en). The October 21 Philippine feast of Saint Pedro Calungsod is also confirmed by the [Archdiocese of Manila](https://rcam.org.ph/feast-of-san-pedro-calungsod/).

### Checking your changes

Saved Markdown changes update the running development server automatically. Reload the Calendar page if needed and check the terminal for invalid-field errors. For the published static site, commit your changes and let the deployment rebuild.

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH"
node --test tests/*.test.mjs
pnpm build
node tests/calendar.integration.mjs
node --test tests/calendar-client.integration.mjs
pnpm check
```

Today uses the date in the Philippines even for visitors overseas. Previous/Next and the month picker browse months; mobile visitors see the same events as an agenda. Calendar viewing requires no Google account or calendar service. Without JavaScript, the page still shows expandable chapel schedules.

The Upcoming Events panel always shows **today and the following six days**, using Philippine Time, regardless of the month displayed in the grid. It includes events across month and year boundaries. Past dates and today's events whose start times have passed are hidden from that panel. Today's events with an unconfirmed time remain listed. Past events remain available in the month grid.
