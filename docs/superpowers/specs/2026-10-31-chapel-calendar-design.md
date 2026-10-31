# Chapel calendar

Approved direction: an in-house calendar inspired by ACFC's month view, with Previous/Next/Today controls, a mobile monthly agenda, event details and Markdown editing. Seed the confirmed Sunday Mass (3:30 PM), Simbang Gabi (December 15–23, 7:30 PM) and Christmas Eve Mass (December 24, 7:30 PM).

Use Astro's static content collections and a bundled browser script; no Google Calendar, backend or new dependency. A plain agenda alone would be simpler but would omit the requested month view. A hosted calendar would require an external source, which the user declined. The selected approach keeps content in the repository and works on GitHub Pages.

Builder choices: retain the existing About-style page width and theme; use Sunday-first weeks, Philippine Time for Today, local date strings for event days, and a list below the grid that becomes the primary mobile view. Open details in an accessible native dialog. Support one-off dates/ranges, weekly events and annual date ranges, with optional excluded dates. December schedules repeat annually. No invented event end times or additional events. Provide readable fallback schedules without JavaScript. Publishing edited Markdown requires a rebuild; development uses existing polling.
