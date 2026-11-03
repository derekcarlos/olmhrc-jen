# Social preview images implementation plan

> Use superpowers:executing-plans for local implementation. No commits or pushes.

**Goal:** Supply PNG link previews for general Rosarium pages, Songs, and published choir lineups.

**Architecture:** Existing Sharp generates 1200 × 630 PNGs through prerendered Astro endpoints. Vendor the existing site font families with their licenses so generation needs no network during builds. A metadata helper normalizes absolute URLs and describes generated images; Base emits Open Graph and Twitter image metadata while preserving custom page photos. Songs uses an undated cover. Each lineup uses its published title, date, and readiness from the same catalog as the rehearsal page.

**Spec:** Approved proposal in the conversation: navy/gold card design based on cover-copy, site-wide PNG fallback, timeless Songs image, date-specific individual lineup images, build-time generation.

## Constraints and review focus

- Work in the existing localhost checkout; no new packages, commits, pushes, or deployment.
- No source lyrics or audio changes. Do not expose draft selections through image routes.
- Existing custom raster page photos must remain the page's sharing image.
- Correct absolute HTTPS image URLs, image type, dimensions, and descriptive alt text.
- Long celebration titles, accented characters, text escaping, and preliminary/confirmed labels must fit.
- Generated PNGs must render with bundled fonts on local and GitHub builds without font downloads.
- Preview artwork is a fixed sharing design, independent of the visitor's light/dark theme.

## Tasks

- [x] Add failing tests for share-image metadata resolution and generated PNG dimensions/signature; include remote photos, SVG fallback, unsafe URL fallback, and long Unicode titles.
- [x] Vendor Figtree and Gentium Book Plus fonts/OFL licenses. Implement reusable data-to-PNG rendering with existing Sharp, bounded title layout and shared brand artwork.
- [x] Create static image endpoints for general/Songs and published lineups; connect metadata to Base and the two song routes. Include MIME, width, height, and alt only when known.
- [x] Add built-page integration checks that resolve each generated metadata URL to a real PNG, verify custom page photos and draft exclusion, and confirm per-lineup title/readiness uses the catalog.
- [x] Visually inspect general, Songs, and the longest lineup PNGs; adjust legibility and spacing.
- [x] Run tests, Astro check/build, song/calendar/readings integrations, and actual local image HTTP checks. Request a fresh read-only review, document results, and leave changes uncommitted.

## Ledger

- Ruling: Generate code-native brand cards rather than AI artwork or browser screenshots, to keep typography and content reproducible and automatic at build time.
- Ruling: Use the current checkout to update the user's localhost preview; publication remains a separate user-authorized step.

- Ruling: Fontconfig cache/config live under .astro/social-fonts and are written atomically. Force the bundled Fontconfig backend for rendering because macOS CoreText ignored application font files; visually confirmed the corrected Gentium Book Plus and Figtree output.
- Final review: fresh read-only reviewer found no blocking issues. Added the suggested sharing-image integration command to the existing GitHub workflow. Linux typography has not yet been executed on a GitHub runner; all local rendering and metadata checks pass.
- Final verification: 93 tests passed; Astro check 0 errors/warnings/hints; production build passed; 6 generated PNGs and all metadata checked; Songs/Calendar/Readings integrations passed; real localhost PNG responses and unknown-route 404 verified; localhost Songs PNG equals built PNG byte for byte. General, Songs and longest celebration images visually reviewed. No commit or push by the agent.
