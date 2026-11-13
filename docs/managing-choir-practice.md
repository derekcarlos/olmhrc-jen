# Managing the choir practice list

Open `/songs/practice` or choose **Choir Practice** near the top of Songs.
This is one ongoing list, separate from dated Mass lineups. Select a title to
read its lyrics and listen to its existing MP3 or YouTube recording. Previous
and next links stay within the practice list.

## Add and arrange songs

Edit `src/config/choir-practice.json` to choose the songs the choir actually
needs. For example:

```json
{
  "title": "Choir Practice",
  "notes": "Songs to prepare for Advent and our upcoming celebrations.",
  "items": [
    {
      "song": "ang-panginoon-ay-darating",
      "note": "Processional — focus on the refrain."
    },
    {
      "song": "magalak-nang-palagian",
      "note": "For the Third Sunday of Advent."
    },
    {
      "song": "papuri-sa-diyos-missa-magnificat"
    }
  ]
}
```

The `song` value is the filename under `src/content/songs/`, without `.md` or
`.mdx`. Use published songs (`draft` must not be true). Each song appears once.
The order in `items` is the order on the page. `note` is optional and appears
on both the list and that song's practice page. No Mass parts or dates are
required; several processional songs can be listed together.

Move an entry to reorder it, delete one to remove it, or use `"items": []` to
show the empty state. Lyrics, credits and recordings remain in the original
song files; they are not copied into the practice configuration.

## Practice progress

Members can check or uncheck **Practised** on the list or a song's practice
page. The count and progress bar reflect the current list. Marks are stored in
that browser on that device, under `rosarium-choir-practice`; they are not a
shared choir score or synchronized across devices.

Reordering songs preserves checks. Newly added songs start unchecked, removed
songs stop counting, and renaming a song's filename gives it a new identity.
Lineup-specific checks remain separate. If storage is blocked, checking still
works temporarily on the current page.

After editing, use `pnpm check` and `pnpm build` before publishing through the
normal site deployment. Invalid or duplicate song IDs produce a clear error.
