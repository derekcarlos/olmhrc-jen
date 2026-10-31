# Rosarium Homepage Implementation Plan

**Goal:** Apply the homepage copy approved in the conversation and provide a working preview on port 4321.

**Architecture:** Keep homepage copy in its content collection, update its schema, and render the six approved sections in the existing Base layout. Use a decorative rose-window illustration until a real chapel photo is available.

**Tech Stack:** Existing Astroplate, Astro, Tailwind and scoped CSS; no new dependencies.

**Spec:** The approved draft in this conversation: Welcome to Rosarium; Gather for Mass; Around Our Chapel; Make Room for Prayer (Readings, Prayers, Songs); A Community Under Mary’s Care; Let’s Stay Connected.

## Constraints and review focus

- Preserve existing navigation and port 4321.
- Do not invent Mass schedules, news, chapel photographs, or contact details.
- Remove demo branding and testimonials from the homepage.
- Keep mobile and dark mode usable; check for overflow and readable text.
- All homepage buttons must point to existing pages.

## Tasks

- [x] Update homepage content and its schema; render all six sections in `src/pages/index.astro`.
- [x] Update site branding, metadata, palette, footer links and demo social links in configuration; add a simple decorative SVG and favicon.
- [x] Run the production build; verify homepage headings, metadata and internal link destinations.
- [x] Restart preview on port 4321 and inspect desktop and mobile layouts in the browser.

Verification: production build passed; Astro check reported 0 errors, 0 warnings, 0 hints across 57 files. Homepage title, all six section headings, demo content removal, and nine internal destinations verified over HTTP. Firefox desktop, dark theme, and 320/390px mobile layouts inspected. Preview running on port 4321.
