# Calendar observances implementation plan

**Approved behavior:** `all_day: true` entries are clickable calendar markers only, excluded from Upcoming Events. `false` (the default) preserves existing event behavior. Observance details say “All-day observance” instead of suggesting an unconfirmed service time. Christmas Day repeats yearly with no implied Mass.

**Approach:** Extend the existing event schema and shared calendar helpers; keep one content collection and the current category icons. A separate collection or category would duplicate scheduling rules and prevent seasonal icons from being reused.

- [x] Add regression tests showing yearly observances remain in the month grid but are absent from the next-seven-day list, with or without a leftover time. Verify ordinary untimed events remain listed. Test the observance time label.
- [x] Add `all_day` defaulting to false; update filtering and all time displays, including accessible labels and fallback details.
- [x] Correct Christmas content and document how to create observances.
- [x] Run unit tests, production build, calendar integration, and Astro checks; review changed call sites.

Verification: two new tests failed before implementation and pass afterward; all 18 unit tests pass. Production build and calendar integration pass, Astro diagnostics are clean, and the live preview includes the observance flag. Independent review found no substantive issues. Existing source files remain in this user-requested directory; no Git repository is initialized, so no commit or branch operations were performed.
