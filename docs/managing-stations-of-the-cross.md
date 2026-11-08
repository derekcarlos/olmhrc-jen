# Managing the Stations of the Cross

The English guide is at `/prayers/stations-of-the-cross`, linked from the Prayers hub. It uses the complete readings and prayers supplied by the site owner from **The New Way of the Cross** on God Answers Prayers. All songs are omitted. Each station ends with the shared Our Father, Hail Mary, and Glory Be. The earlier original Rosarium reflections and summaries have been replaced.

## Content

- `src/data/stations-cross-en.json`: station titles, references, full passages (`scripture_text`), station prayers (`meditation`), optional red rubrics, opening/final prayers, the concluding blessing, and source/content notes. The field name `meditation` holds the supplied station prayer; do not replace it with a newly written reflection. Use `\n` for line breaks and `\n\n` between paragraphs. Text is plain text; HTML and Markdown are not interpreted. A literal `*` is a breath-pause mark and remains visible in the guide.
- `src/data/rosary.json`: the shared Sign of the Cross, Our Father, Hail Mary, and Glory Be. Editing these prayers updates this guide and the English Rosary guides.
- `src/content/prayers/stations-of-the-cross.mdx`: title, description, how-to instructions, and information about the version.

Keep station/prayer IDs stable. The sixth station has no Scripture citation in the supplied text; its `reference` is deliberately empty, and its passage is labeled **Reflection** rather than **Reading**. Do not add a Scripture reference that was not supplied.

## Guide behavior

`src/lib/stations-cross.mjs` assembles the 64-step sequence: two opening steps, four steps per station, and six closing steps. At each station, the adoration, full passage, and station prayer appear together, followed by the Our Father, Hail Mary, and Glory Be. After all fourteen stations, there is another Our Father, Hail Mary, and Glory Be for the intention of the Holy Father, then the final prayer, concluding blessing, and Sign of the Cross. The earlier extra mercy/departed response step has been removed because it is not in the supplied version.

`src/layouts/components/StationsGuide.astro` uses the Rosary pages’ navy/gold invitation, paper reading panel, red rubrics, Gentium Plus prayer text, section shortcuts, fixed controls, and full reference booklet. `src/lib/stations-guide-client.ts` handles navigation and completion. Station shortcuts scroll horizontally on smaller screens. The full booklet remains available without JavaScript.

## Tagalog version

`/prayers/ang-bagong-daan-ng-krus` uses `src/data/stations-cross-tl.json`, transcribed from the provided `ANG_BAGONG_DAAN_NG_KRUS.pdf`. The two print columns were read in order, with wrapping and page furniture removed. Printed wording is retained, including apparent typographical errors; review those in the JSON before correcting them rather than replacing prayers with a new translation. The full passages use `scripture_text`; the prayers labeled **Panalangin (Lahat)** use `meditation`.

`src/content/prayers/ang-bagong-daan-ng-krus.mdx` holds the Tagalog page metadata and instructions. The Tagalog catalog contains the opening prayer, adoration/response, closing prayer, blessing, and readings/prayers for all fourteen stations. `reading_response` references the shared **Ang Salita ng Diyos / Salamat sa Diyos** text after thirteen readings; station six does not have this response in the booklet, so it is omitted there.

The Sign of the Cross, Ama Namin, Aba Ginoong Maria, and Luwalhati sa Ama come from `src/data/rosary-tl.json`, shared with the Tagalog Rosary and Novena. Editing that file updates every guide. The English and Tagalog Stations use the same 64-step sequence, component, controller, and stable station IDs. Language links lead directly to the prayer panel, and both languages are accessible from the Stations card on the Prayers page.

To verify Tagalog after building, also run:

```sh
node --test tests/stations-tagalog.test.mjs
node tests/stations-guide.integration.mjs --tagalog
```

## Verify

```sh
node --test tests/stations-cross.test.mjs
pnpm check
pnpm build
node tests/stations-guide.integration.mjs
node tests/prayer-hub.integration.mjs
```

Use `node tests/stations-guide.integration.mjs --live` to check the running local server on port 4321.
