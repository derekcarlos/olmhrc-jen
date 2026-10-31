---
title: "[Demo] Markdown & Typography Showcase"
description: "A visual reference for headings, paragraphs, lists, blockquotes, tables, images, code, footnotes, and HTML extras supported in Rosarium articles."
date: 2026-10-30T09:00:00+08:00
author: "Rosarium Demo"
categories: ["Demo", "Writing Guide"]
image: "/images/image-placeholder.png"
draft: true
---

> **Formatting showcase:** This is sample content for exploring the appearance of a Rosarium news article. The cover is a placeholder image, and the examples below are not chapel announcements.

This article is a visual reference you can use when writing for **Our Lady of the Most Holy Rosary Chapel**. Open its Markdown source alongside the page to see how each example is written.

The title, summary, publication date, author, categories, and cover image come from the frontmatter at the top of the file. The rest of this page is its article body.

## On this page

- [Headings](#heading-levels)
- [Paragraphs and inline formatting](#paragraphs-and-inline-formatting)
- [Links](#links)
- [Lists and checklists](#lists-and-checklists)
- [Blockquotes](#blockquotes)
- [Tables](#tables)
- [Images](#images)
- [Code](#code)
- [HTML extras](#html-extras)
- [Footnotes](#footnotes)

## Heading levels

The article title above is already a level-one heading. Normally, begin the body of a news article with level-two headings and use smaller levels for subsections. The extra level-one heading below is included only to demonstrate its appearance.

# Level 1 — A major title

## Level 2 — A main section

### Level 3 — A subsection

#### Level 4 — A smaller subsection

##### Level 5 — A detailed topic

###### Level 6 — A small heading

These headings demonstrate all six Markdown heading levels. Their size and spacing follow the site's typography.

---

## Paragraphs and inline formatting

A regular paragraph should remain easy to read across phones, tablets, and desktop screens. This longer example shows how several sentences wrap within the article column. You can describe the purpose of a chapel activity, explain what neighbors can expect, and provide the practical information they need.

Start a new paragraph by leaving a blank line between blocks of text. Breaking a long announcement into short paragraphs makes it easier for readers to scan.

Use **bold text** for emphasis, *italic text* for a title or a gentle emphasis, and ***bold italic text*** when both are needed. GFM also supports ~~strikethrough text~~ for an example of removed wording.

An inline code fragment such as `draft: false` preserves its literal text. Escape special characters when you want to display them rather than format them: \*these asterisks are visible\*, \# this is not a heading.

A single newline in the source normally stays in the same paragraph.
This sentence demonstrates that soft line break.

For a deliberate line break, end a line with two spaces:  
Our Lady of the Most Holy Rosary Chapel  
Jubilation Enclave North  
Biñan, Laguna

---

## Links

[Visit the News listing](/news) is an ordinary internal link.

[Explore the Prayers page](/prayers "Prayers on Rosarium") includes an optional link title.

[Visit Google Fonts](https://fonts.google.com/) is an external link.

A reference-style link keeps the URL separate from the sentence: [About our chapel][chapel-about].

An automatic link can also be written in angle brackets: <https://fonts.google.com/>.

An anchor link jumps within this article: [Go to the blockquote examples](#blockquotes).

[chapel-about]: /about "About Our Lady of the Most Holy Rosary Chapel"

---

## Lists and checklists

### Unordered list

- Share the purpose of the announcement.
- Include confirmed details.
- Provide a relevant link for the reader.

### Ordered list

1. Write a clear title.
2. Add a short summary.
3. Review the article before publishing.

### Nested list

- Preparing an article
  - Confirm names and dates.
  - Select a suitable image.
    - Add meaningful alternative text.
    - Use a caption when it adds context.
- Reviewing an article
  - Check links.
  - Read it on a phone as well as a desktop.

### A list with longer paragraphs

1. **Begin with the main point.**

   A list item can contain a second paragraph. Indent it to keep it within the same numbered item.

2. **Add supporting details.**

   This item demonstrates how spacing works when several lines belong to one step.

### Task list

- [x] Write a sample title.
- [x] Add a summary and publication date.
- [ ] Replace placeholder artwork with a suitable photograph.
- [ ] Review the final announcement.

These checkboxes are a display of a Markdown checklist, not a form that saves responses.

---

## Blockquotes

### A short quotation

> A small act of kindness can help a neighbor feel at home.

This is an original sample sentence for showing the quotation style.

### A quotation with several paragraphs

> This is the first paragraph inside a longer blockquote. It demonstrates how the text fits within the colored box.
>
> This second paragraph belongs to the same quotation. It should remain visually distinct from the first paragraph.
>
> — Sample attribution

### A nested quotation

> This outer quotation introduces an example.
>
> > This nested quotation sits within it.
>
> The outer quotation continues here.

### A quotation with a list

> A short reminder can contain a list:
>
> - Keep the message clear.
> - Include the information readers need.
> - Leave room for questions.

---

## Tables

Markdown tables support left, center, and right alignment. The row below the headers sets the alignment of each column.

| Page | Example content | Status |
| :--- | :---: | ---: |
| News | Announcements | Preview |
| Readings | Scripture resources | Placeholder |
| Prayers | Prayers and devotions | Placeholder |
| Songs | Music resources | Placeholder |

A table cell can include **bold text**, *emphasis*, a [link](/news), or `inline code`. These statuses describe this sample table, rather than a live publishing dashboard.

---

## Images

The cover image at the top of this article is set in frontmatter. An image can also appear inside the article using Markdown:

![Decorative rose-window illustration with a cross at its center, used as Rosarium's homepage artwork.](/images/rosarium-window.svg "Rosarium rose-window illustration")

*Caption: Decorative artwork used on the Rosarium homepage; this is not a photograph of the chapel.*

A linked image is also possible: wrap the image syntax inside a link. For example, a small logo can return the reader to the homepage:

[![Rosarium wordmark](/images/rosarium-light.png)](/)

---

## Code

### Inline code

File paths such as `src/content/news/` and settings such as `draft: true` can be shown inline.

### A fenced code block

```yaml
title: "A sample chapel announcement"
description: "A short summary for the News listing."
date: 2026-10-30T09:00:00+08:00
author: "Our Lady of the Most Holy Rosary Chapel"
categories: ["Announcements"]
draft: true
```

### A code block with another language

```html
<article>
  <h2>A sample announcement</h2>
  <p>This is example HTML shown as code.</p>
</article>
```

### Plain text

```text
This block preserves line breaks and spacing.
  This line is indented.
No code in this showcase runs in the reader's browser.
```

### An indented code block

    An indented block is another way to show literal text.
    Indent each line by four spaces.

---

## Horizontal rules

Three hyphens on their own create a horizontal rule between sections:

---

The line above is useful for separating a long article into larger parts. Blank lines before and after it help keep the Markdown unambiguous.

---

## HTML extras

The following examples use HTML inside this Markdown file. They are possible here, but are **not additional standard Markdown syntax**.

### Expandable details

<details>
<summary>Open this sample information panel</summary>

This paragraph is hidden until the reader opens the panel.

- It can contain a list.
- It can also contain **formatted text** and [a link](/contact).

</details>

### Highlighting, inserted text, and small print

Use <mark>highlighted text</mark> to draw attention to a short phrase.

Use <ins>inserted text</ins> to demonstrate an addition.

<small>This is an example of deliberately smaller supporting text, rather than the normal article body size.</small>

### Superscript, subscript, and abbreviations

Superscript: 1<sup>st</sup>. Subscript: H<sub>2</sub>O.

An abbreviation can include its meaning: <abbr title="Our Lady of the Most Holy Rosary Chapel">OLMHRC</abbr>.

### Keyboard notation

A key combination can be marked up as <kbd>Ctrl</kbd> + <kbd>S</kbd>.

### A definition list

<dl>
  <dt><strong>Title</strong></dt>
  <dd>The name displayed above the article.</dd>
  <dt><strong>Summary</strong></dt>
  <dd>The short description shown on the News listing.</dd>
</dl>

### A figure with a caption

<figure>
  <img src="/images/rosarium-window.svg" alt="Decorative rose-window artwork." width="240" height="260" loading="lazy" />
  <figcaption>A figure groups an illustration and its caption together.</figcaption>
</figure>

<!-- This comment is present in the source but not visible on the page. -->

HTML comments can be left in the source without appearing in the article text.

---

## Footnotes

A footnote lets you add a clarification without interrupting a paragraph.[^formatting]

You can refer to the same footnote again later in the article.[^formatting] A second note demonstrates separate numbering.[^demo]

[^formatting]: This showcase demonstrates the Markdown pipeline currently configured in Rosarium. Check the rendered page when trying unfamiliar syntax.
[^demo]: The article is sample content for reviewing typography and layout, not a confirmed chapel announcement.

---

## What needs something beyond Markdown?

Interactive tabs, custom notices, accordion components, and embedded video players can be added using the template's **MDX components**. Those use a `.mdx` file and component syntax; they are different from the ordinary Markdown examples on this page.

Mathematical notation and Mermaid diagrams need additional rendering support; they are not configured as special syntax in this showcase.

[Return to all chapel news](/news).
