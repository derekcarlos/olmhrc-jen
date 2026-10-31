# Generated Philippine liturgical calendar

## Approved intent

The user chose Romcal and yearly JSON instead of separate Markdown files for solemnities, feasts, and obligatory memorials. Optional memorials remain excluded. Existing chapel schedules, calendar-only observances, icons, light/dark styling, month navigation, and next-seven-day event behavior must continue.

## Approach

Use pinned matching Romcal and Philippines plugin versions `3.0.0-dev.143` at build time. Static Astro endpoints produce `/calendar-data/1900.json` through `/calendar-data/2100.json`, matching the current picker range. The calendar embeds its initial year and loads/caches subsequent years from same-origin JSON. No visitor request goes to Romcal or another third-party API. A client-only library would add unnecessary browser work; a manually maintained JSON list would retain the annual editing burden.

Select Romcal's primary observance only, with rank SOLEMNITY, FEAST, or MEMORIAL and `isOptional: false`. Omit its All Souls entry from these categories because that commemoration is not a solemnity. Preserve the existing Ash Wednesday, Holy Week and First Sunday of Advent markers as calculated seasonal observances. Christmas/Easter retain their seasonal icons. A small presentation JSON maps these stable IDs to existing titles/descriptions/categories. It does not override calculated dates.

Keep local Markdown schedules and October 7 chapel feast. An optional `replaces_liturgical_id` matches a generated ID on the same date, avoiding duplicate icons without hiding unrelated services. Remove the manually imported liturgical Markdown after parity checks. Generated JSON includes normalized calendar records with all_day true, empty time/location and repeat none. The original Romcal ID remains available for overrides and deduplication.

## Limits and verification

Use the current Roman calendar rules for the entire navigation range, not historically reconstructed calendars. Library versions are previews and remain pinned; future changes to Church calendars require dependency/data review. Validate 2026/2027 against verified dates, transfer years, suppressed Sunday memorials, Philippine feasts, and optional exclusion. Endpoint failures show a visible retry state while retaining local events. A stale year response must never replace the currently selected month.
