# Managing Rosary artwork and meditations

The Rosary walkthrough and full reference booklet use one content file: [`src/data/rosary.json`](../src/data/rosary.json). Each of the four sets contains five `items`. Every mystery has a stable `id`, a displayed `title`, and optional `meditation`, `fruit`, and `art` fields.

## Add a meditation

Find the mystery under its set's `items`, then fill in `meditation`. Use plain text, with `\n` for a line break and `\n\n` between paragraphs. HTML and Markdown are not interpreted. An empty or omitted meditation stays hidden.

Use `fruit` for the spiritual fruit, such as `Humility`. It appears under its own **Fruit of the Mystery** heading beneath the meditation and is also available in the revisit panel. All 20 mysteries currently have meditations, Scripture references, and fruits populated. The artwork fields remain independently editable.

```json
{
  "id": "annunciation",
  "title": "The Annunciation",
  "meditation": "Mary welcomes God’s invitation with faith.\n\nWhere is God inviting me to trust him today?",
  "fruit": "Humility",
  "art": {
    "image": "",
    "alt": "",
    "title": "",
    "artist": "",
    "source_url": "",
    "license": "",
    "license_url": ""
  }
}
```

This is an example reflection, not text already published in the guide. Keep the mystery's existing ID when editing its title or content.

## Add sacred artwork

1. Choose a Wikimedia Commons file and review its file-description page for the artist, title, source, and reuse terms. [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) explains credit and license requirements.
2. Download the image into `public/images/rosary/`, using a descriptive filename such as `annunciation-artist-name.jpg`. Supported formats: JPG/JPEG, PNG, WebP, AVIF, and GIF. Static raster images work best for paintings.
3. Set `art.image` to `/images/rosary/annunciation-artist-name.jpg`, without `public`.
4. Fill `alt` with a brief description of what the image shows.
5. Copy the artwork's `title`, `artist`, and Commons file-page URL into `source_url`. Credit the identified creator rather than assuming the uploader is the artist.
6. Set `license` to the actual license or public-domain label on that file's page, and `license_url` to its license/rights-information link when applicable. Links must use HTTPS. Public-domain artwork can have an empty license URL; its source and public-domain label are still shown.

Once an image path is supplied, the build requires an alt description, source URL, license label, and an existing local image. A missing file gives an error naming the path and mystery. Artist and title may remain blank when that information is unavailable. Before adding an image path, the credit fields may be prepared gradually.

The site generates responsive WebP images, preserves the full artwork with no cropping, and displays its credit line below it. Files stay local to Rosarium; visitors do not need to load an image from Commons. Both artwork and meditation are independently optional, so you can populate the 20 mysteries gradually.

## Where the content appears

- At each mystery's introduction, before **Begin this decade**.
- During that decade, in **View artwork & meditation** (or **View artwork** / **View meditation** when only one is supplied). Opening and closing this panel leaves the current prayer and bead unchanged.
- Under that mystery in the same-page **Full prayer booklet & guide**, including without JavaScript.

During the walkthrough, Previous/Next controls stay in a fixed bar at the bottom of the screen. Its middle shows five bead markers with the current decade highlighted; during Hail Marys it shows the current bead count instead. Opening and closing prayers have their own labels. The page reserves space for the bar and device safe area; it disappears on the completion screen.

## Preview and verify

Run `pnpm dev`, then visit `/prayers/how-to-pray-the-holy-rosary`. Choose the appropriate mystery set, then its decade in the side navigation. Check the introduction, credits, and the revisit panel while on a Hail Mary.

```sh
node --test tests/rosary-mysteries.test.mjs tests/rosary-walkthrough.test.mjs tests/rosary-client.integration.mjs
pnpm check
pnpm build
node tests/rosary.integration.mjs
```

Changes to the published site require the usual commit, push, and successful deployment.
