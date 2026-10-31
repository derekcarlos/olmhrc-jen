# Choir Songs Implementation Plan

**Goal:** Build a choir preparation hub with an upcoming Sunday selection, a reusable song library, Marian repertoire, practice audio, and previous selections.

**Spec:** The user approved showing Sunday’s selection first and requested placeholders to edit themselves. Use their 13 slots, including 9a/9b. Preserve the existing readable typography, page layout, and local preview on port 4321.

**Architecture:** Store each song as Markdown in a new songs collection. Keep dated selections and references to song IDs in one JSON configuration file. Reuse ContentPage for all routes. Use lightweight browser scripts for filtering and practice-player controls; no new dependencies.

## Tasks

- [x] Add song schema, Mass-part definitions, selection validation and 15 placeholder entries (13 Mass, 2 Marian).
- [x] Replace the Songs placeholder with the upcoming selection and repertoire/archive navigation; add library, song and selection routes.
- [x] Add search/filter controls and a native audio player with speed/repeat controls; display a clear empty state when no recording is provided.
- [x] Write editing instructions covering lyrics, audio files, tags and Sunday selections.
- [x] Verify references, 13-slot ordering, all placeholder routes, filters, audio markup, empty archives and draft visibility; run build and type checks.
- [x] Restart the preview on port 4321 and verify the finished routes.

## Verification

Production build and Astro type checks passed (0 errors, 0 warnings; one existing unused-import hint in MassSchedule). Filter unit tests and built-route integration checks passed. Temporary fixtures verified audio markup, archived selections and draft visibility, then were removed before the final build. Browser checks confirmed the 13-part Sunday selection, a search narrowing the Mass library to one song, and reset restoring all 13 songs. Preview remains running at http://localhost:4321/songs.
