# Managing the choir’s songs

## Where things live

| Content                                             | File or folder                    |
| --------------------------------------------------- | --------------------------------- |
| Song titles, settings, lyrics, tags and audio links | `src/content/songs/`              |
| Upcoming Sunday and previous song selections        | `src/config/song-selections.json` |
| Audio files                                         | `public/audio/`                   |
| Mass-part names and the 13-slot order               | `src/lib/mass-parts.ts`           |

The Songs page shows the selection marked `upcoming` first. Mass and Marian libraries share the same song entries. Empty placeholder songs have been removed; create a new entry when adding a song.

## Add or update a song

Create a Markdown file such as `src/content/songs/ama-namin-your-setting.md`, or edit an existing song. Fill in its metadata and lyrics. Keep verses and refrains under their own headings. To show a line break within a verse, finish the source line with **two spaces** before starting the next line. Keep a song under preparation drafted until ready to publish.

```yaml
---
title: "Ama Namin — your chosen setting"
description: "Practice lyrics and recording for the choir’s chosen setting."
composer: "Composer’s name"
arranger: "Arranger’s name, if applicable"
language: "Tagalog"
mass_parts: ["pater-noster"]
marian: false
seasons: ["Ordinary Time"]
occasions: []
audio: "/audio/ama-namin.mp3"
audio_credit: "Recording credit"
youtube: ""
placeholder: false
draft: false
---

## Verse 1

Your lyrics here.

## Refrain

Your refrain here.
```

The filename is the song’s permanent ID and URL; the visible title comes from the frontmatter. If you rename the file, update every reference to its ID in `song-selections.json`.

For completed songs, use `song-title-setting.md` (or `.mdx`), all lowercase with hyphens. Examples: `santo-missa-magnificat.md`, `ama-namin-missa-magnificat.md`, and `anima-christi-bukas-palad.md`. Use the setting or composer suffix to distinguish versions. Store the Mass part in `mass_parts`; it usually does not need to be repeated in the filename. Keep published filenames stable once chosen.

For another musical setting of the same text, create a separate file, such as `ama-namin-another-setting.md`, with its own composer, lyrics and recording. A song may have more than one `mass_parts` tag. Set `marian: true` to include it in the Marian library; it can also appear in the Mass library if you assign an appropriate Mass-part tag.

`seasons` and `occasions` are labels you control. For example, `occasions: ["All Saints"]` makes that filter appear automatically. Keep label spelling consistent. Untagged entries remain available under “All” or “Not specified.”

## Keep song metadata consistent

- Keep the field order shown in the example, including blank optional fields.
- Every song requires a `description`. For completed entries, describe the available lyrics and practice recording or video rather than saying they are coming soon.
- Use readable language labels: `Tagalog`, `English`, or `Tagalog and Latin`. Leave `language: ""` when the language is unspecified or the text alone does not identify it (for example, an Amen-only setting).
- Use `[]` for an empty list, never `[""]`. Keep season and occasion labels consistent so filters do not split the same label into multiple choices.
- Preserve the credited composer and arranger; leave an unknown credit blank rather than guessing. `audio_credit` is for an audio recording's attribution, when one is supplied.
- Set `placeholder: false` for completed song entries and `draft: false` for entries ready to appear on the site.

## Add practice audio

Create `public/audio/` if necessary and put your recording there. A file at `public/audio/ama-namin.mp3` is referenced as `/audio/ama-namin.mp3`. You can also use a direct HTTPS audio-file URL. Put YouTube links in the separate `youtube` field below.

Keep `audio: ""` until a recording exists. The song page then displays “Practice recording coming soon.” Once a recording is supplied, the native player offers play/pause, seeking and volume, with additional playback-speed and repeat controls. Recordings do not autoplay and use `preload="none"`.

## Add a YouTube practice video

Paste a video's link into the song's frontmatter:

```yaml
audio: ""
youtube: "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
```

Replace `YOUR_VIDEO_ID` with the actual video ID, or paste the entire link copied from YouTube. Standard watch links, `youtu.be` share links, Shorts, live-video and embed links are supported. Playlist-only and channel links are not supported.

You can provide audio, YouTube, or both. A YouTube video appears in the “Listen and practise” section above the lyrics, with its own controls and an “Open on YouTube” fallback link. It does not autoplay. Use YouTube's player settings for video playback speed; the separate speed/repeat controls apply to audio files only. Some video owners disable embedding, so those videos must be opened on YouTube.

Leave `youtube: ""` or omit it when there is no video. Existing song files continue to work without adding this field.

## Update the Sunday selection

Edit `src/config/song-selections.json`:

- `title`: display name for this selection.
- `date`: actual celebration date as `YYYY-MM-DD`; `""` displays “Date to be confirmed.”
- `celebration`: Sunday or solemnity name.
- `notes`: rehearsal or preparation notes.
- `status`: `upcoming` or `archived`. Only one selection may be upcoming.
- `items`: links from each Mass part to the song’s filename without `.md`.

For example:

```json
{
  "part": "pater-noster",
  "song": "ama-namin-missa-magnificat",
  "used": true
}
```

Use `"song": null` for a song still to be chosen. Set `"used": false` when a part is not used for that celebration; the row will say so. The display follows the canonical Mass order even if the JSON items are reordered.

The part IDs are `processional`, `penitential-rite`, `gloria`, `gospel-acclamation`, `offertory`, `sanctus`, `memorial-acclamation`, `great-amen`, `pater-noster`, `doxology`, `agnus-dei`, `communion`, and `recessional`. Ama Namin and Sapagkat retain the labels **9a** and **9b**.

## Keep previous selections

Change the previous selection’s status to `archived`, then copy its object within the JSON array to start a new upcoming selection. Give the new object a unique `id`, update its title/date/celebration, and select its songs. Earlier lists appear at `/songs/selections`; each list has its own `/songs/selections/<id>` page.

Songs are shared between selections. Updating a song’s lyrics or audio updates it wherever that song is used. Keep referenced songs published (`draft: false`); the build rejects missing or draft song references to prevent broken choir links. Draft songs are excluded from both libraries and normal song routes.

## Preview and verify

With the project-local tools available:

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH"
pnpm build
pnpm check
pnpm dev
```

This is a static site: rebuild and redeploy to publish changes. During development, saved Markdown and MDX changes update automatically; the dev server uses polling to detect file changes reliably. Check the terminal for schema errors if an edit does not appear.

`node --test tests/song-filter.test.mjs tests/youtube.test.mjs` checks filtering and supported YouTube URL formats. The production build validates selection references and content fields. Full release checks are documented in the [README](../README.md#validation).
