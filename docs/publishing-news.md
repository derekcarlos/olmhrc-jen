# Publishing chapel news

Create a Markdown file directly in `src/content/news/`. Its filename becomes the article URL: `chapel-announcement.md` appears at `/news/chapel-announcement`.

```yaml
---
title: "Your announcement title"
description: "A short summary for the News listing and search engines."
date: 2026-10-30T09:00:00+08:00
author: "Our Lady of the Most Holy Rosary Chapel"
categories: ["Announcements"]
image: "/images/your-photo.jpg"
draft: true
---
Write the full article here using Markdown.
```

Title, description and date are required. Author, categories and image are optional; omit the image line if you have no photograph. The default author is Our Lady of the Most Holy Rosary Chapel. Use images from `public/images/`; 1200 × 600 pixels matches the page layout. Keep filenames flat, using lowercase words separated by hyphens.

Review the content, choose its actual publication date and set `draft: false` to publish. New articles default to drafts if the flag is omitted. Drafts and articles with a future date are excluded from normal builds. A static site needs rebuilding after the publication date before a scheduled article becomes visible. The dev server may need a restart to pick up content changes in this environment.

The News listing sorts newest first and paginates using `settings.pagination` in `src/config/config.json` (currently two articles per page). Author names and categories are displayed as text. News uses its own collection; starter posts under `src/content/blog/` do not appear here.

`welcome-to-rosarium.md` is a starter draft you can edit and publish when ready. Until an article is published, `/news` shows an empty state.

## Demo articles

Nine files beginning with `demo-` remain as unpublished references, including `demo-markdown-showcase.md`, which demonstrates article formatting. They have `draft: true` and do not appear on the public site. Keep them drafted when adding real chapel announcements.

## Verification

With the project-local tools on PATH, run `pnpm build && pnpm check` for normal validation. After hiding the demo articles and any other published articles, `node tests/news.integration.mjs` verifies the initial empty state.

For the isolated pagination check (expects no published chapel articles and two articles per page), stop the dev server, run `node tests/news.integration.mjs --fixtures`, build, and run `node tests/news.integration.mjs --published`. Always run `node tests/news.integration.mjs --clean` afterward, then build again before previewing or deploying. The fixtures are test content only.
