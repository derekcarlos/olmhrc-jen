# Ongoing choir practice list

## Purpose

Give Coro de Rosarium one place to rehearse selected songs across upcoming
celebrations, without switching Mass lineups. The chapel maintains the shared
list; each member tracks their own practice on their device.

## Agreed scope

- One ongoing page at `/songs/practice`, linked prominently near the top of
  `/songs`.
- Any published song can be added, in the order specified by the editor.
- No required Mass parts or dates. Multiple processional songs, an offertory
  song and a Gloria can coexist in the same list.
- References reuse existing lyrics, MP3 recordings and YouTube samples.
- Optional notes explain what to practise or the intended celebration.
- Each song has a reversible Practised checkbox and the page displays total
  progress. These checks are personal, saved in the current browser, rather
  than a shared choir attendance or readiness report.

## Approaches

1. Extend dated Mass lineups: reuse is easy, but their one-song-per-Mass-part
   structure and date-based rollover do not fit this list.
2. One independent practice list: chosen by the user. Reuse the existing
   song library and listening/progress controls with flexible ordered entries.
3. Multiple named rehearsal lists: not selected; adds navigation the user
   wants to avoid.

## Editing

Use `src/config/choir-practice.json` with a title, introductory note and ordered
items. Each item has a song ID (filename without extension) and an optional
practice note. Reject missing/draft song references and duplicate entries with
clear validation errors. Allow an empty list with a friendly empty state.

## Experience and architecture

Follow the Songs page's gold eyebrow, large heading and light/dark styling.
Present a numbered practice queue alongside the existing recording preview
pattern. Open lyrics within the practice-list context, with previous/next songs
and a return link, rather than dropping members back into a dated Mass lineup.
Keep functional lyric links when JavaScript is unavailable.

Keep progress under a separate stable browser-storage key, using song IDs so
reordering the list does not clear checks. New songs start unchecked; removed
songs do not count toward progress. Keep dated-lineup progress independent.
Explain on the page that checks are saved only on this device. Reuse the
existing storage-failure fallback for temporary progress.

## Verification and boundaries

Verify custom ordering, repeated Mass-part categories, validation, empty list,
MP3/YouTube/lyrics-only songs, check/uncheck and persistence, list edits, and
independence from Mass lineups. Check mobile and desktop in both themes.

No login, cross-device progress synchronization, shared completion dashboard,
automatic song selection, or publication is included. Initial song choices
remain editorial; do not invent a rehearsal programme for the choir.
