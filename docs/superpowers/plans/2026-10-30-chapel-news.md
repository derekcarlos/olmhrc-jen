# Chapel News Implementation Plan

**Goal:** Replace the News placeholder with a blog-style listing and individual articles, following the existing About page layout.

**Architecture:** Add a separate news collection to keep Astroplate demo posts out of chapel news. Reuse ContentPage, the content parser's draft/future filtering and the existing pagination component. Render categories and authors as text until dedicated chapel taxonomy/author pages exist.

**Tech stack:** Existing Astro content collections, Markdown/MDX and TypeScript; no new dependencies.

**Spec:** User approved adapting Blog for News with individual `/news/<slug>` articles. Preserve the previously requested About-style layout and readable typography.

## Tasks

- [x] Add typed collection, listing/card components and static article/pagination routes; remove the conflicting placeholder.
- [x] Add a draft welcome article and instructions for publishing. Do not publish demo articles or invent chapel announcements.
- [x] Verify published articles render, drafts/future dates stay hidden, newest-first ordering and pagination links work using temporary content fixtures; remove fixtures afterward.
- [x] Run final production build and Astro checks, restart port 4321 and verify the News empty state.

Verification: temporary published/draft/future fixtures passed listing, summary, order, optional image, author fallback, categories, article and pagination checks. All fixtures removed. Final build and empty-state check passed; Astro check: 0 errors, 0 warnings, 0 hints. Preview on port 4321; draft article responds 404.
