# Universal search

Search is available from the magnifying-glass link in the sticky header on desktop, iPad, and phone. It stays outside the hamburger menu. Click it or press **Ctrl+K / Command+K**, enter a query, then submit to open `/search?q=...`.

The results page also searches while typing. It supports **Everything, Songs, Song lineups, Prayers, Readings, News, and Chapel pages**, with counts and twelve results per page. Queries, selected category, and page are stored in the URL, so results can be bookmarked or shared and browser Back/Forward works.

## What is searchable

- Songs: titles, full lyrics, composers, arrangers, language, human-readable Mass parts, seasons, and occasions. Results link directly to the canonical `/songs/<song-id>` page, rather than making someone choose a lineup first.
- Published song lineups: title, celebration, date, notes, song titles, and Mass parts.
- Prayers: Markdown/MDX content and the structured English/Tagalog Rosary, Block Rosary, and Stations texts that the interactive guides use.
- Readings: the readings landing page and available dates in the current configured window, including full section texts.
- News and chapel pages: published text and metadata, About, Home, and information for Mass and Calendar from published community events.

Drafts, placeholder songs, future news, template Blog/Authors/Categories/Tags/Elements routes, Contact, and Privacy are excluded. Lineup-specific copies of song pages are not indexed separately. Exact title matches rank first; full lyric phrases rank ahead of scattered body matches. Search ignores case, punctuation, and accents, and supports partial words. If there are no ordinary matches, longer title/metadata words can match a single spelling error.

## Updating content

The index is generated automatically by Astro at `/search-data/index.json`. It uses the same source collections and shared prayer data as the site. No external search account, API key, server, or background sync is needed for GitHub Pages. The browser downloads the index only when there is a query on the search page, not on every page visit.

Local development reads current content through the endpoint. On the published site, additions and edits become searchable after the usual commit, push, and successful build/deployment. Future news and rolling reading availability are evaluated at build time.

If adding a new structured prayer guide, add its catalog to `prayerTexts` in `src/lib/search-index.ts`; ordinary Markdown/MDX songs, prayers, and news are discovered automatically. No content data should be added to the old `.json/search.json` file: the template search modal was replaced and that file is no longer used by search.

## Implementation

- `src/lib/search-index.ts`: gathers the public content and canonical routes.
- `src/lib/search-documents.mjs`: strips MDX/HTML implementation details and builds searchable documents.
- `src/lib/site-search.mjs`: matching, relevance, spelling fallback, and excerpts.
- `src/pages/search.astro` and `src/lib/site-search-client.ts`: results, filters, pagination, URL/history, loading/error/retry states, and safe text highlighting.
- `src/layouts/components/SiteSearch.astro` and `src/lib/site-search-dialog.ts`: native dialog, keyboard shortcut, focus, and cleanup during Astro navigation.
- `src/styles/search.css`: light/dark styles and mobile layouts.
- `src/config/config.json`: `settings.search` controls the header entry and dialog.

Results use text nodes and `<mark>` elements, without injecting query or result HTML. Without JavaScript, the header link opens the search page, where a directory of public pages is available for browsing or the browser’s Find command.

## Check search

```sh
node --test tests/site-search.test.mjs tests/site-search-client.test.mjs
pnpm check
pnpm build
node tests/site-search.integration.mjs
```

Use `node tests/site-search.integration.mjs --live` to check localhost:4321. Useful manual searches: `Salve Regina`, `Magnificat`, `napupuno ang langit`, `Lester Delgado`, `Sinasamba ka namin`, and `Simbang Gabi`.
